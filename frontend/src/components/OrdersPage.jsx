import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  Plus,
  Eye,
  Printer,
  Truck,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  AlertTriangle,
  RefreshCw,
  Phone,
  MapPin,
  Tag,
  Package,
  Trash2,
  Copy,
  Check,
  ChevronDown,
  RotateCcw,
  Calendar,
  X,
  CreditCard,
  ShoppingBag,
  Share2,
  FileText,
  ShieldAlert,
  ShieldCheck,
  History,
  Send,
  Sparkles,
  ExternalLink,
  MessageSquare,
  Bookmark
} from 'lucide-react';
import { calculateOrderRisk, isValidBdPhone } from '../services/riskAnalysis';
import CustomerOrderTrackingModal from './CustomerOrderTrackingModal';

const COURIER_LIST = [
  { id: 'Steadfast', name: 'Steadfast Courier', defaultInside: 70, defaultOutside: 130 },
  { id: 'Pathao', name: 'Pathao Courier', defaultInside: 60, defaultOutside: 120 },
  { id: 'RedX', name: 'RedX Delivery', defaultInside: 80, defaultOutside: 140 },
  { id: 'Sundarban', name: 'সুন্দরবন কুরিয়ার', defaultInside: 100, defaultOutside: 150 },
  { id: 'Paperfly', name: 'Paperfly', defaultInside: 70, defaultOutside: 130 },
  { id: 'Self', name: 'নিজস্ব হোম ডেলিভারি', defaultInside: 50, defaultOutside: 100 },
  { id: 'Other', name: 'অন্যান্য কুরিয়ার', defaultInside: 80, defaultOutside: 130 }
];

const ORDER_SOURCES = [
  { id: 'Facebook', label: 'Facebook Page' },
  { id: 'WhatsApp', label: 'WhatsApp' },
  { id: 'Phone', label: 'সরাসরি ফোন কল' },
  { id: 'Website', label: 'অনলাইন ওয়েবসাইট' },
  { id: 'Walk-in', label: 'কাউন্টার / শোরুম' },
  { id: 'Other', label: 'অন্যান্য সোর্স' }
];

const ORDER_STATUSES = [
  { id: 'Pending', label: 'অপেক্ষমান', color: 'bg-amber-100 text-amber-800 border-amber-300' },
  { id: 'Confirmed', label: 'কনফার্মড', color: 'bg-blue-100 text-blue-800 border-blue-300' },
  { id: 'Packaging', label: 'প্যাকিং চলছে', color: 'bg-indigo-100 text-indigo-800 border-indigo-300' },
  { id: 'Shipped', label: 'কুরিয়ারে আছে', color: 'bg-purple-100 text-purple-800 border-purple-300' },
  { id: 'Delivered', label: 'ডেলিভার্ড', color: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
  { id: 'Returned', label: 'রিটার্ন', color: 'bg-rose-100 text-rose-800 border-rose-300' },
  { id: 'Cancelled', label: 'বাতিল', color: 'bg-slate-100 text-slate-700 border-slate-300' }
];

export default function OrdersPage({
  orders = [],
  setOrders,
  products = [],
  settings = {},
  activeUser = null,
  onSaveOrder,
  onUpdateStatus,
  onResolveRma,
  onDeleteOrder,
  showToast,
  currencySymbol = '৳'
}) {
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [courierFilter, setCourierFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');

  // মডাল স্টেট
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedOrderDetails, setSelectedOrderDetails] = useState(null);
  const [labelPrintOrder, setLabelPrintOrder] = useState(null);
  const [challanPrintOrder, setChallanPrintOrder] = useState(null);
  const [customerTrackingOrderId, setCustomerTrackingOrderId] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  // কুইক স্ট্যাটাস ড্রপডাউন
  const [statusDropdownOrderId, setStatusDropdownOrderId] = useState(null);

  // ফিল্টার করা অর্ডার তালিকা
  const filteredOrders = useMemo(() => {
    return (orders || []).filter((order) => {
      // ১. ট্যাব ফিল্টার
      if (activeTab === 'PreOrder') {
        if (!order.IsPreOrder) return false;
      } else if (activeTab === 'RMA') {
        if (!order.RmaRequest || order.RmaRequest.status !== 'Pending') return false;
      } else if (activeTab !== 'all' && order.Status !== activeTab) {
        return false;
      }

      // ২. কুরিয়ার ফিল্টার
      if (courierFilter !== 'all' && order.CourierName !== courierFilter) {
        return false;
      }

      // ৩. সোর্স ফিল্টার
      if (sourceFilter !== 'all' && order.OrderSource !== sourceFilter) {
        return false;
      }

      // ৪. সার্চ কুয়েরি (আইডি, নাম, ফোন, ট্র্যাকিং কোড)
      if (searchQuery.trim()) {
        const query = searchQuery.trim().toLowerCase();
        const idMatch = String(order.OrderID || '').toLowerCase().includes(query);
        const nameMatch = String(order.CustomerName || '').toLowerCase().includes(query);
        const phoneMatch = String(order.CustomerPhone || '').includes(query);
        const altPhoneMatch = String(order.AltPhone || '').includes(query);
        const trackingMatch = String(order.TrackingID || '').toLowerCase().includes(query);
        if (!idMatch && !nameMatch && !phoneMatch && !altPhoneMatch && !trackingMatch) {
          return false;
        }
      }
      return true;
    });
  }, [orders, activeTab, courierFilter, sourceFilter, searchQuery]);

  // সারাংশ পরিসংখ্যান (Metrics)
  const metrics = useMemo(() => {
    const total = orders.length;
    let pending = 0;
    let confirmed = 0;
    let shipped = 0;
    let delivered = 0;
    let returned = 0;
    let preOrders = 0;
    let rmaPending = 0;
    let totalDueCod = 0;

    orders.forEach((o) => {
      if (o.Status === 'Pending') pending++;
      else if (o.Status === 'Confirmed' || o.Status === 'Packaging') confirmed++;
      else if (o.Status === 'Shipped') shipped++;
      else if (o.Status === 'Delivered') delivered++;
      else if (o.Status === 'Returned' || o.Status === 'Cancelled') returned++;

      if (o.IsPreOrder) preOrders++;
      if (o.RmaRequest && o.RmaRequest.status === 'Pending') rmaPending++;

      if (o.Status !== 'Delivered' && o.Status !== 'Cancelled' && o.Status !== 'Returned') {
        totalDueCod += Number(o.DueAmount || 0);
      }
    });

    return { total, pending, confirmed, shipped, delivered, returned, preOrders, rmaPending, totalDueCod };
  }, [orders]);

  const handleCopyId = (id) => {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCopyTrackingLink = (orderId) => {
    const url = `${window.location.origin}${window.location.pathname}?track=${orderId}`;
    navigator.clipboard.writeText(url);
    if (showToast) {
      showToast(`অর্ডার ${orderId}-এর কাস্টমার ট্র্যাকিং লিংক কপি হয়েছে!`, 'success');
    }
  };

  const handleQuickStatusChange = (order, newStatus) => {
    setStatusDropdownOrderId(null);
    if (onUpdateStatus) {
      onUpdateStatus(order.OrderID, newStatus, null, null, activeUser?.FullName || 'Admin');
    }
  };

  return (
    <div className="space-y-5 pb-16">
      {/* ১. শীর্ষ হেডার ও প্রধান অ্যাকশন বার */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-sm border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white flex items-center justify-center shadow-lg shadow-indigo-600/30">
              <Truck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-xl sm:text-2xl font-black text-slate-800">
                  অর্ডার ও ডেলিভারি ম্যানেজমেন্ট
                </h1>
                <span className="px-2 py-0.5 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-full text-[10px] font-black uppercase tracking-wider shadow-xs flex items-center space-x-1">
                  <Sparkles className="w-2.5 h-2.5" />
                  <span>AI Powered</span>
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                স্মার্ট ফ্রড ডিটেকশন, কুরিয়ার ট্র্যাকিং, প্রি-অর্ডার ও আরএমএ পোর্টাল
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3 shrink-0">
          <button
            onClick={() => setCustomerTrackingOrderId('ANY')}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs sm:text-sm font-bold rounded-2xl transition-all flex items-center space-x-2 cursor-pointer"
          >
            <ExternalLink className="w-4 h-4 text-slate-500" />
            <span>গ্রাহক ট্র্যাকিং পোর্টাল</span>
          </button>

          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white text-xs sm:text-sm font-black rounded-2xl shadow-lg shadow-indigo-600/30 active:scale-95 transition-all flex items-center space-x-2 cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>নতুন অর্ডার তৈরি করুন</span>
          </button>
        </div>
      </div>

      {/* ২. সারাংশ ম্যাট্রিক্স কার্ডসমূহ (Summary Metric Cards) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">মোট অর্ডার</span>
          <span className="text-2xl font-black text-slate-800 mt-1 block">{metrics.total}</span>
        </div>

        <div className="bg-amber-50/70 p-4 rounded-2xl border border-amber-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider">অপেক্ষমান</span>
            <Clock className="w-3.5 h-3.5 text-amber-600" />
          </div>
          <span className="text-2xl font-black text-amber-900 mt-1 block">{metrics.pending}</span>
        </div>

        <div className="bg-purple-50/70 p-4 rounded-2xl border border-purple-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-purple-700 uppercase tracking-wider">কুরিয়ারে আছে</span>
            <Truck className="w-3.5 h-3.5 text-purple-600" />
          </div>
          <span className="text-2xl font-black text-purple-900 mt-1 block">{metrics.shipped}</span>
        </div>

        <div className="bg-violet-50/70 p-4 rounded-2xl border border-violet-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-violet-700 uppercase tracking-wider">প্রি-অর্ডার</span>
            <Bookmark className="w-3.5 h-3.5 text-violet-600" />
          </div>
          <span className="text-2xl font-black text-violet-900 mt-1 block">{metrics.preOrders}</span>
        </div>

        <div className="bg-emerald-50/70 p-4 rounded-2xl border border-emerald-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">ডেলিভার্ড</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <span className="text-2xl font-black text-emerald-900 mt-1 block">{metrics.delivered}</span>
        </div>

        <div className="bg-rose-50/70 p-4 rounded-2xl border border-rose-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-rose-700 uppercase tracking-wider">সংগ্রহযোগ্য COD</span>
            <span className="text-[10px] font-black text-rose-600">বাকি</span>
          </div>
          <span className="text-lg sm:text-xl font-black text-rose-900 mt-1.5 block truncate">
            {currencySymbol}{metrics.totalDueCod.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </span>
        </div>
      </div>

      {/* ৩. ট্যাব বার ও ফিল্টার কন্ট্রোল (Tabs & Filter Controls) */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 shadow-sm border border-slate-200 space-y-4">
        {/* ৩.১ স্ট্যাটাস ট্যাবসমূহ */}
        <div className="flex items-center space-x-1 sm:space-x-2 overflow-x-auto pb-1 scrollbar-none border-b border-slate-100">
          {[
            { id: 'all', label: 'সব অর্ডার', count: metrics.total },
            { id: 'Pending', label: 'অপেক্ষমান', count: metrics.pending },
            { id: 'Confirmed', label: 'কনফার্মড', count: orders.filter(o => o.Status === 'Confirmed').length },
            { id: 'Packaging', label: 'প্যাকিং', count: orders.filter(o => o.Status === 'Packaging').length },
            { id: 'Shipped', label: 'কুরিয়ারে আছে', count: metrics.shipped },
            { id: 'Delivered', label: 'ডেলিভার্ড', count: metrics.delivered },
            { id: 'PreOrder', label: 'প্রি-অর্ডার', count: metrics.preOrders, badgeColor: 'bg-violet-600 text-white' },
            { id: 'RMA', label: 'রিটার্ন আবেদন', count: metrics.rmaPending, badgeColor: 'bg-orange-600 text-white animate-pulse' },
            { id: 'Returned', label: 'রিটার্ন', count: orders.filter(o => o.Status === 'Returned').length },
            { id: 'Cancelled', label: 'বাতিল', count: orders.filter(o => o.Status === 'Cancelled').length },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center space-x-1.5 cursor-pointer shrink-0 ${
                activeTab === tab.id
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                  tab.badgeColor
                    ? tab.badgeColor
                    : activeTab === tab.id
                    ? 'bg-white/25 text-white'
                    : 'bg-slate-200/80 text-slate-700'
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* ৩.২ সার্চ বার ও ড্রপডাউন ফিল্টারসমূহ */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          <div className="sm:col-span-6 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="অর্ডার আইডি, গ্রাহকের নাম, মোবাইল বা ট্র্যাকিং কোড দিয়ে খুঁজুন..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all font-medium"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="sm:col-span-3">
            <select
              value={courierFilter}
              onChange={(e) => setCourierFilter(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-700 font-bold focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 cursor-pointer"
            >
              <option value="all">সকল কুরিয়ার</option>
              {COURIER_LIST.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-3">
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-700 font-bold focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 cursor-pointer"
            >
              <option value="all">সকল অর্ডার সোর্স</option>
              {ORDER_SOURCES.map((s) => (
                <option key={s.id} value={s.id}>{s.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ৪. অর্ডার ডাটা টেবিল (Orders Data Table) */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
        {filteredOrders.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
              <ShoppingBag className="w-7 h-7 stroke-[1.5]" />
            </div>
            <h3 className="text-base font-bold text-slate-700">কোনো অর্ডার পাওয়া যায়নি</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              {searchQuery || activeTab !== 'all' || courierFilter !== 'all'
                ? 'আপনার দেওয়া ফিল্টার বা সার্চের সাথে মিল রয়েছে এমন কোনো অর্ডার পাওয়া যায়নি।'
                : 'এখনো কোনো অর্ডার তৈরি করা হয়নি। নতুন কুরিয়ার বা হোম ডেলিভারি অর্ডার নিতে উপরের বাটনে ক্লিক করুন।'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                  <th className="p-4 pl-6">অর্ডার আইডি ও তারিখ</th>
                  <th className="p-4">গ্রাহক ও রিস্ক অ্যানালাইসিস</th>
                  <th className="p-4">পণ্যসমূহ</th>
                  <th className="p-4">কুরিয়ার ও ট্র্যাকিং</th>
                  <th className="p-4 text-right">টাকার হিসাব (COD)</th>
                  <th className="p-4 text-center">স্ট্যাটাস</th>
                  <th className="p-4 pr-6 text-center">অ্যাকশন</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {filteredOrders.map((order) => {
                  const statusObj = ORDER_STATUSES.find(s => s.id === order.Status) || ORDER_STATUSES[0];
                  const formattedDate = new Date(order.CreatedAt || order.OrderDate).toLocaleDateString('bn-BD', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric'
                  });

                  // এআই ফ্রড ও রিটার্ন রিস্ক বিশ্লেষণ
                  const risk = calculateOrderRisk(order, orders);

                  return (
                    <tr key={order.OrderID} className="hover:bg-slate-50/80 transition-colors">
                      {/* অর্ডার আইডি ও সোর্স */}
                      <td className="p-4 pl-6 align-top">
                        <div className="flex items-center space-x-1.5">
                          <span className="font-mono font-bold text-indigo-700 text-xs">
                            {order.OrderID}
                          </span>
                          <button
                            onClick={() => handleCopyId(order.OrderID)}
                            title="কপি করুন"
                            className="text-slate-400 hover:text-slate-600 cursor-pointer"
                          >
                            {copiedId === order.OrderID ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>

                        <div className="flex items-center space-x-1.5 mt-1">
                          <span className="text-[10px] text-slate-400">{formattedDate}</span>
                          <span className="px-1.5 py-0.2 bg-slate-100 text-slate-600 rounded-md text-[9px] font-bold">
                            {order.OrderSource || 'Direct'}
                          </span>
                        </div>

                        {order.IsPreOrder && (
                          <span className="inline-block mt-1 px-1.5 py-0.2 rounded-md text-[9px] font-black bg-violet-100 text-violet-700 border border-violet-200">
                            ★ প্রি-অর্ডার
                          </span>
                        )}
                      </td>

                      {/* কাস্টমার তথ্য ও এআই রিস্ক স্কোর */}
                      <td className="p-4 align-top">
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-slate-800 text-xs block">
                            {order.CustomerName}
                          </span>

                          {/* রিস্ক ব্যাজ */}
                          <span
                            className={`px-1.5 py-0.2 rounded-md text-[9px] font-black border flex items-center space-x-0.5 cursor-help ${
                              risk.level === 'High'
                                ? 'bg-rose-50 text-rose-700 border-rose-200'
                                : risk.level === 'Medium'
                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            }`}
                            title={risk.flags.length > 0 ? risk.flags.join(' • ') : risk.recommendation}
                          >
                            {risk.level === 'High' ? (
                              <>
                                <AlertTriangle className="w-2.5 h-2.5" />
                                <span>উচ্চ ঝুঁকি</span>
                              </>
                            ) : risk.level === 'Medium' ? (
                              <>
                                <Clock className="w-2.5 h-2.5" />
                                <span>সতর্কতা</span>
                              </>
                            ) : (
                              <>
                                <ShieldCheck className="w-2.5 h-2.5" />
                                <span>নিরাপদ</span>
                              </>
                            )}
                          </span>
                        </div>

                        <div className="flex items-center space-x-1 text-slate-500 text-[11px] mt-0.5 font-mono">
                          <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                          <span>{order.CustomerPhone}</span>
                        </div>

                        {order.CustomerAddress && (
                          <div className="flex items-start space-x-1 text-slate-400 text-[10px] mt-0.5 max-w-[200px] truncate" title={order.CustomerAddress}>
                            <MapPin className="w-3 h-3 text-slate-400 shrink-0 mt-0.5" />
                            <span className="truncate">{order.CustomerAddress}</span>
                          </div>
                        )}

                        {order.RmaRequest && (
                          <div className="mt-1">
                            <span className={`px-1.5 py-0.2 rounded-md text-[9px] font-black border ${
                              order.RmaRequest.status === 'Approved'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : order.RmaRequest.status === 'Rejected'
                                ? 'bg-slate-100 text-slate-600 border-slate-200'
                                : 'bg-orange-50 text-orange-700 border-orange-200 animate-pulse'
                            }`}>
                              {order.RmaRequest.status === 'Approved' ? 'রিটার্ন সম্পন্ন' : order.RmaRequest.status === 'Rejected' ? 'রিটার্ন বাতিল' : 'রিটার্ন আবেদন এসেছে'}
                            </span>
                          </div>
                        )}
                      </td>

                      {/* পণ্যসমূহ */}
                      <td className="p-4 align-top">
                        <div className="space-y-1 max-w-[200px]">
                          {(order.Items || []).slice(0, 2).map((item, idx) => (
                            <div key={idx} className="text-[11px] text-slate-700 truncate">
                              • <span className="font-bold">{item.productName || item.ProductName}</span>
                              <span className="text-slate-400 font-mono ml-1">×{item.quantity || item.Quantity}</span>
                            </div>
                          ))}
                          {(order.Items || []).length > 2 && (
                            <span className="text-[10px] font-bold text-indigo-600 block">
                              + আরো {(order.Items || []).length - 2}টি পণ্য
                            </span>
                          )}
                        </div>
                      </td>

                      {/* কুরিয়ার ও ট্র্যাকিং */}
                      <td className="p-4 align-top">
                        <span className="font-bold text-slate-800 text-[11px] block">
                          {order.CourierName}
                        </span>
                        {order.TrackingID ? (
                          <span className="font-mono text-[10px] text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded-md mt-1 inline-block border border-indigo-100 font-bold">
                            {order.TrackingID}
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400 italic block mt-0.5">
                            ট্র্যাকিং যুক্ত হয়নি
                          </span>
                        )}
                      </td>

                      {/* টাকার হিসাব (COD / Due) */}
                      <td className="p-4 align-top text-right">
                        <div className="font-bold text-slate-800 text-xs">
                          মোট: {currencySymbol}{order.TotalAmount}
                        </div>
                        {order.AdvancePaid > 0 && (
                          <div className="text-[10px] text-emerald-600 font-medium">
                            অগ্রিম: {currencySymbol}{order.AdvancePaid}
                          </div>
                        )}
                        <div className="text-[11px] font-black text-rose-600 mt-0.5">
                          COD: {currencySymbol}{order.DueAmount}
                        </div>
                      </td>

                      {/* স্ট্যাটাস ব্যাজ ও কুইক চেঞ্জার */}
                      <td className="p-4 align-top text-center">
                        <div className="relative inline-block text-left">
                          <button
                            onClick={() => setStatusDropdownOrderId(statusDropdownOrderId === order.OrderID ? null : order.OrderID)}
                            className={`px-2.5 py-1 rounded-full text-[10px] font-black border transition-all flex items-center space-x-1 cursor-pointer ${statusObj.color}`}
                          >
                            <span>{statusObj.label}</span>
                            <ChevronDown className="w-3 h-3 ml-0.5" />
                          </button>

                          {statusDropdownOrderId === order.OrderID && (
                            <div className="absolute left-1/2 -translate-x-1/2 mt-1 w-36 bg-white rounded-2xl shadow-xl border border-slate-200 py-1.5 z-30 animate-in fade-in zoom-in-95">
                              {ORDER_STATUSES.map((st) => (
                                <button
                                  key={st.id}
                                  onClick={() => handleQuickStatusChange(order, st.id)}
                                  className={`w-full text-left px-3 py-1.5 text-xs font-bold hover:bg-slate-50 flex items-center justify-between cursor-pointer ${
                                    order.Status === st.id ? 'text-indigo-600' : 'text-slate-700'
                                  }`}
                                >
                                  <span>{st.label}</span>
                                  {order.Status === st.id && <Check className="w-3.5 h-3.5" />}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* অ্যাকশন বাটনসমূহ */}
                      <td className="p-4 pr-6 align-top text-center">
                        <div className="flex items-center justify-center space-x-1">
                          {/* বিস্তারিত ও অডিট লগ */}
                          <button
                            onClick={() => setSelectedOrderDetails(order)}
                            title="অর্ডারের বিবরণ ও টাইমলাইন অডিট লগ"
                            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {/* গ্রাহক ট্র্যাকিং পেজ দেখুন */}
                          <button
                            onClick={() => setCustomerTrackingOrderId(order.OrderID)}
                            title="গ্রাহকের লাইভ ট্র্যাকিং পেজ দেখুন"
                            className="p-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg transition-colors cursor-pointer"
                          >
                            <Truck className="w-3.5 h-3.5" />
                          </button>

                          {/* ট্র্যাকিং লিংক কপি */}
                          <button
                            onClick={() => handleCopyTrackingLink(order.OrderID)}
                            title="গ্রাহককে পাঠানোর জন্য ট্র্যাকিং লিংক কপি করুন"
                            className="p-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg transition-colors cursor-pointer"
                          >
                            <Share2 className="w-3.5 h-3.5" />
                          </button>

                          {/* শিপিং স্টিকার লেবেল প্রিন্ট */}
                          <button
                            onClick={() => setLabelPrintOrder(order)}
                            title="কুরিয়ার পার্সেল স্টিকার প্রিন্ট করুন"
                            className="p-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg transition-colors cursor-pointer"
                          >
                            <Tag className="w-3.5 h-3.5" />
                          </button>

                          {/* ডেলিভারি চালান প্রিন্ট */}
                          <button
                            onClick={() => setChallanPrintOrder(order)}
                            title="ডেলিভারি চালান / মেমো প্রিন্ট করুন"
                            className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg transition-colors cursor-pointer"
                          >
                            <FileText className="w-3.5 h-3.5" />
                          </button>

                          {/* ডিলিট */}
                          {onDeleteOrder && (
                            <button
                              onClick={() => {
                                if (window.confirm(`আপনি কি নিশ্চিতভাবে ${order.OrderID} অর্ডারটি মুছে ফেলতে চান?`)) {
                                  onDeleteOrder(order.OrderID);
                                }
                              }}
                              title="মুছে ফেলুন"
                              className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ৫. নতুন অর্ডার তৈরি করার মডাল (Create Order Modal) */}
      {isCreateModalOpen && (
        <CreateOrderModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          products={products}
          settings={settings}
          allOrders={orders}
          onSaveOrder={onSaveOrder}
          showToast={showToast}
          currencySymbol={currencySymbol}
        />
      )}

      {/* ৬. অর্ডারের বিস্তারিত বিবরণ ও টাইমলাইন অডিট লগ মডাল (Order Details Modal) */}
      {selectedOrderDetails && (
        <OrderDetailsModal
          order={selectedOrderDetails}
          allOrders={orders}
          onClose={() => setSelectedOrderDetails(null)}
          onUpdateStatus={onUpdateStatus}
          onResolveRma={onResolveRma}
          onOpenCustomerTracking={() => {
            setCustomerTrackingOrderId(selectedOrderDetails.OrderID);
            setSelectedOrderDetails(null);
          }}
          onPrintLabel={() => {
            setLabelPrintOrder(selectedOrderDetails);
            setSelectedOrderDetails(null);
          }}
          onPrintChallan={() => {
            setChallanPrintOrder(selectedOrderDetails);
            setSelectedOrderDetails(null);
          }}
          currencySymbol={currencySymbol}
        />
      )}

      {/* ৭. কুরিয়ার পার্সেল শিপিং স্টিকার লেবেল প্রিন্ট মডাল */}
      {labelPrintOrder && (
        <ShippingLabelModal
          order={labelPrintOrder}
          settings={settings}
          onClose={() => setLabelPrintOrder(null)}
          currencySymbol={currencySymbol}
        />
      )}

      {/* ৮. ডেলিভারি চালান / ইনভয়েস প্রিন্ট মডাল */}
      {challanPrintOrder && (
        <DeliveryChallanModal
          order={challanPrintOrder}
          settings={settings}
          onClose={() => setChallanPrintOrder(null)}
          currencySymbol={currencySymbol}
        />
      )}

      {/* ৯. গ্রাহক লাইভ ট্র্যাকিং ও আরএমএ পোর্টাল মডাল */}
      {customerTrackingOrderId && (
        <CustomerOrderTrackingModal
          isOpen={Boolean(customerTrackingOrderId)}
          onClose={() => setCustomerTrackingOrderId(null)}
          orders={orders}
          initialOrderId={customerTrackingOrderId === 'ANY' ? '' : customerTrackingOrderId}
          settings={settings}
          onSubmitRma={(orderId, rmaData) => {
            if (onResolveRma) {
              onResolveRma(orderId, 'Submitted', rmaData);
            }
          }}
          currencySymbol={currencySymbol}
        />
      )}
    </div>
  );
}

/**
 * ============================================================================
 * সাব-কম্পোনেন্ট ১: নতুন অর্ডার তৈরি মডাল (CreateOrderModal)
 * ============================================================================
 */
function CreateOrderModal({
  isOpen,
  onClose,
  products = [],
  settings = {},
  allOrders = [],
  onSaveOrder,
  showToast,
  currencySymbol = '৳'
}) {
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [altPhone, setAltPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [district, setDistrict] = useState('ঢাকা');
  const [orderSource, setOrderSource] = useState('Facebook');
  const [courierName, setCourierName] = useState('Steadfast');
  const [trackingId, setTrackingId] = useState('');
  const [deliveryCharge, setDeliveryCharge] = useState(70);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [advancePaid, setAdvancePaid] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('COD');
  const [notes, setNotes] = useState('');
  const [reserveStock, setReserveStock] = useState(true);
  const [isPreOrder, setIsPreOrder] = useState(false);

  // পণ্য কার্ট স্টেট
  const [selectedItems, setSelectedItems] = useState([]);
  const [productSearch, setProductSearch] = useState('');

  // কুরিয়ার পরিবর্তনের সাথে সাথে ডেলিভারি ফি আপডেট
  const handleCourierChange = (e) => {
    const cId = e.target.value;
    setCourierName(cId);
    const found = COURIER_LIST.find((c) => c.id === cId);
    if (found) {
      setDeliveryCharge(district.includes('ঢাকা') ? found.defaultInside : found.defaultOutside);
    }
  };

  const handleDistrictChange = (e) => {
    const dist = e.target.value;
    setDistrict(dist);
    const found = COURIER_LIST.find((c) => c.id === courierName);
    if (found) {
      setDeliveryCharge(dist.includes('ঢাকা') ? found.defaultInside : found.defaultOutside);
    }
  };

  // কার্টে পণ্য যোগ করা
  const handleAddItem = (product) => {
    const existingIndex = selectedItems.findIndex((i) => i.productId === product.ProductID);
    if (existingIndex !== -1) {
      const updated = [...selectedItems];
      updated[existingIndex].quantity += 1;
      setSelectedItems(updated);
    } else {
      setSelectedItems([
        ...selectedItems,
        {
          productId: product.ProductID,
          productName: product.ProductName,
          sellingPrice: Number(product.SellingPrice) || 0,
          costPrice: Number(product.CostPrice) || 0,
          quantity: 1,
          unit: product.Unit || 'Pcs'
        }
      ]);
    }
    setProductSearch('');
  };

  const handleUpdateItemQuantity = (index, delta) => {
    const updated = [...selectedItems];
    const newQty = updated[index].quantity + delta;
    if (newQty <= 0) {
      updated.splice(index, 1);
    } else {
      updated[index].quantity = newQty;
    }
    setSelectedItems(updated);
  };

  const handleRemoveItem = (index) => {
    const updated = [...selectedItems];
    updated.splice(index, 1);
    setSelectedItems(updated);
  };

  // আর্থিক হিসাব
  const subTotal = selectedItems.reduce(
    (sum, item) => sum + item.sellingPrice * item.quantity,
    0
  );
  const totalAmount = Math.max(0, subTotal - Number(discountAmount || 0) + Number(deliveryCharge || 0));
  const dueAmount = Math.max(0, totalAmount - Number(advancePaid || 0));

  // লাইভ এআই রিস্ক টেস্ট (গ্রাহকের নম্বর টাইপ করার সময়)
  const simulatedOrder = {
    CustomerPhone: customerPhone,
    CustomerAddress: customerAddress,
    TotalAmount: totalAmount,
    AdvancePaid: advancePaid,
    DueAmount: dueAmount
  };
  const liveRisk = useMemo(() => {
    return calculateOrderRisk(simulatedOrder, allOrders);
  }, [customerPhone, customerAddress, totalAmount, advancePaid, dueAmount, allOrders]);

  // ফর্ম সাবমিশন
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!customerName.trim()) {
      alert('অনুগ্রহ করে গ্রাহকের নাম প্রদান করুন।');
      return;
    }
    if (!customerPhone.trim()) {
      alert('অনুগ্রহ করে গ্রাহকের মোবাইল নম্বর দিন।');
      return;
    }
    if (selectedItems.length === 0) {
      alert('অনুগ্রহ করে কমপক্ষে একটি পণ্য নির্বাচন করুন।');
      return;
    }

    const newOrder = {
      OrderID: `ORD-${Date.now().toString().slice(-6)}`,
      CustomerName: customerName.trim(),
      CustomerPhone: customerPhone.trim(),
      AltPhone: altPhone.trim(),
      CustomerAddress: customerAddress.trim(),
      District: district.trim(),
      OrderSource: orderSource,
      CourierName: courierName,
      TrackingID: trackingId.trim(),
      Items: selectedItems,
      SubTotal: subTotal,
      DiscountAmount: Number(discountAmount) || 0,
      DeliveryCharge: Number(deliveryCharge) || 0,
      TotalAmount: totalAmount,
      AdvancePaid: Number(advancePaid) || 0,
      DueAmount: dueAmount,
      Status: 'Pending',
      PaymentStatus: Number(advancePaid) >= totalAmount ? 'Paid' : Number(advancePaid) > 0 ? 'Partial' : 'Unpaid',
      PaymentMethod: paymentMethod,
      RiskLevel: liveRisk.level,
      Notes: notes.trim(),
      StockReserved: isPreOrder ? false : reserveStock,
      IsPreOrder: isPreOrder,
      CreatedAt: new Date().toISOString()
    };

    onSaveOrder(newOrder);
    onClose();
  };

  // ফিল্টার করা পণ্য তালিকা
  const searchedProducts = useMemo(() => {
    if (!productSearch.trim()) return [];
    const q = productSearch.toLowerCase();
    return products
      .filter((p) =>
        (p.ProductName && p.ProductName.toLowerCase().includes(q)) ||
        (p.Barcode && p.Barcode.includes(q))
      )
      .slice(0, 6);
  }, [products, productSearch]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
        {/* মডাল হেডার */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur-md z-10">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Plus className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-800">নতুন ডেলিভারি অর্ডার এন্ট্রি</h2>
              <p className="text-xs text-slate-500">অনলাইন বা ফোন কল অর্ডারের বিস্তারিত তথ্য দিন</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 flex items-center justify-center cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ফর্ম কন্টেন্ট */}
        <form onSubmit={handleSubmit} className="p-5 space-y-6">
          {/* লাইভ এআই রিস্ক সতর্কতা ব্যানার (যদি নম্বর বা অর্ডারে সমস্যা থাকে) */}
          {customerPhone.length >= 5 && liveRisk.level !== 'Low' && (
            <div className={`p-4 rounded-2xl border text-xs space-y-1.5 animate-in fade-in ${
              liveRisk.level === 'High'
                ? 'bg-rose-50 border-rose-200 text-rose-900'
                : 'bg-amber-50 border-amber-200 text-amber-900'
            }`}>
              <div className="flex items-center space-x-2 font-black">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span>AI Risk Alert: {liveRisk.level === 'High' ? 'উচ্চ ঝুঁকি চিহ্নিত হয়েছে!' : 'সতর্কতা'}</span>
              </div>
              <ul className="list-disc list-inside space-y-0.5 text-[11px] font-medium opacity-90">
                {liveRisk.flags.map((flag, idx) => (
                  <li key={idx}>{flag}</li>
                ))}
              </ul>
              <p className="text-[11px] font-bold mt-1 text-slate-700">
                পরামর্শ: {liveRisk.recommendation}
              </p>
            </div>
          )}

          {/* ১. কাস্টমার তথ্য */}
          <div className="space-y-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">১. গ্রাহকের তথ্য</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">গ্রাহকের পুরো নাম *</label>
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="যেমন: মো. কামরুল হাসান"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">মোবাইল নম্বর *</label>
                <input
                  type="tel"
                  required
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="01XXXXXXXXX"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">বিকল্প মোবাইল নম্বর (ঐচ্ছিক)</label>
                <input
                  type="tel"
                  value={altPhone}
                  onChange={(e) => setAltPhone(e.target.value)}
                  placeholder="জরুরি যোগাযোগের নম্বর"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">অর্ডার সোর্স</label>
                <select
                  value={orderSource}
                  onChange={(e) => setOrderSource(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 font-medium cursor-pointer"
                >
                  {ORDER_SOURCES.map((s) => (
                    <option key={s.id} value={s.id}>{s.label}</option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">বিস্তারিত ডেলিভারি ঠিকানা *</label>
                <textarea
                  required
                  rows={2}
                  value={customerAddress}
                  onChange={(e) => setCustomerAddress(e.target.value)}
                  placeholder="বাসা নং, রোড নং, এলাকা, থানা ও ল্যান্ডমার্ক..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 font-medium"
                />
              </div>
            </div>
          </div>

          {/* ২. পণ্য নির্বাচন ও কার্ট */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">২. অর্ডারকৃত পণ্যসমূহ</h3>
              <label className="flex items-center space-x-2 cursor-pointer bg-violet-50 px-2.5 py-1 rounded-lg border border-violet-200">
                <input
                  type="checkbox"
                  checked={isPreOrder}
                  onChange={(e) => setIsPreOrder(e.target.checked)}
                  className="w-3.5 h-3.5 rounded text-violet-600 focus:ring-violet-500"
                />
                <span className="text-[11px] font-black text-violet-900">
                  ★ প্রি-অর্ডার (Pre-Order) হিসেবে বুকিং করুন
                </span>
              </label>
            </div>
            
            {/* পণ্য অনুসন্ধান ও নির্বাচন */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                placeholder="পণ্যের নাম বা বারকোড লিখে অনুসন্ধান করুন..."
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 font-medium"
              />

              {searchedProducts.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-white rounded-2xl shadow-xl border border-slate-200 py-1.5 z-20 max-h-48 overflow-y-auto">
                  {searchedProducts.map((p) => (
                    <button
                      type="button"
                      key={p.ProductID}
                      onClick={() => handleAddItem(p)}
                      className="w-full px-3 py-2 text-left hover:bg-slate-50 flex items-center justify-between text-xs cursor-pointer"
                    >
                      <div>
                        <span className="font-bold text-slate-800 block">{p.ProductName}</span>
                        <span className={`text-[10px] ${Number(p.StockQuantity) <= 0 ? 'text-rose-600 font-bold' : 'text-slate-400'}`}>
                          {Number(p.StockQuantity) <= 0 ? 'স্টক শেষ (প্রি-অর্ডার সম্ভব)' : `স্টক: ${p.StockQuantity || 0} ${p.Unit || 'Pcs'}`}
                        </span>
                      </div>
                      <span className="font-bold text-indigo-600 font-mono">
                        {currencySymbol}{p.SellingPrice}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* নির্বাচিত পণ্যের তালিকা */}
            {selectedItems.length === 0 ? (
              <p className="text-xs text-slate-400 italic text-center py-2">
                এখনো কোনো পণ্য যোগ করা হয়নি। উপরের সার্চ বার থেকে পণ্য যোগ করুন।
              </p>
            ) : (
              <div className="bg-slate-50 rounded-2xl p-3 border border-slate-200 space-y-2">
                {selectedItems.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between bg-white p-2.5 rounded-xl border border-slate-200/80 text-xs">
                    <div className="flex-1 pr-2">
                      <span className="font-bold text-slate-800 block truncate">{item.productName}</span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {currencySymbol}{item.sellingPrice} / {item.unit}
                      </span>
                    </div>

                    <div className="flex items-center space-x-2">
                      <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden bg-slate-50">
                        <button
                          type="button"
                          onClick={() => handleUpdateItemQuantity(idx, -1)}
                          className="px-2 py-0.5 text-slate-600 hover:bg-slate-200 font-bold"
                        >
                          -
                        </button>
                        <span className="px-2 font-mono font-bold text-slate-800 text-xs">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleUpdateItemQuantity(idx, 1)}
                          className="px-2 py-0.5 text-slate-600 hover:bg-slate-200 font-bold"
                        >
                          +
                        </button>
                      </div>

                      <span className="font-bold text-slate-800 font-mono w-16 text-right">
                        {currencySymbol}{item.sellingPrice * item.quantity}
                      </span>

                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        className="text-rose-500 hover:text-rose-700 p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ৩. কুরিয়ার ও পেমেন্ট হিসাব */}
          <div className="space-y-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">৩. কুরিয়ার ও বিলিং হিসাব</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">কুরিয়ার নির্বাচন</label>
                <select
                  value={courierName}
                  onChange={handleCourierChange}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 font-medium cursor-pointer"
                >
                  {COURIER_LIST.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">জেলা / শহর</label>
                <select
                  value={district}
                  onChange={handleDistrictChange}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 font-medium cursor-pointer"
                >
                  <option value="ঢাকা">ঢাকা সিটি (ইনসাইড)</option>
                  <option value="চট্টগ্রাম">চট্টগ্রাম</option>
                  <option value="রাজশাহী">রাজশাহী</option>
                  <option value="সিলেট">সিলেট</option>
                  <option value="খুলনা">খুলনা</option>
                  <option value="বরিশাল">বরিশাল</option>
                  <option value="রংপুর">রংপুর</option>
                  <option value="ময়মনসিংহ">ময়মনসিংহ</option>
                  <option value="ঢাকার বাইরে">ঢাকার বাইরে (অন্যান্য জেলা)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">কুরিয়ার ট্র্যাকিং কোড (ঐচ্ছিক)</label>
                <input
                  type="text"
                  value={trackingId}
                  onChange={(e) => setTrackingId(e.target.value)}
                  placeholder="যেমন: STEAD-8921"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">ডেলিভারি চার্জ (৳)</label>
                <input
                  type="number"
                  min="0"
                  value={deliveryCharge}
                  onChange={(e) => setDeliveryCharge(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">ছাড় / ডিসকাউন্ট (৳)</label>
                <input
                  type="number"
                  min="0"
                  value={discountAmount}
                  onChange={(e) => setDiscountAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">অগ্রিম পরিশোধ (৳)</label>
                <input
                  type="number"
                  min="0"
                  value={advancePaid}
                  onChange={(e) => setAdvancePaid(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-emerald-700 font-mono font-bold"
                />
              </div>
            </div>

            {/* সংক্ষিপ্ত রসিদ কার্ড */}
            <div className="bg-slate-900 text-white rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-xs space-y-1">
                <span className="text-slate-400 block">সাবটোটাল: {currencySymbol}{subTotal} | ডেলিভারি: +{currencySymbol}{deliveryCharge}</span>
                <span className="text-slate-400 block">অগ্রিম পরিশোধ: -{currencySymbol}{advancePaid}</span>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 block">ক্যাশ অন ডেলিভারি (সংগ্রহযোগ্য)</span>
                <span className="text-xl sm:text-2xl font-black text-white">
                  {currencySymbol}{dueAmount}
                </span>
              </div>
            </div>
          </div>

          {/* ডেলিভারি নির্দেশিকা ও স্টক রিজার্ভ */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">ডেলিভারি নোট / বিশেষ নির্দেশনা</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="যেমন: দুপুরের পর ডেলিভারি দিতে হবে"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800"
              />
            </div>

            {!isPreOrder && (
              <label className="flex items-center space-x-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={reserveStock}
                  onChange={(e) => setReserveStock(e.target.checked)}
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
                <span className="text-xs font-bold text-slate-700">
                  অর্ডার সেভ করার সাথে সাথে মূল ইনভেন্টরি থেকে স্টক স্বয়ংক্রিয়ভাবে মাইনাস (রিজার্ভ) করুন
                </span>
              </label>
            )}
          </div>

          {/* ফুটার অ্যাকশন বাটন */}
          <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
            >
              বাতিল
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-black rounded-xl shadow-md shadow-indigo-600/30 active:scale-95 transition-all cursor-pointer"
            >
              অর্ডার নিশ্চিত করুন
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/**
 * ============================================================================
 * সাব-কম্পোনেন্ট ২: অর্ডারের পূর্ণ বিবরণ, এআই রিস্ক ও টাইমলাইন অডিট লগ মডাল
 * ============================================================================
 */
function OrderDetailsModal({
  order,
  allOrders = [],
  onClose,
  onUpdateStatus,
  onResolveRma,
  onOpenCustomerTracking,
  onPrintLabel,
  onPrintChallan,
  currencySymbol = '৳'
}) {
  const [currentStatus, setCurrentStatus] = useState(order.Status || 'Pending');
  const [trackingId, setTrackingId] = useState(order.TrackingID || '');
  const [courierName, setCourierName] = useState(order.CourierName || 'Steadfast');

  // এআই রিস্ক অ্যানালাইসিস
  const risk = useMemo(() => {
    return calculateOrderRisk(order, allOrders);
  }, [order, allOrders]);

  const handleSaveStatus = () => {
    if (onUpdateStatus) {
      onUpdateStatus(order.OrderID, currentStatus, trackingId, courierName, 'Admin');
    }
    onClose();
  };

  const handleApproveRma = () => {
    if (onResolveRma) {
      onResolveRma(order.OrderID, 'Approved', 'রিটার্ন আবেদন এডমিন কর্তৃক অনুমোদিত হয়েছে।');
    }
    onClose();
  };

  const handleRejectRma = () => {
    const reason = prompt('প্রত্যাখ্যান করার কারণ লিখুন:', 'যথাযথ প্রমাণ বা কারণ পাওয়া যায়নি');
    if (reason && onResolveRma) {
      onResolveRma(order.OrderID, 'Rejected', reason);
    }
    onClose();
  };

  const statusObj = ORDER_STATUSES.find(s => s.id === currentStatus) || ORDER_STATUSES[0];

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
        {/* হেডার */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur-md z-10">
          <div className="flex items-center space-x-2.5">
            <span className="font-mono font-black text-indigo-700 text-base">
              {order.OrderID}
            </span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black border ${statusObj.color}`}>
              {statusObj.label}
            </span>
            {order.IsPreOrder && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-violet-100 text-violet-800 border border-violet-200">
                ★ প্রি-অর্ডার
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 flex items-center justify-center cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-6">
          {/* এআই ফ্রড ও রিস্ক কার্ড (AI Risk Card) */}
          <div className={`p-4 rounded-2xl border text-xs space-y-2 ${
            risk.level === 'High'
              ? 'bg-rose-50 border-rose-200 text-rose-900'
              : risk.level === 'Medium'
              ? 'bg-amber-50 border-amber-200 text-amber-900'
              : 'bg-emerald-50 border-emerald-200 text-emerald-900'
          }`}>
            <div className="flex items-center justify-between font-black">
              <div className="flex items-center space-x-2">
                {risk.level === 'High' ? (
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                ) : risk.level === 'Medium' ? (
                  <Clock className="w-4 h-4 text-amber-600" />
                ) : (
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                )}
                <span>AI Risk Assessment: {risk.level === 'High' ? 'উচ্চ ঝুঁকি (High Risk)' : risk.level === 'Medium' ? 'মাঝারি সতর্কতা (Medium Risk)' : 'নিরাপদ অর্ডার (Low Risk)'}</span>
              </div>
              <span className="font-mono text-xs">স্কোর: {risk.score}/100</span>
            </div>

            {risk.flags.length > 0 && (
              <ul className="list-disc list-inside space-y-0.5 text-[11px] font-medium opacity-90">
                {risk.flags.map((flag, idx) => (
                  <li key={idx}>{flag}</li>
                ))}
              </ul>
            )}

            <p className="text-[11px] font-bold text-slate-700 pt-1 border-t border-slate-200/60">
              💡 সুপারিশ: {risk.recommendation}
            </p>
          </div>

          {/* আরএমএ রিটার্ন আবেদন ব্যানার (যদি গ্রাহক আবেদন করে থাকে) */}
          {order.RmaRequest && (
            <div className="bg-orange-50 p-4 rounded-2xl border border-orange-200 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-black text-orange-900 flex items-center space-x-1.5">
                  <RotateCcw className="w-4 h-4" />
                  <span>গ্রাহক কর্তৃক {order.RmaRequest.type === 'Exchange' ? 'এক্সচেঞ্জ' : 'রিটার্ন'} আবেদন</span>
                </span>
                <span className="font-bold px-2 py-0.5 bg-orange-200 text-orange-900 rounded-md text-[10px]">
                  স্ট্যাটাস: {order.RmaRequest.status}
                </span>
              </div>
              <p className="text-slate-700">কারণ: <strong>{order.RmaRequest.reason}</strong></p>
              {order.RmaRequest.details && (
                <p className="text-slate-600 italic">"{order.RmaRequest.details}"</p>
              )}

              {order.RmaRequest.status === 'Pending' && (
                <div className="flex items-center space-x-2 pt-2 border-t border-orange-200">
                  <button
                    onClick={handleApproveRma}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold cursor-pointer"
                  >
                    রিটার্ন অনুমোদন ও রিস্টক করুন
                  </button>
                  <button
                    onClick={handleRejectRma}
                    className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold cursor-pointer"
                  >
                    আবেদন প্রত্যাখ্যান করুন
                  </button>
                </div>
              )}
            </div>
          )}

          {/* গ্রাহক ও শিপিং তথ্য */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200/80 text-xs">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">গ্রাহকের বিবরণ</span>
              <span className="text-sm font-bold text-slate-800 mt-1 block">{order.CustomerName}</span>
              <span className="text-slate-600 font-mono mt-0.5 block">{order.CustomerPhone}</span>
              {order.AltPhone && (
                <span className="text-slate-500 font-mono text-[11px] block">বিকল্প: {order.AltPhone}</span>
              )}
            </div>

            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">ডেলিভারি ঠিকানা</span>
              <span className="text-slate-700 mt-1 block font-medium leading-relaxed">
                {order.CustomerAddress || 'ঠিকানা দেওয়া হয়নি'}
              </span>
              <span className="text-indigo-600 text-[11px] font-bold mt-1 block">
                জেলা: {order.District || 'ঢাকা'} | সোর্স: {order.OrderSource}
              </span>
            </div>
          </div>

          {/* স্ট্যাটাস ও ট্র্যাকিং আপডেট সেকশন */}
          <div className="bg-indigo-50/60 p-4 rounded-2xl border border-indigo-100 space-y-3">
            <span className="text-xs font-bold text-indigo-900 block">স্ট্যাটাস ও কুরিয়ার আপডেট করুন</span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">অর্ডার স্ট্যাটাস</label>
                <select
                  value={currentStatus}
                  onChange={(e) => setCurrentStatus(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-indigo-200 rounded-xl text-xs font-bold text-slate-800"
                >
                  {ORDER_STATUSES.map((s) => (
                    <option key={s.id} value={s.id}>{s.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">কুরিয়ার</label>
                <select
                  value={courierName}
                  onChange={(e) => setCourierName(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-indigo-200 rounded-xl text-xs font-bold text-slate-800"
                >
                  {COURIER_LIST.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">ট্র্যাকিং কোড</label>
                <input
                  type="text"
                  value={trackingId}
                  onChange={(e) => setTrackingId(e.target.value)}
                  placeholder="Tracking ID"
                  className="w-full px-3 py-2 bg-white border border-indigo-200 rounded-xl text-xs font-mono"
                />
              </div>
            </div>

            {currentStatus === 'Returned' && (
              <p className="text-[11px] text-rose-700 bg-rose-50 p-2 rounded-xl border border-rose-200 font-medium">
                ⚠️ সতর্কতা: স্ট্যাটাস "রিটার্ন" করলে অর্ডারকৃত পণ্যগুলো স্বয়ংক্রিয়ভাবে মূল ইনভেন্টরি স্টকে ফেরত আনা হবে।
              </p>
            )}

            <button
              onClick={handleSaveStatus}
              className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold cursor-pointer"
            >
              পরিবর্তন সংরক্ষণ করুন
            </button>
          </div>

          {/* পণ্যের তালিকা */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-slate-800 block">অর্ডারকৃত পণ্যসমূহ</span>
            <div className="border border-slate-200 rounded-2xl overflow-hidden divide-y divide-slate-100 text-xs">
              {(order.Items || []).map((item, idx) => (
                <div key={idx} className="p-3 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-slate-800 block">{item.productName || item.ProductName}</span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {currencySymbol}{item.sellingPrice} × {item.quantity} {item.unit || 'Pcs'}
                    </span>
                  </div>
                  <span className="font-bold text-slate-800 font-mono">
                    {currencySymbol}{Number(item.sellingPrice) * Number(item.quantity)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* আর্থিক হিসাব */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-1.5 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>সাবটোটাল:</span>
              <span className="font-mono">{currencySymbol}{order.SubTotal}</span>
            </div>
            {order.DeliveryCharge > 0 && (
              <div className="flex justify-between text-slate-600">
                <span>ডেলিভারি চার্জ:</span>
                <span className="font-mono">+{currencySymbol}{order.DeliveryCharge}</span>
              </div>
            )}
            {order.DiscountAmount > 0 && (
              <div className="flex justify-between text-emerald-600 font-medium">
                <span>ছাড় / ডিসকাউন্ট:</span>
                <span className="font-mono">-{currencySymbol}{order.DiscountAmount}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-slate-800 pt-1 border-t border-slate-200">
              <span>সর্বমোট মূল্য:</span>
              <span className="font-mono text-sm">{currencySymbol}{order.TotalAmount}</span>
            </div>
            {order.AdvancePaid > 0 && (
              <div className="flex justify-between text-emerald-700 font-medium">
                <span>অগ্রিম পরিশোধিত:</span>
                <span className="font-mono">-{currencySymbol}{order.AdvancePaid}</span>
              </div>
            )}
            <div className="flex justify-between font-black text-rose-600 text-sm pt-1 border-t border-slate-200">
              <span>ক্যাশ অন ডেলিভারি (বাকি):</span>
              <span className="font-mono">{currencySymbol}{order.DueAmount}</span>
            </div>
          </div>

          {/* টাইমলাইন অডিট লগ (Audit Activity History) */}
          <div className="space-y-3">
            <span className="text-xs font-bold text-slate-800 flex items-center space-x-1.5">
              <History className="w-4 h-4 text-slate-500" />
              <span>অর্ডার অ্যাক্টিভিটি টাইমলাইন (Audit Trail)</span>
            </span>
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
              {(order.ActivityLog || [
                { timestamp: order.CreatedAt, action: 'অর্ডার তৈরি হয়েছে', actor: order.CreatedBy || 'Admin' }
              ]).map((log, idx) => (
                <div key={idx} className="flex items-start space-x-2.5 text-xs">
                  <div className="w-2 h-2 rounded-full bg-indigo-600 mt-1.5 shrink-0" />
                  <div className="flex-1">
                    <span className="font-medium text-slate-800 block">{log.action}</span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {new Date(log.timestamp).toLocaleString('bn-BD')} • ইউজার: {log.actor || 'Admin'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* প্রিন্ট ও ট্র্যাকিং প্রিভিউ অপশনসমূহ */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2">
            <button
              onClick={onOpenCustomerTracking}
              className="py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold rounded-xl text-xs flex items-center justify-center space-x-1.5 transition-colors cursor-pointer"
            >
              <Truck className="w-4 h-4" />
              <span>লাইভ ট্র্যাকিং পেজ</span>
            </button>

            <button
              onClick={onPrintLabel}
              className="py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-xl text-xs flex items-center justify-center space-x-1.5 transition-colors cursor-pointer"
            >
              <Tag className="w-4 h-4" />
              <span>কুরিয়ার স্টিকার</span>
            </button>

            <button
              onClick={onPrintChallan}
              className="py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold rounded-xl text-xs flex items-center justify-center space-x-1.5 transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>ডেলিভারি চালান</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * ============================================================================
 * সাব-কম্পোনেন্ট ৩: কুরিয়ার পার্সেল স্টিকার লেবেল (ShippingLabelModal)
 * ============================================================================
 */
function ShippingLabelModal({ order, settings = {}, onClose, currencySymbol = '৳' }) {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between no-print">
          <span className="text-xs font-bold text-slate-700">কুরিয়ার শিপিং লেবেল প্রিভিউ</span>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-full cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* প্রিন্টেবল লেবেল এলাকা */}
        <div className="p-6 bg-white font-sans text-slate-900" id="shipping-label-printable">
          <div className="border-2 border-slate-900 rounded-2xl p-4 space-y-3">
            {/* প্রেরক ও কুরিয়ার হেডার */}
            <div className="flex items-center justify-between border-b-2 border-slate-900 pb-2.5">
              <div>
                <span className="text-sm font-black text-slate-900 block uppercase tracking-tight">
                  {settings.StoreName || 'Pabna Bostraloy'}
                </span>
                <span className="text-[10px] text-slate-600 block mt-0.5">
                  মোবাইল: {settings.Phone || '01675934919'}
                </span>
              </div>
              <div className="text-right">
                <span className="text-xs font-black text-white bg-slate-900 px-2 py-0.5 rounded-md inline-block">
                  {order.CourierName}
                </span>
                <span className="text-[9px] text-slate-500 block font-mono mt-0.5">
                  {order.OrderID}
                </span>
              </div>
            </div>

            {/* প্রাপক / গ্রাহক বক্স */}
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-300">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">প্রাপক / To:</span>
              <span className="text-base font-black text-slate-900 mt-0.5 block">{order.CustomerName}</span>
              <span className="text-xs font-black text-slate-900 font-mono block mt-0.5">
                মোবাইল: {order.CustomerPhone} {order.AltPhone ? `| ${order.AltPhone}` : ''}
              </span>
              <span className="text-xs text-slate-800 font-medium block mt-1 leading-snug">
                {order.CustomerAddress}
              </span>
              <span className="text-[11px] font-black text-indigo-700 block mt-1">
                জেলা: {order.District || 'ঢাকা'}
              </span>
            </div>

            {/* বিশাল COD এমাউন্ট ব্যানার */}
            <div className="bg-slate-900 text-white p-3 rounded-xl text-center">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 block">
                ক্যাশ অন ডেলিভারি (সংগ্রহযোগ্য টাকা)
              </span>
              <span className="text-2xl font-black block mt-0.5 font-mono">
                {currencySymbol} {order.DueAmount}
              </span>
            </div>

            {/* প্যাকেজ আইটেম সারসংক্ষেপ ও বারকোড সিমুলেশন */}
            <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-[10px]">
              <div>
                <span className="text-slate-500 font-bold block">পণ্য সংখ্যা:</span>
                <span className="font-bold text-slate-800">{(order.Items || []).length}টি আইটেম</span>
              </div>
              <div className="text-right">
                <span className="text-slate-400 font-mono text-[9px] block">
                  {new Date(order.CreatedAt).toLocaleDateString('bn-BD')}
                </span>
                <span className="text-[10px] font-bold text-slate-600 block">
                  {order.TrackingID || order.OrderID}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* প্রিন্ট অ্যাকশন বাটন */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end space-x-3 no-print">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-xl cursor-pointer"
          >
            বন্ধ করুন
          </button>
          <button
            onClick={handlePrint}
            className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-black rounded-xl shadow-md flex items-center space-x-2 cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>প্রিন্ট করুন</span>
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * ============================================================================
 * সাব-কম্পোনেন্ট ৪: ডেলিভারি চালান / ইনভয়েস প্রিভিউ (DeliveryChallanModal)
 * ============================================================================
 */
function DeliveryChallanModal({ order, settings = {}, onClose, currencySymbol = '৳' }) {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between no-print">
          <span className="text-xs font-bold text-slate-700">ডেলিভারি চালান প্রিভিউ</span>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-full cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* চালান কন্টেন্ট */}
        <div className="p-6 bg-white font-sans text-slate-800 space-y-4" id="delivery-challan-printable">
          {/* হেডার */}
          <div className="text-center border-b-2 border-slate-800 pb-3">
            <h2 className="text-xl font-black text-slate-900 uppercase">
              {settings.StoreName || 'Pabna Bostraloy'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">{settings.Address}</p>
            <p className="text-xs text-slate-500 font-mono">মোবাইল: {settings.Phone} | ইমেইল: {settings.Email}</p>
            <span className="inline-block mt-2 px-3 py-0.5 bg-slate-900 text-white rounded-full text-xs font-bold uppercase tracking-wider">
              ডেলিভারি চালান / Delivery Challan
            </span>
          </div>

          {/* মেমো ইনফো ও কাস্টমার */}
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <span className="font-bold text-slate-400 block text-[10px] uppercase">গ্রাহকের নাম ও ঠিকানা:</span>
              <span className="font-bold text-slate-900 block mt-0.5">{order.CustomerName}</span>
              <span className="text-slate-600 font-mono block">{order.CustomerPhone}</span>
              <span className="text-slate-600 block mt-0.5 leading-snug">{order.CustomerAddress}</span>
            </div>

            <div className="text-right">
              <span className="font-bold text-slate-400 block text-[10px] uppercase">চালান বিবরণ:</span>
              <span className="font-mono font-bold text-slate-900 block mt-0.5">অর্ডার: {order.OrderID}</span>
              <span className="text-slate-600 block text-[11px]">
                তারিখ: {new Date(order.CreatedAt).toLocaleDateString('bn-BD')}
              </span>
              <span className="text-slate-600 block text-[11px]">
                কুরিয়ার: <strong className="text-slate-800">{order.CourierName}</strong>
              </span>
            </div>
          </div>

          {/* পণ্যের টেবিল */}
          <table className="w-full text-xs border border-slate-300">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-300 text-slate-700 font-bold">
                <th className="p-2 text-center w-10">নং</th>
                <th className="p-2 text-left">পণ্যের বিবরণ</th>
                <th className="p-2 text-center w-16">পরিমাণ</th>
                <th className="p-2 text-right w-20">দর</th>
                <th className="p-2 text-right w-24">মোট</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 font-medium">
              {(order.Items || []).map((item, idx) => (
                <tr key={idx}>
                  <td className="p-2 text-center font-mono text-slate-500">{idx + 1}</td>
                  <td className="p-2 font-bold text-slate-800">{item.productName || item.ProductName}</td>
                  <td className="p-2 text-center font-mono">{item.quantity} {item.unit || 'Pcs'}</td>
                  <td className="p-2 text-right font-mono">{currencySymbol}{item.sellingPrice}</td>
                  <td className="p-2 text-right font-mono font-bold">{currencySymbol}{item.sellingPrice * item.quantity}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-slate-300">
                <td colSpan={4} className="p-2 text-right font-bold text-slate-600">সাবটোটাল:</td>
                <td className="p-2 text-right font-mono font-bold">{currencySymbol}{order.SubTotal}</td>
              </tr>
              {order.DeliveryCharge > 0 && (
                <tr>
                  <td colSpan={4} className="p-2 text-right font-bold text-slate-600">ডেলিভারি চার্জ:</td>
                  <td className="p-2 text-right font-mono font-bold">+{currencySymbol}{order.DeliveryCharge}</td>
                </tr>
              )}
              {order.AdvancePaid > 0 && (
                <tr>
                  <td colSpan={4} className="p-2 text-right font-bold text-emerald-700">অগ্রিম পরিশোধ:</td>
                  <td className="p-2 text-right font-mono font-bold text-emerald-700">-{currencySymbol}{order.AdvancePaid}</td>
                </tr>
              )}
              <tr className="bg-slate-100 font-black">
                <td colSpan={4} className="p-2 text-right text-rose-700">ক্যাশ অন ডেলিভারি (বাকি):</td>
                <td className="p-2 text-right font-mono text-rose-700 text-sm">{currencySymbol}{order.DueAmount}</td>
              </tr>
            </tfoot>
          </table>

          {/* স্বাক্ষর ও নোট */}
          <div className="pt-8 flex items-center justify-between text-xs text-slate-500">
            <div className="text-center">
              <div className="w-28 border-t border-slate-400 mb-1" />
              <span>ক্রেতার স্বাক্ষর</span>
            </div>
            <div className="text-center">
              <div className="w-28 border-t border-slate-400 mb-1" />
              <span>কর্তৃপক্ষের স্বাক্ষর</span>
            </div>
          </div>
        </div>

        {/* প্রিন্ট অ্যাকশন বাটন */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end space-x-3 no-print">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-xl cursor-pointer"
          >
            বন্ধ করুন
          </button>
          <button
            onClick={handlePrint}
            className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-black rounded-xl shadow-md flex items-center space-x-2 cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>প্রিন্ট করুন</span>
          </button>
        </div>
      </div>
    </div>
  );
}
