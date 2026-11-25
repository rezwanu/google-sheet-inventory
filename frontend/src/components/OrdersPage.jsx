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
  AlertTriangle,
  Phone,
  MapPin,
  Tag,
  Package,
  Trash2,
  Copy,
  Check,
  ChevronDown,
  RotateCcw,
  X,
  ShoppingBag,
  Share2,
  FileText,
  ShieldAlert,
  ShieldCheck,
  History,
  Sparkles,
  ExternalLink,
  MessageSquare,
  Bookmark,
  LayoutGrid,
  ListFilter,
  SlidersHorizontal,
  User,
  DollarSign,
  Edit3,
  MessageCircle,
  Download,
  MoreVertical
} from 'lucide-react';
import { calculateOrderRisk } from '../services/riskAnalysis';
import CustomerOrderTrackingModal from './CustomerOrderTrackingModal';
import BulkCourierDispatchModal from './BulkCourierDispatchModal';
import BulkSmsDispatchModal from './BulkSmsDispatchModal';
import SteadfastLiveTrackingModal from './SteadfastLiveTrackingModal';

/**
 * তারিখ অনুযায়ী ফিল্টার যাচাইকারী হেল্পার
 */
function isDateInFilter(dateStr, filter) {
  if (!filter || filter === 'all') return true;
  if (!dateStr) return false;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return false;

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const orderDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());

  if (filter === 'today') {
    return orderDate.getTime() === today.getTime();
  }
  if (filter === 'yesterday') {
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    return orderDate.getTime() === yesterday.getTime();
  }
  if (filter === 'last7') {
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    return orderDate >= sevenDaysAgo;
  }
  if (filter === 'thisMonth') {
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  }
  return true;
}

/**
 * কুরিয়ার বাল্ক বুকিং এক্সপোর্ট (Steadfast / Pathao সামঞ্জস্যপূর্ণ UTF-8 CSV)
 */
function exportCourierBulkCsv(orders, courierName = 'All') {
  if (!orders || orders.length === 0) return;
  const headers = [
    'Invoice ID',
    'Customer Name',
    'Customer Phone',
    'Customer Address',
    'District',
    'COD Amount',
    'Courier',
    'Order Date',
    'Special Note'
  ];

  const rows = orders.map((o) => {
    const cleanAddress = (o.CustomerAddress || '').replace(/"/g, '""').replace(/\r?\n/g, ' ');
    const cleanNote = (o.Notes || '').replace(/"/g, '""').replace(/\r?\n/g, ' ');
    const cleanName = (o.CustomerName || '').replace(/"/g, '""');
    return [
      `"${o.OrderID}"`,
      `"${cleanName}"`,
      `"${o.CustomerPhone}"`,
      `"${cleanAddress}"`,
      `"${o.District || 'ঢাকা'}"`,
      `"${Number(o.DueAmount || 0)}"`,
      `"${o.CourierName || courierName}"`,
      `"${new Date(o.CreatedAt || o.OrderDate || Date.now()).toLocaleDateString('en-GB')}"`,
      `"${cleanNote}"`
    ].join(',');
  });

  const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  const nowStr = new Date().toISOString().slice(0, 10);
  link.setAttribute('download', `Courier_Bulk_Orders_${courierName}_${nowStr}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * সরাসরি ১-ক্লিক হোয়াটসঅ্যাপ মেসেজ হেল্পার
 */
function openOrderWhatsApp(order, storeName = 'Pabna Bostraloy', currencySymbol = '৳') {
  if (!order || !order.CustomerPhone) return;
  let phone = String(order.CustomerPhone).replace(/\D/g, '');
  if (phone.startsWith('01')) {
    phone = '88' + phone;
  } else if (!phone.startsWith('8801') && phone.length === 11) {
    phone = '88' + phone;
  }

  const trackUrl = `${window.location.origin}${window.location.pathname}?track=${order.OrderID}`;
  const itemsText = (order.Items || [])
    .map((item) => `• ${item.productName || item.ProductName} x${item.quantity || item.Quantity}`)
    .join('\n');

  const message = `আসসালামু আলাইকুম ${order.CustomerName || 'সম্মানিত গ্রাহক'},
${storeName || 'Pabna Bostraloy'}-এ আপনার অর্ডারটি (${order.OrderID}) গ্রহণ করা হয়েছে। 

📦 পণ্যের বিবরণ:
${itemsText}

💰 মোট বিল: ${currencySymbol}${order.TotalAmount || 0}
${order.AdvancePaid > 0 ? `💳 অগ্রিম পরিশোধ: ${currencySymbol}${order.AdvancePaid}\n` : ''}💵 ক্যাশ অন ডেলিভারি (বাকি): ${currencySymbol}${order.DueAmount || 0}
🚚 কুরিয়ার: ${order.CourierName || 'Steadfast'}

🌐 আপনার পার্সেল লাইভ ট্র্যাক করুন:
${trackUrl}

যেকোনো প্রয়োজনে আমাদের কল করতে পারেন। ধন্যবাদ!`;

  const waUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
  window.open(waUrl, '_blank');
}

const AVATAR_STYLES = [
  'bg-[#0F172A] text-white',
  'bg-slate-700 text-white',
  'bg-emerald-50 text-[#15803D] border border-emerald-200/80',
  'bg-amber-50 text-[#B45309] border border-amber-200/80',
  'bg-[#F5F5F5] text-[#111111] border border-neutral-200/80',
  'bg-slate-100 text-[#0F172A] border border-slate-200/80'
];

function getCustomerInitials(name) {
  if (!name) return 'অ';
  const clean = name.trim();
  const parts = clean.split(' ').filter(Boolean);
  if (parts.length > 1) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return clean.slice(0, 2).toUpperCase();
}

function getCustomerAvatarGradient(name) {
  if (!name) return AVATAR_STYLES[0];
  let sum = 0;
  for (let i = 0; i < name.length; i++) {
    sum += name.charCodeAt(i);
  }
  return AVATAR_STYLES[sum % AVATAR_STYLES.length];
}

function getCourierBadge(courierName) {
  switch (courierName) {
    case 'Steadfast':
      return {
        bg: 'bg-emerald-50 text-[#15803D] border-emerald-200/80',
        dot: 'bg-[#15803D]',
        name: 'Steadfast'
      };
    case 'Pathao':
      return {
        bg: 'bg-red-50 text-[#B91C1C] border-red-200/80',
        dot: 'bg-[#B91C1C]',
        name: 'Pathao'
      };
    case 'RedX':
      return {
        bg: 'bg-red-50 text-[#B91C1C] border-red-200/80',
        dot: 'bg-[#B91C1C]',
        name: 'RedX'
      };
    case 'Paperfly':
      return {
        bg: 'bg-[#F5F5F5] text-[#0F172A] border-neutral-200/80',
        dot: 'bg-[#0F172A]',
        name: 'Paperfly'
      };
    case 'Sundarban':
      return {
        bg: 'bg-amber-50 text-[#B45309] border-amber-200/80',
        dot: 'bg-[#B45309]',
        name: 'সুন্দরবন'
      };
    case 'Self':
      return {
        bg: 'bg-emerald-50 text-[#15803D] border-emerald-200/80',
        dot: 'bg-[#15803D]',
        name: 'নিজস্ব'
      };
    case 'Counter Pickup':
      return {
        bg: 'bg-[#F5F5F5] text-[#111111] border-neutral-200/80',
        dot: 'bg-[#0F172A]',
        name: 'কাউন্টার পিকআপ'
      };
    default:
      return {
        bg: 'bg-[#F5F5F5] text-[#525252] border-neutral-200/80',
        dot: 'bg-neutral-500',
        name: courierName || 'কুরিয়ার'
      };
  }
}

const COURIER_LIST = [
  { id: 'Counter Pickup', name: 'কাউন্টার পিকআপ (ইন-স্টোর)', defaultInside: 0, defaultOutside: 0 },
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
  { id: 'In-Store / POS', label: 'কাউন্টার পিওএস (POS সেল)' },
  { id: 'Walk-in', label: 'কাউন্টার / শোরুম' },
  { id: 'Other', label: 'অন্যান্য সোর্স' }
];

const ORDER_STATUSES = [
  { id: 'Pending', label: 'অপেক্ষমান', color: 'bg-amber-50 text-[#B45309] border-amber-200/80' },
  { id: 'Confirmed', label: 'কনফার্মড', color: 'bg-[#F5F5F5] text-[#0F172A] border-neutral-200/80' },
  { id: 'Packaging', label: 'প্যাকিং চলছে', color: 'bg-slate-100 text-[#0F172A] border-slate-200/80' },
  { id: 'Shipped', label: 'কুরিয়ারে আছে', color: 'bg-slate-100 text-[#0F172A] border-slate-300' },
  { id: 'Delivered', label: 'ডেলিভার্ড', color: 'bg-emerald-50 text-[#15803D] border-emerald-200/80' },
  { id: 'Returned', label: 'রিটার্ন', color: 'bg-red-50 text-[#B91C1C] border-red-200/80' },
  { id: 'Cancelled', label: 'বাতিল', color: 'bg-[#F5F5F5] text-[#737373] border-neutral-200/80' }
];

export default function OrdersPage({
  orders = [],
  setOrders,
  products = [],
  settings = {},
  activeUser = null,
  onSaveOrder,
  onUpdateStatus,
  onBulkUpdateStatus,
  onSteadfastBulkDispatch,
  onSteadfastCheckStatus,
  onSendSmsNotification,
  onResolveRma,
  onDeleteOrder,
  showToast,
  currencySymbol = '৳'
}) {
  const [activeTab, setActiveTab] = useState('all');
  const [channelFilter, setChannelFilter] = useState('all'); // 'all' | 'online' | 'offline'
  const [searchQuery, setSearchQuery] = useState('');
  const [courierFilter, setCourierFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all'); // 'all' | 'today' | 'yesterday' | 'last7' | 'thisMonth'
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'cards'

  // বাল্ক অপারেশন ও সিলেকশন স্টেট
  const [selectedOrderIds, setSelectedOrderIds] = useState([]);
  const [isBulkLabelModalOpen, setIsBulkLabelModalOpen] = useState(false);
  const [isBulkCourierModalOpen, setIsBulkCourierModalOpen] = useState(false);
  const [isBulkSmsModalOpen, setIsBulkSmsModalOpen] = useState(false);
  const [bulkStatusDropdownOpen, setBulkStatusDropdownOpen] = useState(false);

  // মডাল ও এডিটিং স্টেট
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState(null);
  const [selectedOrderDetails, setSelectedOrderDetails] = useState(null);
  const [labelPrintOrder, setLabelPrintOrder] = useState(null);
  const [challanPrintOrder, setChallanPrintOrder] = useState(null);
  const [customerTrackingOrderId, setCustomerTrackingOrderId] = useState(null);
  const [trackingModalOrder, setTrackingModalOrder] = useState(null);
  const [singleSmsModalOrder, setSingleSmsModalOrder] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  // কুইক স্ট্যাটাস ড্রপডাউন
  const [statusDropdownOrderId, setStatusDropdownOrderId] = useState(null);

  // কুইক অ্যাকশন মেনু ড্রপডাউন
  const [actionMenuOrderId, setActionMenuOrderId] = useState(null);

  // ফিল্টার করা অর্ডার তালিকা
  const filteredOrders = useMemo(() => {
    return (orders || []).filter((order) => {
      // ০. ওমনিচ্যানেল ফিল্টার (Online Delivery vs In-Store POS)
      const isOfflineOrder = order.OrderSource === 'In-Store / POS' || order.OrderSource === 'Walk-in' || order.CourierName === 'Counter Pickup';
      if (channelFilter === 'online' && isOfflineOrder) return false;
      if (channelFilter === 'offline' && !isOfflineOrder) return false;

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

      // ৪. তারিখ ফিল্টার
      if (!isDateInFilter(order.CreatedAt || order.OrderDate, dateFilter)) {
        return false;
      }

      // ৫. সার্চ কুয়েরি (আইডি, নাম, ফোন, ট্র্যাকিং কোড)
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
  }, [orders, activeTab, channelFilter, courierFilter, sourceFilter, dateFilter, searchQuery]);

  // বাল্ক সিলেকশন হেল্পার
  const isAllSelected = useMemo(() => {
    if (filteredOrders.length === 0) return false;
    return filteredOrders.every((o) => selectedOrderIds.includes(o.OrderID));
  }, [filteredOrders, selectedOrderIds]);

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedOrderIds([]);
    } else {
      setSelectedOrderIds(filteredOrders.map((o) => o.OrderID));
    }
  };

  const toggleSelectOrder = (orderId, e) => {
    if (e && e.stopPropagation) e.stopPropagation();
    setSelectedOrderIds((prev) =>
      prev.includes(orderId) ? prev.filter((id) => id !== orderId) : [...prev, orderId]
    );
  };

  const selectedOrdersList = useMemo(() => {
    return orders.filter((o) => selectedOrderIds.includes(o.OrderID));
  }, [orders, selectedOrderIds]);

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
    let offlineCount = 0;
    let onlineCount = 0;

    orders.forEach((o) => {
      const isOff = o.OrderSource === 'In-Store / POS' || o.OrderSource === 'Walk-in' || o.CourierName === 'Counter Pickup';
      if (isOff) offlineCount++;
      else onlineCount++;

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

    const successRate = total > 0 ? Math.round((delivered / total) * 100) : 100;

    return { total, pending, confirmed, shipped, delivered, returned, preOrders, rmaPending, totalDueCod, successRate, offlineCount, onlineCount };
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
    setActionMenuOrderId(null);
    if (onUpdateStatus) {
      onUpdateStatus(order.OrderID, newStatus, null, null, activeUser?.FullName || 'Admin');
    }
  };

  return (
    <div className="space-y-5 pb-16 bg-[#FAFAFA]">
      {/* ১. শীর্ষ হেডার ও প্রধান অ্যাকশন বার */}
      <div className="bg-white rounded-lg p-5 sm:p-6 text-[#111111] border border-neutral-200/80">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center space-x-3.5">
            <div className="relative shrink-0">
              <div className="w-12 h-12 rounded-md bg-[#0F172A] text-white flex items-center justify-center">
                <Truck className="w-6 h-6" />
              </div>
              <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-[#15803D] border-2 border-white" />
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-[#111111]">
                  অর্ডার ও ডেলিভারি ম্যানেজমেন্ট
                </h1>
                <span className="px-2 py-0.5 rounded-md bg-[#F5F5F5] text-[#111111] text-[10px] font-medium uppercase tracking-wider border border-neutral-200/80 flex items-center space-x-1">
                  <Sparkles className="w-3 h-3 text-[#0F172A]" />
                  <span>AI Engine 2.0</span>
                </span>
                <span className="hidden sm:inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-50 text-[#15803D] text-[10px] font-medium border border-emerald-200/80">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#15803D]" />
                  <span>লাইভ সিঙ্ক অ্যাক্টিভ</span>
                </span>
              </div>
              <p className="text-xs sm:text-sm text-[#525252] mt-1">
                স্মার্ট ফ্রড রিক্স স্কোরিং • মাল্টি-কুরিয়ার অটো ট্র্যাকিং • প্রি-অর্ডার ও সেলফ-সার্ভিস রিটার্ন (RMA) পোর্টাল
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0 pt-2 lg:pt-0">
            {/* গ্রাহক ট্র্যাকিং পোর্টাল বাটন */}
            <button
              onClick={() => setCustomerTrackingOrderId('ANY')}
              className="min-h-[44px] sm:min-h-[36px] px-4 py-2 bg-white hover:bg-[#F5F5F5] text-[#111111] text-xs sm:text-sm font-medium rounded-md transition-colors border border-neutral-200/80 flex items-center space-x-2 cursor-pointer"
            >
              <ExternalLink className="w-4 h-4 text-[#525252]" />
              <span>গ্রাহক ট্র্যাকিং পোর্টাল</span>
            </button>

            {/* নতুন অর্ডার তৈরি বাটন */}
            <button
              onClick={() => {
                setEditingOrder(null);
                setIsCreateModalOpen(true);
              }}
              className="min-h-[44px] sm:min-h-[36px] px-4 py-2 bg-[#0F172A] hover:bg-slate-800 text-white text-xs sm:text-sm font-medium rounded-md transition-colors flex items-center space-x-2 cursor-pointer border border-[#0F172A]"
            >
              <Plus className="w-4 h-4" />
              <span>নতুন অর্ডার তৈরি করুন</span>
            </button>
          </div>
        </div>
      </div>

      {/* ২. সারাংশ মেট্রিক কার্ডসমূহ */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {/* মোট অর্ডার */}
        <div className="bg-white p-4 rounded-lg border border-neutral-200/80">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-[11px] font-medium text-[#525252] uppercase tracking-wider">মোট অর্ডার</span>
            <div className="w-7 h-7 rounded-md bg-[#F5F5F5] border border-neutral-200/80 flex items-center justify-center text-[#0F172A]">
              <ShoppingBag className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline space-x-1.5">
            <span className="text-2xl font-semibold text-[#111111] font-mono tabular-nums tracking-tight">{metrics.total}</span>
            <span className="text-[10px] text-[#737373] font-medium">টি</span>
          </div>
          <div className="mt-1.5 flex items-center text-[10px] text-[#525252] font-medium font-mono tabular-nums">
            <span>সফলতা রেট: {metrics.successRate}%</span>
          </div>
        </div>

        {/* অপেক্ষমান */}
        <div className="bg-white p-4 rounded-lg border border-neutral-200/80">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-[11px] font-medium text-[#525252] uppercase tracking-wider">অপেক্ষমান</span>
            <div className="w-7 h-7 rounded-md bg-amber-50 border border-amber-200/80 flex items-center justify-center text-[#B45309]">
              <Clock className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline space-x-1.5">
            <span className="text-2xl font-semibold text-[#B45309] font-mono tabular-nums tracking-tight">{metrics.pending}</span>
            <span className="text-[10px] text-[#737373] font-medium">টি</span>
          </div>
          <div className="mt-1.5 flex items-center space-x-1.5 text-[10px] text-[#B45309] font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-[#B45309]" />
            <span>যাচাই প্রয়োজন</span>
          </div>
        </div>

        {/* কুরিয়ারে আছে */}
        <div className="bg-white p-4 rounded-lg border border-neutral-200/80">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-[11px] font-medium text-[#525252] uppercase tracking-wider">কুরিয়ারে আছে</span>
            <div className="w-7 h-7 rounded-md bg-[#F5F5F5] border border-neutral-200/80 flex items-center justify-center text-[#0F172A]">
              <Truck className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline space-x-1.5">
            <span className="text-2xl font-semibold text-[#111111] font-mono tabular-nums tracking-tight">{metrics.shipped}</span>
            <span className="text-[10px] text-[#737373] font-medium">টি</span>
          </div>
          <div className="mt-1.5 text-[10px] text-[#525252] font-medium truncate">
            <span>ডেলিভারির পথে চলমান</span>
          </div>
        </div>

        {/* প্রি-অর্ডার */}
        <div className="bg-white p-4 rounded-lg border border-neutral-200/80">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-[11px] font-medium text-[#525252] uppercase tracking-wider">প্রি-অর্ডার</span>
            <div className="w-7 h-7 rounded-md bg-[#F5F5F5] border border-neutral-200/80 flex items-center justify-center text-[#0F172A]">
              <Bookmark className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline space-x-1.5">
            <span className="text-2xl font-semibold text-[#111111] font-mono tabular-nums tracking-tight">{metrics.preOrders}</span>
            <span className="text-[10px] text-[#737373] font-medium">টি</span>
          </div>
          <div className="mt-1.5 text-[10px] text-[#525252] font-medium">
            <span>অগ্রিম বুকিং</span>
          </div>
        </div>

        {/* ডেলিভার্ড */}
        <div className="bg-white p-4 rounded-lg border border-neutral-200/80">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-[11px] font-medium text-[#525252] uppercase tracking-wider">ডেলিভার্ড</span>
            <div className="w-7 h-7 rounded-md bg-emerald-50 border border-emerald-200/80 flex items-center justify-center text-[#15803D]">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline space-x-1.5">
            <span className="text-2xl font-semibold text-[#15803D] font-mono tabular-nums tracking-tight">{metrics.delivered}</span>
            <span className="text-[10px] text-[#737373] font-medium">টি</span>
          </div>
          <div className="mt-1.5 text-[10px] text-[#15803D] font-medium">
            <span>সফল ডেলিভারি</span>
          </div>
        </div>

        {/* সংগ্রহযোগ্য COD */}
        <div className="bg-white p-4 rounded-lg border border-neutral-200/80">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-[11px] font-medium text-[#525252] uppercase tracking-wider">বাকি COD</span>
            <div className="w-7 h-7 rounded-md bg-red-50 border border-red-200/80 flex items-center justify-center text-[#B91C1C]">
              <DollarSign className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-lg sm:text-xl font-semibold text-[#B91C1C] font-mono tabular-nums tracking-tight block truncate">
              {currencySymbol}{metrics.totalDueCod.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </span>
          </div>
          <div className="mt-1.5 text-[10px] text-[#B91C1C] font-medium">
            <span>উত্তোলনীয় ক্যাশ</span>
          </div>
        </div>
      </div>

      {/* ৩. ট্যাব বার ও ফিল্টার কন্ট্রোল (Tabs & Filter Controls) */}
      <div className="bg-white rounded-lg p-4 sm:p-5 border border-neutral-200/80 space-y-4">
        {/* ওমনিচ্যানেল চ্যানেল ফিল্টার কন্ট্রোল (All vs Online vs In-Store POS) */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-neutral-200/80">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-[#525252] uppercase tracking-wider flex items-center space-x-1.5">
              <SlidersHorizontal className="w-3.5 h-3.5 text-[#0F172A]" />
              <span>বিক্রয় চ্যানেল:</span>
            </span>
            <div className="flex flex-wrap items-center gap-1 p-1 bg-[#F5F5F5] rounded-md border border-neutral-200/80">
              {[
                { id: 'all', label: 'সকল চ্যানেল (All)', count: metrics.total },
                { id: 'online', label: 'অনলাইন ডেলিভারি', count: metrics.onlineCount },
                { id: 'offline', label: 'ইন-স্টোর / কাউন্টার (POS)', count: metrics.offlineCount },
              ].map((c) => {
                const isActive = channelFilter === c.id;
                return (
                  <button
                    key={c.id}
                    onClick={() => setChannelFilter(c.id)}
                    className={`min-h-[44px] sm:min-h-[36px] px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center space-x-1.5 cursor-pointer border ${
                      isActive
                        ? 'border-[#0F172A] bg-[#0F172A] text-white'
                        : 'border-transparent text-[#525252] hover:text-[#111111]'
                    }`}
                  >
                    <span>{c.label}</span>
                    <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-mono tabular-nums font-medium ${
                      isActive ? 'bg-white/20 text-white' : 'bg-white text-[#525252] border border-neutral-200/80'
                    }`}>
                      {c.count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="text-xs text-[#525252] font-medium">
            ফিল্টারকৃত: <strong className="text-[#111111] font-semibold font-mono tabular-nums">{filteredOrders.length}</strong> টি অর্ডার
          </div>
        </div>

        {/* ৩.১ স্ট্যাটাস ট্যাবসমূহ */}
        <div className="flex items-center space-x-1.5 sm:space-x-2 overflow-x-auto pb-2 scrollbar-none border-b border-neutral-200/80">
          {[
            { id: 'all', label: 'সব অর্ডার', count: metrics.total, icon: ShoppingBag },
            { id: 'Pending', label: 'অপেক্ষমান', count: metrics.pending, icon: Clock, badgeClass: 'bg-amber-50 text-[#B45309] border border-amber-200/80' },
            { id: 'Confirmed', label: 'কনফার্মড', count: orders.filter(o => o.Status === 'Confirmed').length, icon: CheckCircle2 },
            { id: 'Packaging', label: 'প্যাকিং', count: orders.filter(o => o.Status === 'Packaging').length, icon: Package },
            { id: 'Shipped', label: 'কুরিয়ারে আছে', count: metrics.shipped, icon: Truck, badgeClass: 'bg-slate-100 text-[#0F172A] border border-slate-200/80' },
            { id: 'Delivered', label: 'ডেলিভার্ড', count: metrics.delivered, icon: Check, badgeClass: 'bg-emerald-50 text-[#15803D] border border-emerald-200/80' },
            { id: 'PreOrder', label: 'প্রি-অর্ডার', count: metrics.preOrders, icon: Bookmark, badgeClass: 'bg-[#F5F5F5] text-[#111111] border border-neutral-200/80' },
            { id: 'RMA', label: 'রিটার্ন আবেদন', count: metrics.rmaPending, icon: RotateCcw, badgeClass: 'bg-red-50 text-[#B91C1C] border border-red-200/80' },
            { id: 'Returned', label: 'রিটার্ন', count: orders.filter(o => o.Status === 'Returned').length, icon: RotateCcw },
            { id: 'Cancelled', label: 'বাতিল', count: orders.filter(o => o.Status === 'Cancelled').length, icon: Trash2 },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`min-h-[44px] sm:min-h-[36px] px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap flex items-center space-x-1.5 cursor-pointer shrink-0 border ${
                  isActive
                    ? 'border-[#0F172A] bg-[#0F172A] text-white'
                    : 'border-transparent text-[#525252] hover:bg-[#F5F5F5] hover:text-[#111111]'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-[#737373]'}`} />
                <span>{tab.label}</span>
                <span
                  className={`px-1.5 py-0.5 rounded-md text-[10px] font-mono tabular-nums font-medium ${
                    isActive
                      ? 'bg-white/20 text-white'
                      : tab.badgeClass
                      ? tab.badgeClass
                      : 'bg-[#F5F5F5] text-[#525252] border border-neutral-200/80'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* ৩.২ সার্চ বার, ড্রপডাউন ও ভিউ মোড সুইচার */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
          <div className="sm:col-span-4 relative">
            <Search className="w-4 h-4 text-[#737373] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="অর্ডার আইডি, ফোন বা নাম দিয়ে খুঁজুন..."
              className="w-full min-h-[44px] sm:min-h-[36px] pl-10 pr-16 py-2 bg-[#FAFAFA] border border-neutral-200/80 rounded-md text-xs sm:text-sm text-[#111111] placeholder-[#737373] focus:outline-none focus:bg-white focus:border-[#0F172A] focus:ring-1 focus:ring-[#0F172A] transition-colors font-medium"
            />
            {searchQuery ? (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#737373] hover:text-[#111111] cursor-pointer p-1"
              >
                <X className="w-4 h-4" />
              </button>
            ) : (
              <span className="hidden sm:inline-block absolute right-3 top-1/2 -translate-y-1/2 px-1.5 py-0.5 bg-[#F5F5F5] border border-neutral-200/80 text-[#737373] text-[10px] font-mono rounded-md">
                Ctrl+K
              </span>
            )}
          </div>

          <div className="sm:col-span-2">
            <select
              value={courierFilter}
              onChange={(e) => setCourierFilter(e.target.value)}
              className="w-full min-h-[44px] sm:min-h-[36px] px-3 py-2 bg-[#FAFAFA] border border-neutral-200/80 rounded-md text-xs sm:text-sm text-[#111111] font-medium focus:outline-none focus:bg-white focus:border-[#0F172A] cursor-pointer"
            >
              <option value="all">সকল কুরিয়ার</option>
              {COURIER_LIST.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-2">
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              className="w-full min-h-[44px] sm:min-h-[36px] px-3 py-2 bg-[#FAFAFA] border border-neutral-200/80 rounded-md text-xs sm:text-sm text-[#111111] font-medium focus:outline-none focus:bg-white focus:border-[#0F172A] cursor-pointer"
            >
              <option value="all">সকল সোর্স</option>
              {ORDER_SOURCES.map((s) => (
                <option key={s.id} value={s.id}>{s.label}</option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-2">
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-full min-h-[44px] sm:min-h-[36px] px-3 py-2 bg-[#FAFAFA] border border-neutral-200/80 rounded-md text-xs sm:text-sm text-[#111111] font-medium focus:outline-none focus:bg-white focus:border-[#0F172A] cursor-pointer"
            >
              <option value="all">সব সময়</option>
              <option value="today">আজকের অর্ডার</option>
              <option value="yesterday">গতকাল</option>
              <option value="last7">বিগত ৭ দিন</option>
              <option value="thisMonth">এই চলতি মাস</option>
            </select>
          </div>

          {/* ভিউ সুইচ কন্ট্রোল (টেবিল বনাম কার্ডস) */}
          <div className="sm:col-span-2 flex items-center justify-end">
            <div className="flex items-center p-0.5 bg-[#F5F5F5] rounded-md border border-neutral-200/80">
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`min-h-[44px] sm:min-h-[36px] px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center space-x-1 cursor-pointer ${
                  viewMode === 'table' ? 'bg-[#0F172A] text-white' : 'text-[#525252] hover:text-[#111111]'
                }`}
                title="টেবিল ভিউ"
              >
                <ListFilter className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">টেবিল</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('cards')}
                className={`min-h-[44px] sm:min-h-[36px] px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center space-x-1 cursor-pointer ${
                  viewMode === 'cards' ? 'bg-[#0F172A] text-white' : 'text-[#525252] hover:text-[#111111]'
                }`}
                title="কার্ড গ্রিড ভিউ"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">কার্ডস</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ৪. অর্ডার তালিকা ও ডিসপ্লে সেকশন (Orders Presentation) */}
      {filteredOrders.length === 0 ? (
        <div className="bg-white rounded-lg p-12 text-center space-y-4 border border-neutral-200/80">
          <div className="w-14 h-14 rounded-lg bg-[#F5F5F5] border border-neutral-200/80 text-[#0F172A] flex items-center justify-center mx-auto">
            <ShoppingBag className="w-7 h-7 stroke-[1.5]" />
          </div>
          <div>
            <h3 className="text-base font-semibold tracking-tight text-[#111111]">কোনো অর্ডার পাওয়া যায়নি</h3>
            <p className="text-xs text-[#525252] max-w-sm mx-auto mt-1">
              {searchQuery || activeTab !== 'all' || courierFilter !== 'all' || sourceFilter !== 'all' || dateFilter !== 'all'
                ? 'আপনার সার্চ বা নির্বাচিত ফিল্টারের সাথে মিল রয়েছে এমন কোনো অর্ডার পাওয়া যায়নি।'
                : 'এখনো কোনো ডেলিভারি অর্ডার এন্ট্রি করা হয়নি। নতুন অর্ডার নিতে উপরের বাটনে চাপুন।'}
            </p>
          </div>
          {(searchQuery || activeTab !== 'all' || courierFilter !== 'all' || sourceFilter !== 'all' || dateFilter !== 'all') && (
            <button
              onClick={() => {
                setActiveTab('all');
                setSearchQuery('');
                setCourierFilter('all');
                setSourceFilter('all');
                setDateFilter('all');
              }}
              className="min-h-[44px] sm:min-h-[36px] px-4 py-2 bg-[#0F172A] hover:bg-slate-800 text-white text-xs font-medium rounded-md transition-colors cursor-pointer"
            >
              ফিল্টার রিসেট করুন
            </button>
          )}
        </div>
      ) : (
        <>
          {/* ৪.১ ডেস্কটপ ডাটা টেবিল ভিউ (Table View) */}
          <div className={`${viewMode === 'table' ? 'hidden md:block' : 'hidden'} bg-white rounded-lg border border-neutral-200/80 overflow-hidden`}>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#F5F5F5] border-b border-neutral-200/80 text-[#525252] font-medium uppercase tracking-wider text-[10px]">
                    <th className="p-4 pl-4 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={isAllSelected}
                        onChange={toggleSelectAll}
                        className="w-4 h-4 rounded text-[#0F172A] focus:ring-[#0F172A] cursor-pointer accent-[#0F172A]"
                        title="সব অর্ডার সিলেক্ট করুন"
                      />
                    </th>
                    <th className="p-4 pl-2 whitespace-nowrap min-w-[140px]">অর্ডার আইডি ও তারিখ</th>
                    <th className="p-4 whitespace-nowrap min-w-[190px]">গ্রাহক ও এআই রিস্ক স্কোর</th>
                    <th className="p-4 whitespace-nowrap min-w-[180px]">অর্ডারকৃত পণ্যসমূহ</th>
                    <th className="p-4 whitespace-nowrap min-w-[140px]">কুরিয়ার ও ট্র্যাকিং</th>
                    <th className="p-4 whitespace-nowrap min-w-[130px] text-right">টাকার হিসাব (COD)</th>
                    <th className="p-4 whitespace-nowrap min-w-[110px] text-center">স্ট্যাটাস</th>
                    <th className="p-4 pr-6 whitespace-nowrap min-w-[140px] text-center">অ্যাকশন</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200/80 font-medium text-[#525252]">
                  {filteredOrders.map((order) => {
                    const statusObj = ORDER_STATUSES.find(s => s.id === order.Status) || ORDER_STATUSES[0];
                    const courierBadge = getCourierBadge(order.CourierName);
                    const formattedDate = new Date(order.CreatedAt || order.OrderDate).toLocaleDateString('bn-BD', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric'
                    });

                    // এআই ফ্রড ও রিটার্ন রিস্ক বিশ্লেষণ
                    const risk = calculateOrderRisk(order, orders);
                    const avatarStyle = getCustomerAvatarGradient(order.CustomerName);
                    const initials = getCustomerInitials(order.CustomerName);

                    return (
                      <tr key={order.OrderID} className="hover:bg-[#FAFAFA] transition-colors group">
                        {/* সিলেকশন চেকবক্স */}
                        <td className="p-4 pl-4 align-top text-center w-10" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={selectedOrderIds.includes(order.OrderID)}
                            onChange={(e) => toggleSelectOrder(order.OrderID, e)}
                            className="w-4 h-4 rounded text-[#0F172A] focus:ring-[#0F172A] cursor-pointer accent-[#0F172A] mt-1"
                          />
                        </td>

                        {/* অর্ডার আইডি ও সোর্স */}
                        <td className="p-4 pl-2 align-top whitespace-nowrap min-w-[140px]">
                          <div className="flex items-center space-x-1.5">
                            <span className="font-mono tabular-nums font-semibold text-[#111111] text-xs tracking-tight whitespace-nowrap">
                              {order.OrderID}
                            </span>
                            <button
                              onClick={() => handleCopyId(order.OrderID)}
                              title="আইডি কপি করুন"
                              className="text-[#737373] hover:text-[#111111] cursor-pointer p-0.5 rounded-md hover:bg-[#F5F5F5]"
                            >
                              {copiedId === order.OrderID ? (
                                <Check className="w-3.5 h-3.5 text-[#15803D]" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>

                          <div className="flex flex-col items-start gap-1 mt-1">
                            <span className="text-[10px] text-[#737373] font-mono tabular-nums font-medium whitespace-nowrap">{formattedDate}</span>
                            {order.OrderSource === 'In-Store / POS' || order.OrderSource === 'Walk-in' || order.CourierName === 'Counter Pickup' ? (
                              <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 bg-emerald-50 text-[#15803D] border border-emerald-200/80 rounded-md text-[9px] font-medium whitespace-nowrap">
                                ইন-স্টোর (POS)
                              </span>
                            ) : (
                              <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 bg-[#F5F5F5] text-[#111111] border border-neutral-200/80 rounded-md text-[9px] font-medium whitespace-nowrap">
                                {order.OrderSource || 'অনলাইন'}
                              </span>
                            )}

                            {order.IsPreOrder && (
                              <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded-md text-[9px] font-medium bg-amber-50 text-[#B45309] border border-amber-200/80 whitespace-nowrap">
                                <Bookmark className="w-2.5 h-2.5" />
                                <span>প্রি-অর্ডার</span>
                              </span>
                            )}
                          </div>
                        </td>

                        {/* কাস্টমার তথ্য ও এআই রিস্ক স্কোর */}
                        <td className="p-4 align-top min-w-[190px]">
                          <div className="flex items-start space-x-2.5">
                            <div className={`w-8 h-8 rounded-md ${avatarStyle} font-semibold text-xs flex items-center justify-center shrink-0 mt-0.5`}>
                              {initials}
                            </div>

                            <div className="space-y-1 min-w-0">
                              <div className="flex items-center flex-wrap gap-1.5">
                                <span className="font-semibold text-[#111111] text-xs truncate max-w-[150px]" title={order.CustomerName}>
                                  {order.CustomerName}
                                </span>

                                {/* এআই রিস্ক ব্যাজ */}
                                <span
                                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-medium border shrink-0 cursor-help ${
                                    risk.level === 'High'
                                      ? 'bg-red-50 text-[#B91C1C] border-red-200/80'
                                      : risk.level === 'Medium'
                                      ? 'bg-amber-50 text-[#B45309] border-amber-200/80'
                                      : 'bg-emerald-50 text-[#15803D] border-emerald-200/80'
                                  }`}
                                  title={risk.flags.length > 0 ? risk.flags.join(' • ') : risk.recommendation}
                                >
                                  {risk.level === 'High' ? (
                                    <>
                                      <span className="w-1.5 h-1.5 rounded-full bg-[#B91C1C] shrink-0" />
                                      <span className="whitespace-nowrap">উচ্চ ঝুঁকি</span>
                                    </>
                                  ) : risk.level === 'Medium' ? (
                                    <>
                                      <Clock className="w-2.5 h-2.5 shrink-0" />
                                      <span className="whitespace-nowrap">সতর্কতা</span>
                                    </>
                                  ) : (
                                    <>
                                      <ShieldCheck className="w-2.5 h-2.5 shrink-0" />
                                      <span className="whitespace-nowrap">নিরাপদ</span>
                                    </>
                                  )}
                                </span>
                              </div>

                              {order.CustomerPhone ? (
                                <div className="flex items-center space-x-1 text-[#525252] text-[11px] font-mono tabular-nums">
                                  <a
                                    href={`tel:${order.CustomerPhone}`}
                                    className="hover:text-[#0F172A] flex items-center space-x-1"
                                    title="কল করতে ক্লিক করুন"
                                  >
                                    <Phone className="w-2.5 h-2.5 text-[#737373] shrink-0" />
                                    <span>{order.CustomerPhone}</span>
                                  </a>
                                </div>
                              ) : (
                                <span className="text-[10px] text-[#737373] italic block">ফোন নম্বর নেই</span>
                              )}

                              {order.CustomerAddress && (
                                <div className="flex items-start space-x-1 text-[#737373] text-[10px] max-w-[200px] truncate" title={order.CustomerAddress}>
                                  <MapPin className="w-2.5 h-2.5 text-[#737373] shrink-0 mt-0.5" />
                                  <span className="truncate">{order.CustomerAddress}</span>
                                </div>
                              )}

                              {order.RmaRequest && (
                                <div className="pt-0.5">
                                  <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-medium border ${
                                    order.RmaRequest.status === 'Approved'
                                      ? 'bg-emerald-50 text-[#15803D] border-emerald-200/80'
                                      : order.RmaRequest.status === 'Rejected'
                                      ? 'bg-[#F5F5F5] text-[#525252] border-neutral-200/80'
                                      : 'bg-amber-50 text-[#B45309] border-amber-200/80'
                                  }`}>
                                    {order.RmaRequest.status === 'Approved' ? 'রিটার্ন গৃহীত' : order.RmaRequest.status === 'Rejected' ? 'রিটার্ন বাতিল' : 'রিটার্ন আবেদন এসেছে'}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* পণ্যসমূহ */}
                        <td className="p-4 align-top min-w-[180px] max-w-[260px]">
                          <div className="space-y-1.5">
                            {(order.Items || []).slice(0, 2).map((item, idx) => (
                              <div key={idx} className="text-[11px] text-[#111111] flex items-center justify-between gap-1.5 bg-[#FAFAFA] p-1.5 rounded-md border border-neutral-200/80">
                                <span className="font-medium truncate" title={item.productName || item.ProductName}>
                                  {item.productName || item.ProductName}
                                </span>
                                <span className="font-mono tabular-nums font-semibold text-[#525252] bg-white border border-neutral-200/80 px-1.5 py-0.5 rounded-md text-[10px] shrink-0">
                                  ×{item.quantity || item.Quantity}
                                </span>
                              </div>
                            ))}
                            {(order.Items || []).length > 2 && (
                              <span className="text-[10px] font-medium text-[#525252] font-mono tabular-nums block pl-1">
                                + আরো {(order.Items || []).length - 2}টি আইটেম
                              </span>
                            )}
                          </div>
                        </td>

                        {/* কুরিয়ার ও ট্র্যাকিং */}
                        <td className="p-4 align-top whitespace-nowrap min-w-[140px]">
                          <div className="space-y-1">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-medium border whitespace-nowrap ${courierBadge.bg}`}>
                              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${courierBadge.dot}`} />
                              <span className="whitespace-nowrap">{courierBadge.name}</span>
                            </span>

                            {order.TrackingID ? (
                              <div className="flex items-center space-x-1 pt-0.5">
                                <span className="font-mono tabular-nums text-[10px] text-[#111111] bg-[#F5F5F5] px-1.5 py-0.5 rounded-md border border-neutral-200/80 font-medium whitespace-nowrap">
                                  {order.TrackingID}
                                </span>
                                <button
                                  onClick={() => handleCopyId(order.TrackingID)}
                                  title="ট্র্যাকিং কোড কপি করুন"
                                  className="text-[#737373] hover:text-[#111111] p-0.5 rounded-md cursor-pointer"
                                >
                                  {copiedId === order.TrackingID ? (
                                    <Check className="w-3 h-3 text-[#15803D]" />
                                  ) : (
                                    <Copy className="w-3 h-3" />
                                  )}
                                </button>
                              </div>
                            ) : (
                              <span className="text-[10px] text-[#737373] italic block pt-0.5">
                                ট্র্যাকিং নেই
                              </span>
                            )}

                            {order.ConsignmentID && (
                              <div className="text-[9px] text-[#737373] font-mono tabular-nums">
                                CID: <span className="font-semibold text-[#111111]">{order.ConsignmentID}</span>
                              </div>
                            )}

                            {order.SmsStatus && (
                              <div className="pt-0.5">
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-[#F5F5F5] text-[#111111] rounded-md text-[9px] font-medium border border-neutral-200/80">
                                  <MessageSquare className="w-2.5 h-2.5" />
                                  <span>SMS: {order.SmsStatus}</span>
                                </span>
                              </div>
                            )}
                          </div>
                        </td>

                        {/* টাকার হিসাব (COD / Due) */}
                        <td className="p-4 align-top text-right whitespace-nowrap min-w-[130px]">
                          <div className="text-[11px] font-medium text-[#525252]">
                            মোট: <span className="font-semibold text-[#111111] font-mono tabular-nums">{currencySymbol}{Number(order.TotalAmount || 0).toLocaleString('en-US')}</span>
                          </div>
                          {Number(order.AdvancePaid || 0) > 0 && (
                            <div className="text-[10px] text-[#15803D] font-medium mt-0.5">
                              অগ্রিম: <span className="font-semibold font-mono tabular-nums">{currencySymbol}{Number(order.AdvancePaid || 0).toLocaleString('en-US')}</span>
                            </div>
                          )}
                          <div className="mt-1">
                            {Number(order.DueAmount || 0) > 0 ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-red-50 text-[#B91C1C] border border-red-200/80 font-mono tabular-nums">
                                COD: {currencySymbol}{Number(order.DueAmount || 0).toLocaleString('en-US')}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-emerald-50 text-[#15803D] border border-emerald-200/80">
                                <Check className="w-2.5 h-2.5" />
                                <span>পরিশোধিত</span>
                              </span>
                            )}
                          </div>
                        </td>

                        {/* স্ট্যাটাস ব্যাজ ও কুইক চেঞ্জার */}
                        <td className="p-4 align-top text-center whitespace-nowrap min-w-[110px]">
                          <div className="relative inline-block text-left">
                            <button
                              onClick={() => {
                                setActionMenuOrderId(null);
                                setStatusDropdownOrderId(statusDropdownOrderId === order.OrderID ? null : order.OrderID);
                              }}
                              className={`min-h-[36px] px-3 py-1 rounded-md text-[10px] font-medium border transition-colors flex items-center space-x-1 cursor-pointer ${statusObj.color}`}
                            >
                              <span>{statusObj.label}</span>
                              <ChevronDown className="w-3 h-3 ml-0.5 opacity-70" />
                            </button>

                            {statusDropdownOrderId === order.OrderID && (
                              <>
                                <div className="fixed inset-0 z-20" onClick={() => setStatusDropdownOrderId(null)} />
                                <div className="absolute left-1/2 -translate-x-1/2 mt-1 w-36 bg-white rounded-lg border border-neutral-200/80 py-1.5 z-30 animate-in fade-in zoom-in-95">
                                  {ORDER_STATUSES.map((st) => (
                                    <button
                                      key={st.id}
                                      onClick={() => handleQuickStatusChange(order, st.id)}
                                      className={`w-full text-left px-3 py-1.5 text-xs font-medium hover:bg-[#F5F5F5] flex items-center justify-between cursor-pointer ${
                                        order.Status === st.id ? 'text-[#0F172A] bg-[#F5F5F5] font-semibold' : 'text-[#525252]'
                                      }`}
                                    >
                                      <span>{st.label}</span>
                                      {order.Status === st.id && <Check className="w-3.5 h-3.5 text-[#0F172A]" />}
                                    </button>
                                  ))}
                                </div>
                              </>
                            )}
                          </div>
                        </td>

                        {/* অ্যাকশন বাটনসমূহ */}
                        <td className="p-4 pr-6 align-top text-center whitespace-nowrap min-w-[140px]">
                          <div className="flex items-center justify-center space-x-1.5">
                            {/* ১. বিস্তারিত ভিউ */}
                            <button
                              onClick={() => setSelectedOrderDetails(order)}
                              title="অর্ডারের বিস্তারিত বিবরণ"
                              className="min-h-[36px] min-w-[36px] p-1.5 bg-[#F5F5F5] hover:bg-neutral-200/70 text-[#0F172A] border border-neutral-200/80 rounded-md transition-colors cursor-pointer flex items-center justify-center"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>

                            {/* ২. অর্ডার এডিট */}
                            <button
                              onClick={() => {
                                setEditingOrder(order);
                                setIsCreateModalOpen(true);
                              }}
                              title="অর্ডারের তথ্য, আইটেম ও পেমেন্ট এডিট করুন"
                              className="min-h-[36px] min-w-[36px] p-1.5 bg-amber-50 hover:bg-amber-100 text-[#B45309] border border-amber-200/80 rounded-md transition-colors cursor-pointer flex items-center justify-center"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>

                            {/* ৩. হোয়াটসঅ্যাপ মেসেজ */}
                            <button
                              onClick={() => openOrderWhatsApp(order, settings.StoreName, currencySymbol)}
                              title="গ্রাহককে হোয়াটসঅ্যাপ বার্তা পাঠান"
                              className="min-h-[36px] min-w-[36px] p-1.5 bg-emerald-50 hover:bg-emerald-100 text-[#15803D] border border-emerald-200/80 rounded-md transition-colors cursor-pointer flex items-center justify-center"
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                            </button>

                            {/* ৪. আরো অ্যাকশন ড্রপডাউন (More Actions Menu) */}
                            <div className="relative inline-block text-left">
                              <button
                                onClick={() => {
                                  setStatusDropdownOrderId(null);
                                  setActionMenuOrderId(actionMenuOrderId === order.OrderID ? null : order.OrderID);
                                }}
                                title="আরো অ্যাকশন"
                                className="min-h-[36px] min-w-[36px] p-1.5 bg-white hover:bg-[#F5F5F5] text-[#525252] border border-neutral-200/80 rounded-md transition-colors cursor-pointer flex items-center justify-center"
                              >
                                <MoreVertical className="w-3.5 h-3.5" />
                              </button>

                              {actionMenuOrderId === order.OrderID && (
                                <>
                                  <div className="fixed inset-0 z-20" onClick={() => setActionMenuOrderId(null)} />
                                  <div className="absolute right-0 mt-1 w-52 bg-white rounded-lg border border-neutral-200/80 py-1.5 z-30 animate-in fade-in zoom-in-95 text-left divide-y divide-neutral-200/80">
                                    
                                    {/* মেসেজিং ও ট্র্যাকিং সেকশন */}
                                    <div className="py-1">
                                      <button
                                        onClick={() => {
                                          setActionMenuOrderId(null);
                                          setSingleSmsModalOrder(order);
                                        }}
                                        className="w-full px-3 py-1.5 text-xs font-medium text-[#111111] hover:bg-[#F5F5F5] flex items-center space-x-2 cursor-pointer transition-colors"
                                      >
                                        <MessageSquare className="w-3.5 h-3.5 text-[#525252]" />
                                        <span>SMS বার্তা পাঠান</span>
                                      </button>

                                      {(order.TrackingID || order.ConsignmentID) && (
                                        <button
                                          onClick={() => {
                                            setActionMenuOrderId(null);
                                            setTrackingModalOrder(order);
                                          }}
                                          className="w-full px-3 py-1.5 text-xs font-medium text-[#111111] hover:bg-[#F5F5F5] flex items-center space-x-2 cursor-pointer transition-colors"
                                        >
                                          <Truck className="w-3.5 h-3.5 text-[#15803D]" />
                                          <span>Steadfast লাইভ ট্র্যাকিং</span>
                                        </button>
                                      )}

                                      <button
                                        onClick={() => {
                                          setActionMenuOrderId(null);
                                          setCustomerTrackingOrderId(order.OrderID);
                                        }}
                                        className="w-full px-3 py-1.5 text-xs font-medium text-[#111111] hover:bg-[#F5F5F5] flex items-center space-x-2 cursor-pointer transition-colors"
                                      >
                                        <ExternalLink className="w-3.5 h-3.5 text-[#525252]" />
                                        <span>গ্রাহক ট্র্যাকিং পেজ</span>
                                      </button>

                                      <button
                                        onClick={() => {
                                          setActionMenuOrderId(null);
                                          handleCopyTrackingLink(order.OrderID);
                                        }}
                                        className="w-full px-3 py-1.5 text-xs font-medium text-[#111111] hover:bg-[#F5F5F5] flex items-center space-x-2 cursor-pointer transition-colors"
                                      >
                                        <Share2 className="w-3.5 h-3.5 text-[#B45309]" />
                                        <span>ট্র্যাকিং লিংক কপি</span>
                                      </button>
                                    </div>

                                    {/* প্রিন্টিং সেকশন */}
                                    <div className="py-1">
                                      <button
                                        onClick={() => {
                                          setActionMenuOrderId(null);
                                          setLabelPrintOrder(order);
                                        }}
                                        className="w-full px-3 py-1.5 text-xs font-medium text-[#111111] hover:bg-[#F5F5F5] flex items-center space-x-2 cursor-pointer transition-colors"
                                      >
                                        <Tag className="w-3.5 h-3.5 text-[#525252]" />
                                        <span>শিপিং লেবেল প্রিন্ট</span>
                                      </button>

                                      <button
                                        onClick={() => {
                                          setActionMenuOrderId(null);
                                          setChallanPrintOrder(order);
                                        }}
                                        className="w-full px-3 py-1.5 text-xs font-medium text-[#111111] hover:bg-[#F5F5F5] flex items-center space-x-2 cursor-pointer transition-colors"
                                      >
                                        <FileText className="w-3.5 h-3.5 text-[#15803D]" />
                                        <span>ডেলিভারি চালান প্রিন্ট</span>
                                      </button>
                                    </div>

                                    {/* ডিলিট সেকশন */}
                                    {onDeleteOrder && (
                                      <div className="py-1">
                                        <button
                                          onClick={() => {
                                            setActionMenuOrderId(null);
                                            if (window.confirm(`আপনি কি নিশ্চিতভাবে ${order.OrderID} অর্ডারটি মুছে ফেলতে চান?`)) {
                                              onDeleteOrder(order.OrderID);
                                            }
                                          }}
                                          className="w-full px-3 py-1.5 text-xs font-medium text-[#B91C1C] hover:bg-red-50 flex items-center space-x-2 cursor-pointer transition-colors"
                                        >
                                          <Trash2 className="w-3.5 h-3.5 text-[#B91C1C]" />
                                          <span>অর্ডার মুছে ফেলুন</span>
                                        </button>
                                      </div>
                                    )}

                                  </div>
                                </>
                              )}
                            </div>

                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* ৪.২ রেসপনসিভ কার্ড গ্রিড ভিউ (Cards View for Mobile or by User Switch) */}
          <div className={`${viewMode === 'cards' ? 'block' : 'block md:hidden'} grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4`}>
            {filteredOrders.map((order) => {
              const statusObj = ORDER_STATUSES.find(s => s.id === order.Status) || ORDER_STATUSES[0];
              const courierBadge = getCourierBadge(order.CourierName);
              const formattedDate = new Date(order.CreatedAt || order.OrderDate).toLocaleDateString('bn-BD', {
                day: 'numeric',
                month: 'short',
                year: 'numeric'
              });
              const risk = calculateOrderRisk(order, orders);
              const avatarStyle = getCustomerAvatarGradient(order.CustomerName);
              const initials = getCustomerInitials(order.CustomerName);

              return (
                <div
                  key={order.OrderID}
                  className="bg-white rounded-lg p-5 border border-neutral-200/80 space-y-4 relative group"
                >
                  {/* কার্ড হেডার */}
                  <div className="flex items-center justify-between border-b border-neutral-200/80 pb-3">
                    <div className="flex items-center space-x-2.5">
                      <input
                        type="checkbox"
                        checked={selectedOrderIds.includes(order.OrderID)}
                        onChange={(e) => toggleSelectOrder(order.OrderID, e)}
                        className="w-4 h-4 rounded text-[#0F172A] focus:ring-[#0F172A] cursor-pointer accent-[#0F172A]"
                        title="অর্ডার নির্বাচন করুন"
                      />
                      <div>
                        <div className="flex items-center space-x-1.5">
                          <span className="font-mono tabular-nums font-semibold text-[#111111] text-sm tracking-tight">
                            {order.OrderID}
                          </span>
                          <button
                            onClick={() => handleCopyId(order.OrderID)}
                            className="text-[#737373] hover:text-[#111111] p-1 rounded-md cursor-pointer"
                          >
                            {copiedId === order.OrderID ? (
                              <Check className="w-3.5 h-3.5 text-[#15803D]" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                        <div className="flex items-center space-x-1.5 mt-0.5 flex-wrap gap-y-0.5">
                          <span className="text-[10px] text-[#737373] font-mono tabular-nums">{formattedDate}</span>
                          {order.OrderSource === 'In-Store / POS' || order.OrderSource === 'Walk-in' || order.CourierName === 'Counter Pickup' ? (
                            <span className="px-1.5 py-0.5 bg-emerald-50 text-[#15803D] border border-emerald-200/80 rounded-md text-[9px] font-medium">
                              ইন-স্টোর (POS)
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 bg-[#F5F5F5] text-[#111111] border border-neutral-200/80 rounded-md text-[9px] font-medium">
                              {order.OrderSource || 'অনলাইন'}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-1.5">
                      {order.IsPreOrder && (
                        <span className="px-1.5 py-0.5 rounded-md text-[9px] font-medium bg-amber-50 text-[#B45309] border border-amber-200/80">
                          প্রি-অর্ডার
                        </span>
                      )}
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-medium border ${statusObj.color}`}>
                        {statusObj.label}
                      </span>
                    </div>
                  </div>

                  {/* গ্রাহক তথ্য বক্স */}
                  <div className="flex items-start space-x-3">
                    <div className={`w-10 h-10 rounded-md ${avatarStyle} font-semibold text-sm flex items-center justify-center shrink-0`}>
                      {initials}
                    </div>
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-[#111111] text-sm truncate">
                          {order.CustomerName}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-md text-[9px] font-medium border flex items-center space-x-0.5 shrink-0 ${
                            risk.level === 'High'
                              ? 'bg-red-50 text-[#B91C1C] border-red-200/80'
                              : risk.level === 'Medium'
                              ? 'bg-amber-50 text-[#B45309] border-amber-200/80'
                              : 'bg-emerald-50 text-[#15803D] border-emerald-200/80'
                          }`}
                        >
                          {risk.level === 'High' ? 'উচ্চ ঝুঁকি' : risk.level === 'Medium' ? 'সতর্কতা' : 'নিরাপদ'}
                        </span>
                      </div>

                      {order.CustomerPhone ? (
                        <div className="flex items-center space-x-1 text-[#525252] text-xs font-mono tabular-nums">
                          <a href={`tel:${order.CustomerPhone}`} className="hover:text-[#0F172A] flex items-center space-x-1">
                            <Phone className="w-3 h-3 text-[#737373]" />
                            <span>{order.CustomerPhone}</span>
                          </a>
                        </div>
                      ) : (
                        <span className="text-[10px] text-[#737373] italic block">ফোন নম্বর নেই</span>
                      )}

                      {order.CustomerAddress && (
                        <div className="flex items-start space-x-1 text-[#737373] text-xs truncate">
                          <MapPin className="w-3 h-3 text-[#737373] shrink-0 mt-0.5" />
                          <span className="truncate">{order.CustomerAddress}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* পণ্য ও কুরিয়ার তথ্য */}
                  <div className="bg-[#F5F5F5] rounded-md p-3 border border-neutral-200/80 text-xs space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-md text-[10px] font-medium border whitespace-nowrap ${courierBadge.bg}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${courierBadge.dot}`} />
                        <span>{courierBadge.name}</span>
                      </span>

                      {order.TrackingID ? (
                        <div className="flex items-center space-x-1 font-mono tabular-nums text-[10px] text-[#111111] bg-white px-2 py-0.5 rounded-md border border-neutral-200/80 font-medium">
                          <span>{order.TrackingID}</span>
                          <button onClick={() => handleCopyId(order.TrackingID)} className="cursor-pointer">
                            <Copy className="w-2.5 h-2.5 text-[#737373]" />
                          </button>
                        </div>
                      ) : (
                        <span className="text-[10px] text-[#737373] italic">ট্র্যাকিং কোড নেই</span>
                      )}
                    </div>

                    <div className="space-y-1 pt-1 border-t border-neutral-200/80">
                      {(order.Items || []).map((item, idx) => (
                        <div key={idx} className="flex justify-between text-[11px] text-[#525252]">
                          <span className="truncate text-[#111111]">{item.productName || item.ProductName}</span>
                          <span className="font-mono tabular-nums text-[#525252]">×{item.quantity || item.Quantity}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* ক্যাশ ও পেমেন্ট ফুটার */}
                  <div className="flex items-center justify-between pt-2 border-t border-neutral-200/80">
                    <div>
                      <span className="text-[10px] text-[#737373] uppercase tracking-wider block font-medium">কালেকশন (COD)</span>
                      {Number(order.DueAmount || 0) > 0 ? (
                        <span className="text-lg font-semibold text-[#B91C1C] font-mono tabular-nums">
                          {currencySymbol}{Number(order.DueAmount || 0).toLocaleString('en-US')}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-emerald-50 text-[#15803D] border border-emerald-200/80 mt-1">
                          <Check className="w-3 h-3" />
                          <span>পরিশোধিত</span>
                        </span>
                      )}
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] text-[#737373] block">মোট বিল</span>
                      <span className="text-xs font-semibold text-[#111111] font-mono tabular-nums">
                        {currencySymbol}{Number(order.TotalAmount || 0).toLocaleString('en-US')}
                      </span>
                    </div>
                  </div>

                  {/* অ্যাকশন বাটনসমূহ */}
                  <div className="grid grid-cols-4 gap-1.5 pt-1">
                    <button
                      onClick={() => setSelectedOrderDetails(order)}
                      className="min-h-[44px] sm:min-h-[36px] py-2 bg-[#F5F5F5] hover:bg-neutral-200/70 text-[#111111] border border-neutral-200/80 text-xs font-medium rounded-md flex items-center justify-center space-x-1 cursor-pointer transition-colors"
                      title="বিস্তারিত ও অডিট লগ"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span className="text-[10px]">ভিউ</span>
                    </button>

                    <button
                      onClick={() => {
                        setEditingOrder(order);
                        setIsCreateModalOpen(true);
                      }}
                      className="min-h-[44px] sm:min-h-[36px] py-2 bg-amber-50 hover:bg-amber-100 text-[#B45309] border border-amber-200/80 text-xs font-medium rounded-md flex items-center justify-center space-x-1 cursor-pointer transition-colors"
                      title="অর্ডার এডিট করুন"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span className="text-[10px]">এডিট</span>
                    </button>

                    <button
                      onClick={() => openOrderWhatsApp(order, settings.StoreName, currencySymbol)}
                      className="min-h-[44px] sm:min-h-[36px] py-2 bg-emerald-50 hover:bg-emerald-100 text-[#15803D] border border-emerald-200/80 text-xs font-medium rounded-md flex items-center justify-center space-x-1 cursor-pointer transition-colors"
                      title="হোয়াটসঅ্যাপে পাঠান"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span className="text-[10px]">WA</span>
                    </button>

                    {(order.TrackingID || order.ConsignmentID) && (
                      <button
                        onClick={() => setTrackingModalOrder(order)}
                        className="min-h-[44px] sm:min-h-[36px] py-2 bg-emerald-50 hover:bg-emerald-100 text-[#15803D] border border-emerald-200/80 text-xs font-medium rounded-md flex items-center justify-center space-x-1 cursor-pointer transition-colors"
                        title="Steadfast লাইভ ট্র্যাকিং"
                      >
                        <Truck className="w-3.5 h-3.5 text-[#15803D]" />
                        <span className="text-[10px]">Steadfast</span>
                      </button>
                    )}

                    <button
                      onClick={() => setSingleSmsModalOrder(order)}
                      className="min-h-[44px] sm:min-h-[36px] py-2 bg-[#F5F5F5] hover:bg-neutral-200/70 text-[#111111] border border-neutral-200/80 text-xs font-medium rounded-md flex items-center justify-center space-x-1 cursor-pointer transition-colors"
                      title="গ্রাহককে SMS পাঠান"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span className="text-[10px]">SMS</span>
                    </button>

                    <button
                      onClick={() => setCustomerTrackingOrderId(order.OrderID)}
                      className="min-h-[44px] sm:min-h-[36px] py-2 bg-[#F5F5F5] hover:bg-neutral-200/70 text-[#111111] border border-neutral-200/80 text-xs font-medium rounded-md flex items-center justify-center space-x-1 cursor-pointer transition-colors"
                      title="লাইভ ট্র্যাক"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span className="text-[10px]">ট্র্যাক</span>
                    </button>

                    <button
                      onClick={() => setLabelPrintOrder(order)}
                      className="min-h-[44px] sm:min-h-[36px] py-2 bg-[#F5F5F5] hover:bg-neutral-200/70 text-[#111111] border border-neutral-200/80 text-xs font-medium rounded-md flex items-center justify-center space-x-1 cursor-pointer transition-colors"
                      title="শিপিং স্টিকার"
                    >
                      <Tag className="w-3.5 h-3.5" />
                      <span className="text-[10px]">লেবেল</span>
                    </button>

                    <button
                      onClick={() => setChallanPrintOrder(order)}
                      className="min-h-[44px] sm:min-h-[36px] py-2 bg-[#F5F5F5] hover:bg-neutral-200/70 text-[#111111] border border-neutral-200/80 text-xs font-medium rounded-md flex items-center justify-center space-x-1 cursor-pointer transition-colors"
                      title="চালান প্রিন্ট"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span className="text-[10px]">চালান</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* ফ্লোটিং বাল্ক অ্যাকশন বার (Floating Bulk Operations Bar) */}
      {selectedOrderIds.length > 0 && (
        <div className="fixed bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 z-40 bg-[#0F172A] text-white px-4 sm:px-5 py-3 rounded-lg border border-slate-800 flex flex-wrap items-center justify-between gap-3 max-w-4xl w-[94vw] animate-in fade-in slide-in-from-bottom-5">
          <div className="flex items-center space-x-3">
            <span className="w-7 h-7 rounded-md bg-white text-[#0F172A] font-mono tabular-nums font-semibold text-xs flex items-center justify-center">
              {selectedOrderIds.length}
            </span>
            <div className="leading-tight">
              <span className="text-xs font-semibold block">
                <span className="font-mono tabular-nums">{selectedOrderIds.length}</span>টি অর্ডার সিলেক্ট করা হয়েছে
              </span>
              <button
                onClick={() => setSelectedOrderIds([])}
                className="text-[10px] text-slate-300 hover:text-white underline cursor-pointer"
              >
                সিলেকশন ক্লিয়ার করুন
              </button>
            </div>
          </div>

          <div className="flex items-center flex-wrap gap-2">
            {/* বাল্ক স্ট্যাটাস পরিবর্তন মেনু */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setBulkStatusDropdownOpen(!bulkStatusDropdownOpen)}
                className="min-h-[44px] sm:min-h-[36px] px-3.5 py-2 bg-white hover:bg-neutral-100 text-[#0F172A] text-xs font-medium rounded-md flex items-center space-x-1.5 cursor-pointer transition-colors"
              >
                <span>স্ট্যাটাস পরিবর্তন</span>
                <ChevronDown className="w-3.5 h-3.5" />
              </button>

              {bulkStatusDropdownOpen && (
                <div className="absolute right-0 bottom-full mb-2 w-48 bg-white text-[#111111] rounded-lg border border-neutral-200/80 py-1.5 z-50 animate-in fade-in zoom-in-95">
                  <span className="text-[10px] font-medium text-[#737373] px-3 py-1 block uppercase">
                    একসাথে স্ট্যাটাস বদলান:
                  </span>
                  {ORDER_STATUSES.filter(s => ['Confirmed', 'Packaging', 'Shipped', 'Delivered', 'Cancelled'].includes(s.id)).map((st) => (
                    <button
                      key={st.id}
                      onClick={() => {
                        setBulkStatusDropdownOpen(false);
                        if (onBulkUpdateStatus) {
                          onBulkUpdateStatus(selectedOrderIds, st.id);
                        } else if (onUpdateStatus) {
                          selectedOrderIds.forEach(id => onUpdateStatus(id, st.id));
                        }
                        setSelectedOrderIds([]);
                      }}
                      className="w-full text-left px-3 py-2 text-xs font-medium hover:bg-[#F5F5F5] text-[#111111] flex items-center space-x-2 cursor-pointer"
                    >
                      <span className={`w-2 h-2 rounded-full ${st.id === 'Delivered' ? 'bg-[#15803D]' : st.id === 'Cancelled' ? 'bg-neutral-400' : 'bg-[#0F172A]'}`} />
                      <span>{st.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* ১-ক্লিক Steadfast API বাল্ক বুকিং */}
            <button
              onClick={() => setIsBulkCourierModalOpen(true)}
              className="min-h-[44px] sm:min-h-[36px] px-3.5 py-2 bg-[#15803D] hover:bg-emerald-800 text-white text-xs font-medium rounded-md flex items-center space-x-1.5 cursor-pointer transition-colors"
              title="Steadfast API-তে ১-ক্লিকে সরাসরি বুকিং দিন ও ট্র্যাকিং আইডি সংগ্রহ করুন"
            >
              <Truck className="w-3.5 h-3.5 text-white" />
              <span>Steadfast বুকিং</span>
            </button>

            {/* বাল্ক SMS ও WhatsApp নোটিফিকেশন */}
            <button
              onClick={() => setIsBulkSmsModalOpen(true)}
              className="min-h-[44px] sm:min-h-[36px] px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-medium rounded-md flex items-center space-x-1.5 cursor-pointer transition-colors border border-slate-700"
              title="নির্বাচিত সব কাস্টমারকে একসাথে SMS বা WhatsApp বার্তা পাঠান"
            >
              <MessageSquare className="w-3.5 h-3.5 text-slate-200" />
              <span>বাল্ক SMS / WA</span>
            </button>

            {/* বাল্ক শিপিং লেবেল প্রিন্ট */}
            <button
              onClick={() => setIsBulkLabelModalOpen(true)}
              className="min-h-[44px] sm:min-h-[36px] px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-medium rounded-md flex items-center space-x-1.5 cursor-pointer transition-colors border border-slate-700"
              title="নির্বাচিত সব পার্সেলের স্টিকার লেবেল একসাথে প্রিন্ট করুন"
            >
              <Printer className="w-3.5 h-3.5 text-slate-200" />
              <span>লেবেল প্রিন্ট</span>
            </button>

            {/* কুরিয়ার CSV এক্সপোর্ট */}
            <button
              onClick={() => {
                exportCourierBulkCsv(selectedOrdersList, courierFilter === 'all' ? 'All' : courierFilter);
                if (showToast) showToast(`${selectedOrdersList.length}টি অর্ডারের কুরিয়ার CSV ফাইল ডাউনলোড হয়েছে!`, 'success');
              }}
              className="min-h-[44px] sm:min-h-[36px] px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-medium rounded-md flex items-center space-x-1.5 cursor-pointer transition-colors border border-slate-700"
              title="Steadfast / Pathao বাল্ক আপলোডের জন্য CSV ডাউনলোড করুন"
            >
              <Download className="w-3.5 h-3.5" />
              <span>কুরিয়ার CSV</span>
            </button>
          </div>
        </div>
      )}

      {/* ৫. নতুন অর্ডার তৈরি ও সম্পাদনা মডাল (Create/Edit Order Modal) */}
      {isCreateModalOpen && (
        <CreateOrderModal
          isOpen={isCreateModalOpen}
          initialOrder={editingOrder}
          onClose={() => {
            setIsCreateModalOpen(false);
            setEditingOrder(null);
          }}
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
          onEditOrder={() => {
            setEditingOrder(selectedOrderDetails);
            setSelectedOrderDetails(null);
            setIsCreateModalOpen(true);
          }}
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

      {/* বাল্ক শিপিং স্টিকার লেবেল প্রিন্ট মডাল */}
      {isBulkLabelModalOpen && (
        <BulkShippingLabelsModal
          isOpen={isBulkLabelModalOpen}
          orders={selectedOrdersList}
          settings={settings}
          onClose={() => setIsBulkLabelModalOpen(false)}
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

      {/* ১০. Steadfast ১-ক্লিক বাল্ক কুরিয়ার বুকিং মডাল */}
      {isBulkCourierModalOpen && (
        <BulkCourierDispatchModal
          isOpen={isBulkCourierModalOpen}
          onClose={() => setIsBulkCourierModalOpen(false)}
          selectedOrders={selectedOrdersList}
          settings={settings}
          onSteadfastBulkDispatch={onSteadfastBulkDispatch}
          onOpenBulkLabels={() => {
            setIsBulkCourierModalOpen(false);
            setIsBulkLabelModalOpen(true);
          }}
          currencySymbol={currencySymbol}
        />
      )}

      {/* ১১. বাল্ক ও একক SMS / WhatsApp মেসেজিং মডাল */}
      {(isBulkSmsModalOpen || singleSmsModalOrder) && (
        <BulkSmsDispatchModal
          isOpen={Boolean(isBulkSmsModalOpen || singleSmsModalOrder)}
          onClose={() => {
            setIsBulkSmsModalOpen(false);
            setSingleSmsModalOrder(null);
          }}
          selectedOrders={singleSmsModalOrder ? [singleSmsModalOrder] : selectedOrdersList}
          settings={settings}
          onSendSmsNotification={onSendSmsNotification}
          currencySymbol={currencySymbol}
        />
      )}

      {/* ১২. Steadfast লাইভ কুরিয়ার পার্সেল ট্র্যাকিং মডাল */}
      {trackingModalOrder && (
        <SteadfastLiveTrackingModal
          isOpen={Boolean(trackingModalOrder)}
          onClose={() => setTrackingModalOrder(null)}
          order={trackingModalOrder}
          onSteadfastCheckStatus={onSteadfastCheckStatus}
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
  initialOrder = null,
  onClose,
  products = [],
  settings = {},
  allOrders = [],
  onSaveOrder,
  showToast,
  currencySymbol = '৳'
}) {
  const isEditMode = Boolean(initialOrder);
  const [customerName, setCustomerName] = useState(initialOrder?.CustomerName || '');
  const [customerPhone, setCustomerPhone] = useState(initialOrder?.CustomerPhone || '');
  const [altPhone, setAltPhone] = useState(initialOrder?.AltPhone || '');
  const [customerAddress, setCustomerAddress] = useState(initialOrder?.CustomerAddress || '');
  const [district, setDistrict] = useState(initialOrder?.District || 'ঢাকা');
  const [orderSource, setOrderSource] = useState(initialOrder?.OrderSource || 'Facebook');
  const [courierName, setCourierName] = useState(initialOrder?.CourierName || 'Steadfast');
  const [trackingId, setTrackingId] = useState(initialOrder?.TrackingID || '');
  const [deliveryCharge, setDeliveryCharge] = useState(initialOrder?.DeliveryCharge ?? 70);
  const [discountAmount, setDiscountAmount] = useState(initialOrder?.DiscountAmount || 0);
  const [advancePaid, setAdvancePaid] = useState(initialOrder?.AdvancePaid || 0);
  const [paymentMethod, setPaymentMethod] = useState(initialOrder?.PaymentMethod || 'COD');
  const [transactionId, setTransactionId] = useState(initialOrder?.TransactionID || '');
  const [notes, setNotes] = useState(initialOrder?.Notes || '');
  const [reserveStock, setReserveStock] = useState(initialOrder?.StockReserved ?? true);
  const [isPreOrder, setIsPreOrder] = useState(initialOrder?.IsPreOrder ?? false);

  // পণ্য কার্ট স্টেট
  const [selectedItems, setSelectedItems] = useState(
    initialOrder?.Items && Array.isArray(initialOrder.Items)
      ? initialOrder.Items.map((item) => ({
          productId: item.productId || item.ProductID,
          productName: item.productName || item.ProductName,
          sellingPrice: Number(item.sellingPrice || item.SellingPrice) || 0,
          costPrice: Number(item.costPrice || item.CostPrice) || 0,
          quantity: Number(item.quantity || item.Quantity) || 1,
          unit: item.unit || item.Unit || 'Pcs'
        }))
      : []
  );
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

  // অর্ডার সোর্স পরিবর্তন হ্যান্ডলার (কাউন্টার সেল হলে স্বয়ংক্রিয় কাউন্টার পিকআপ ও ডেলিভারি ফি ০)
  const handleOrderSourceChange = (e) => {
    const src = e.target.value;
    setOrderSource(src);
    if (src === 'In-Store / POS' || src === 'Walk-in') {
      setCourierName('Counter Pickup');
      setDeliveryCharge(0);
      if (!customerAddress || customerAddress.trim() === '') {
        setCustomerAddress('কাউন্টার / শোরুম পিকআপ');
      }
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

    const orderData = {
      OrderID: initialOrder ? initialOrder.OrderID : `ORD-${Date.now().toString().slice(-6)}`,
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
      Status: initialOrder
        ? initialOrder.Status
        : (orderSource === 'In-Store / POS' || orderSource === 'Walk-in' || courierName === 'Counter Pickup')
        ? 'Delivered'
        : 'Pending',
      PaymentStatus: Number(advancePaid) >= totalAmount ? 'Paid' : Number(advancePaid) > 0 ? 'Partial' : 'Unpaid',
      PaymentMethod: paymentMethod,
      TransactionID: transactionId.trim(),
      RiskLevel: liveRisk.level,
      Notes: notes.trim(),
      StockReserved: isPreOrder ? false : reserveStock,
      IsPreOrder: isPreOrder,
      CreatedAt: initialOrder ? initialOrder.CreatedAt : new Date().toISOString(),
      UpdatedAt: new Date().toISOString(),
      ActivityLog: initialOrder
        ? [
            ...(initialOrder.ActivityLog || []),
            {
              timestamp: new Date().toISOString(),
              action: 'অর্ডারের বিবরণ, আইটেম ও পেমেন্ট আপডেট করা হয়েছে (সম্পাদনা)',
              actor: 'Admin'
            }
          ]
        : [
            {
              timestamp: new Date().toISOString(),
              action: 'নতুন ডেলিভারি অর্ডার তৈরি হয়েছে',
              actor: 'Admin'
            }
          ]
    };

    onSaveOrder(orderData);
    if (showToast) {
      showToast(isEditMode ? `অর্ডার ${orderData.OrderID} সফলভাবে আপডেট হয়েছে!` : `নতুন অর্ডার ${orderData.OrderID} নিশ্চিত করা হয়েছে!`, 'success');
    }
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
    <div className="fixed inset-0 z-50 bg-neutral-900/40 flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto border border-neutral-200/80 animate-in fade-in zoom-in-95">
        {/* মডাল হেডার */}
        <div className="p-4 sm:p-5 border-b border-neutral-200/80 flex items-center justify-between sticky top-0 bg-[#FAFAFA] z-10">
          <div className="flex items-center space-x-2.5">
            <div className={`w-9 h-9 rounded-md flex items-center justify-center border ${isEditMode ? 'bg-amber-50 text-[#B45309] border-amber-200/80' : 'bg-white text-[#0F172A] border-neutral-200/80'}`}>
              {isEditMode ? <Edit3 className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-base font-semibold tracking-tight text-[#111111]">
                {isEditMode ? <>অর্ডার সম্পাদনা: <span className="font-mono tabular-nums">{initialOrder.OrderID}</span></> : 'নতুন ডেলিভারি অর্ডার এন্ট্রি'}
              </h2>
              <p className="text-xs text-[#525252]">
                {isEditMode ? 'গ্রাহকের তথ্য, অর্ডারকৃত পণ্য বা পেমেন্ট আপডেট করুন' : 'অনলাইন বা ফোন কল অর্ডারের বিস্তারিত তথ্য দিন'}
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

        {/* ফর্ম কন্টেন্ট */}
        <form onSubmit={handleSubmit} className="p-5 space-y-6 bg-white">
          {/* লাইভ এআই রিস্ক সতর্কতা ব্যানার (যদি নম্বর বা অর্ডারে সমস্যা থাকে) */}
          {customerPhone.length >= 5 && liveRisk.level !== 'Low' && (
            <div className={`p-4 rounded-lg border text-xs space-y-1.5 animate-in fade-in ${
              liveRisk.level === 'High'
                ? 'bg-red-50 border-red-200/80 text-[#B91C1C]'
                : 'bg-amber-50 border-amber-200/80 text-[#B45309]'
            }`}>
              <div className="flex items-center space-x-2 font-semibold">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span>AI Risk Alert: {liveRisk.level === 'High' ? 'উচ্চ ঝুঁকি চিহ্নিত হয়েছে!' : 'সতর্কতা'}</span>
              </div>
              <ul className="list-disc list-inside space-y-0.5 text-[11px] font-medium">
                {liveRisk.flags.map((flag, idx) => (
                  <li key={idx}>{flag}</li>
                ))}
              </ul>
              <p className="text-[11px] font-semibold mt-1 text-[#111111]">
                পরামর্শ: {liveRisk.recommendation}
              </p>
            </div>
          )}

          {/* ১. কাস্টমার তথ্য */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#525252]">১. গ্রাহকের তথ্য</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-[#525252] mb-1">গ্রাহকের পুরো নাম *</label>
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="যেমন: মো. কামরুল হাসান"
                  className="w-full min-h-[44px] sm:min-h-[36px] px-3 py-2 bg-[#FAFAFA] border border-neutral-200/80 rounded-md text-xs sm:text-sm text-[#111111] focus:outline-none focus:bg-white focus:border-[#0F172A] focus:ring-1 focus:ring-[#0F172A] font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#525252] mb-1">মোবাইল নম্বর *</label>
                <input
                  type="tel"
                  required
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="01XXXXXXXXX"
                  className="w-full min-h-[44px] sm:min-h-[36px] px-3 py-2 bg-[#FAFAFA] border border-neutral-200/80 rounded-md text-xs sm:text-sm text-[#111111] focus:outline-none focus:bg-white focus:border-[#0F172A] focus:ring-1 focus:ring-[#0F172A] font-mono tabular-nums"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#525252] mb-1">বিকল্প মোবাইল নম্বর (ঐচ্ছিক)</label>
                <input
                  type="tel"
                  value={altPhone}
                  onChange={(e) => setAltPhone(e.target.value)}
                  placeholder="জরুরি যোগাযোগের নম্বর"
                  className="w-full min-h-[44px] sm:min-h-[36px] px-3 py-2 bg-[#FAFAFA] border border-neutral-200/80 rounded-md text-xs sm:text-sm text-[#111111] focus:outline-none focus:bg-white focus:border-[#0F172A] focus:ring-1 focus:ring-[#0F172A] font-mono tabular-nums"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#525252] mb-1">অর্ডার সোর্স</label>
                <select
                  value={orderSource}
                  onChange={handleOrderSourceChange}
                  className="w-full min-h-[44px] sm:min-h-[36px] px-3 py-2 bg-[#FAFAFA] border border-neutral-200/80 rounded-md text-xs sm:text-sm text-[#111111] focus:outline-none focus:bg-white focus:border-[#0F172A] font-medium cursor-pointer"
                >
                  {ORDER_SOURCES.map((s) => (
                    <option key={s.id} value={s.id}>{s.label}</option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-[#525252] mb-1">বিস্তারিত ডেলিভারি ঠিকানা *</label>
                <textarea
                  required
                  rows={2}
                  value={customerAddress}
                  onChange={(e) => setCustomerAddress(e.target.value)}
                  placeholder="বাসা নং, রোড নং, এলাকা, থানা ও ল্যান্ডমার্ক..."
                  className="w-full px-3 py-2 bg-[#FAFAFA] border border-neutral-200/80 rounded-md text-xs sm:text-sm text-[#111111] focus:outline-none focus:bg-white focus:border-[#0F172A] focus:ring-1 focus:ring-[#0F172A] font-medium"
                />
              </div>
            </div>
          </div>

          {/* ২. পণ্য নির্বাচন ও কার্ট */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[#525252]">২. অর্ডারকৃত পণ্যসমূহ</h3>
              <label className="flex items-center space-x-2 cursor-pointer bg-amber-50 px-2.5 py-1.5 rounded-md border border-amber-200/80">
                <input
                  type="checkbox"
                  checked={isPreOrder}
                  onChange={(e) => setIsPreOrder(e.target.checked)}
                  className="w-3.5 h-3.5 rounded accent-[#0F172A]"
                />
                <span className="text-[11px] font-medium text-[#B45309]">
                  প্রি-অর্ডার (Pre-Order) হিসেবে বুকিং করুন
                </span>
              </label>
            </div>
            
            {/* পণ্য অনুসন্ধান ও নির্বাচন */}
            <div className="relative">
              <Search className="w-4 h-4 text-[#737373] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                placeholder="পণ্যের নাম বা বারকোড লিখে অনুসন্ধান করুন..."
                className="w-full min-h-[44px] sm:min-h-[36px] pl-10 pr-4 py-2 bg-[#FAFAFA] border border-neutral-200/80 rounded-md text-xs sm:text-sm text-[#111111] placeholder-[#737373] focus:outline-none focus:bg-white focus:border-[#0F172A] focus:ring-1 focus:ring-[#0F172A] font-medium"
              />

              {searchedProducts.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-white rounded-lg border border-neutral-200/80 py-1.5 z-20 max-h-48 overflow-y-auto divide-y divide-neutral-200/80">
                  {searchedProducts.map((p) => (
                    <button
                      type="button"
                      key={p.ProductID}
                      onClick={() => handleAddItem(p)}
                      className="w-full min-h-[44px] sm:min-h-[36px] px-3 py-2 text-left hover:bg-[#F5F5F5] flex items-center justify-between text-xs cursor-pointer"
                    >
                      <div>
                        <span className="font-semibold text-[#111111] block">{p.ProductName}</span>
                        <span className={`text-[10px] font-mono tabular-nums ${Number(p.StockQuantity) <= 0 ? 'text-[#B91C1C] font-medium' : 'text-[#737373]'}`}>
                          {Number(p.StockQuantity) <= 0 ? 'স্টক শেষ (প্রি-অর্ডার সম্ভব)' : `স্টক: ${p.StockQuantity || 0} ${p.Unit || 'Pcs'}`}
                        </span>
                      </div>
                      <span className="font-semibold text-[#111111] font-mono tabular-nums">
                        {currencySymbol}{p.SellingPrice}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* নির্বাচিত পণ্যের তালিকা */}
            {selectedItems.length === 0 ? (
              <p className="text-xs text-[#737373] italic text-center py-2">
                এখনো কোনো পণ্য যোগ করা হয়নি। উপরের সার্চ বার থেকে পণ্য যোগ করুন।
              </p>
            ) : (
              <div className="bg-[#F5F5F5] rounded-lg p-3 border border-neutral-200/80 space-y-2">
                {selectedItems.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between bg-white p-2.5 rounded-md border border-neutral-200/80 text-xs">
                    <div className="flex-1 pr-2 min-w-0">
                      <span className="font-semibold text-[#111111] block truncate">{item.productName}</span>
                      <span className="text-[10px] text-[#737373] font-mono tabular-nums">
                        {currencySymbol}{item.sellingPrice} / {item.unit}
                      </span>
                    </div>

                    <div className="flex items-center space-x-2">
                      <div className="flex items-center border border-neutral-200/80 rounded-md overflow-hidden bg-[#FAFAFA]">
                        <button
                          type="button"
                          onClick={() => handleUpdateItemQuantity(idx, -1)}
                          className="min-h-[36px] px-2.5 py-1 text-[#111111] hover:bg-neutral-200/60 font-semibold cursor-pointer"
                        >
                          -
                        </button>
                        <span className="px-2 font-mono tabular-nums font-semibold text-[#111111] text-xs">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleUpdateItemQuantity(idx, 1)}
                          className="min-h-[36px] px-2.5 py-1 text-[#111111] hover:bg-neutral-200/60 font-semibold cursor-pointer"
                        >
                          +
                        </button>
                      </div>

                      <span className="font-semibold text-[#111111] font-mono tabular-nums w-16 text-right">
                        {currencySymbol}{item.sellingPrice * item.quantity}
                      </span>

                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        className="min-h-[36px] min-w-[36px] text-[#B91C1C] hover:bg-red-50 rounded-md p-1.5 flex items-center justify-center cursor-pointer"
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
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#525252]">৩. কুরিয়ার ও বিলিং হিসাব</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-[#525252] mb-1">কুরিয়ার নির্বাচন</label>
                <select
                  value={courierName}
                  onChange={handleCourierChange}
                  className="w-full min-h-[44px] sm:min-h-[36px] px-3 py-2 bg-[#FAFAFA] border border-neutral-200/80 rounded-md text-xs sm:text-sm text-[#111111] font-medium cursor-pointer focus:outline-none focus:bg-white focus:border-[#0F172A]"
                >
                  {COURIER_LIST.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#525252] mb-1">জেলা / শহর</label>
                <select
                  value={district}
                  onChange={handleDistrictChange}
                  className="w-full min-h-[44px] sm:min-h-[36px] px-3 py-2 bg-[#FAFAFA] border border-neutral-200/80 rounded-md text-xs sm:text-sm text-[#111111] font-medium cursor-pointer focus:outline-none focus:bg-white focus:border-[#0F172A]"
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
                <div className="flex items-center space-x-1 mt-1.5 overflow-x-auto">
                  <button
                    type="button"
                    onClick={() => handleDistrictChange({ target: { value: 'ঢাকা' } })}
                    className={`min-h-[36px] px-2.5 py-0.5 rounded-md text-[10px] font-medium border cursor-pointer transition-colors ${district === 'ঢাকা' ? 'border-[#0F172A] bg-[#0F172A] text-white' : 'bg-white text-[#525252] border-neutral-200/80 hover:bg-[#F5F5F5]'}`}
                  >
                    ঢাকা
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDistrictChange({ target: { value: 'চট্টগ্রাম' } })}
                    className={`min-h-[36px] px-2.5 py-0.5 rounded-md text-[10px] font-medium border cursor-pointer transition-colors ${district === 'চট্টগ্রাম' ? 'border-[#0F172A] bg-[#0F172A] text-white' : 'bg-white text-[#525252] border-neutral-200/80 hover:bg-[#F5F5F5]'}`}
                  >
                    চট্টগ্রাম
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDistrictChange({ target: { value: 'ঢাকার বাইরে' } })}
                    className={`min-h-[36px] px-2.5 py-0.5 rounded-md text-[10px] font-medium border cursor-pointer transition-colors ${district === 'ঢাকার বাইরে' ? 'border-[#0F172A] bg-[#0F172A] text-white' : 'bg-white text-[#525252] border-neutral-200/80 hover:bg-[#F5F5F5]'}`}
                  >
                    অন্যান্য জেলা
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#525252] mb-1">কুরিয়ার ট্র্যাকিং কোড (ঐচ্ছিক)</label>
                <input
                  type="text"
                  value={trackingId}
                  onChange={(e) => setTrackingId(e.target.value)}
                  placeholder="যেমন: STEAD-8921"
                  className="w-full min-h-[44px] sm:min-h-[36px] px-3 py-2 bg-[#FAFAFA] border border-neutral-200/80 rounded-md text-xs sm:text-sm text-[#111111] font-mono tabular-nums focus:outline-none focus:bg-white focus:border-[#0F172A]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#525252] mb-1">ডেলিভারি চার্জ (৳)</label>
                <input
                  type="number"
                  min="0"
                  value={deliveryCharge}
                  onChange={(e) => setDeliveryCharge(Number(e.target.value))}
                  className="w-full min-h-[44px] sm:min-h-[36px] px-3 py-2 bg-[#FAFAFA] border border-neutral-200/80 rounded-md text-xs sm:text-sm text-[#111111] font-mono tabular-nums font-semibold focus:outline-none focus:bg-white focus:border-[#0F172A]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#525252] mb-1">ছাড় / ডিসকাউন্ট (৳)</label>
                <input
                  type="number"
                  min="0"
                  value={discountAmount}
                  onChange={(e) => setDiscountAmount(Number(e.target.value))}
                  className="w-full min-h-[44px] sm:min-h-[36px] px-3 py-2 bg-[#FAFAFA] border border-neutral-200/80 rounded-md text-xs sm:text-sm text-[#111111] font-mono tabular-nums focus:outline-none focus:bg-white focus:border-[#0F172A]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#525252] mb-1">অগ্রিম পরিশোধ (৳)</label>
                <input
                  type="number"
                  min="0"
                  value={advancePaid}
                  onChange={(e) => setAdvancePaid(Number(e.target.value))}
                  className="w-full min-h-[44px] sm:min-h-[36px] px-3 py-2 bg-[#FAFAFA] border border-neutral-200/80 rounded-md text-xs sm:text-sm text-[#15803D] font-mono tabular-nums font-semibold focus:outline-none focus:bg-white focus:border-[#0F172A]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#525252] mb-1">পেমেন্ট মেথড</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full min-h-[44px] sm:min-h-[36px] px-3 py-2 bg-[#FAFAFA] border border-neutral-200/80 rounded-md text-xs sm:text-sm text-[#111111] font-medium cursor-pointer focus:outline-none focus:bg-white focus:border-[#0F172A]"
                >
                  <option value="COD">ক্যাশ অন ডেলিভারি (COD)</option>
                  <option value="bKash">বিকাশ (bKash)</option>
                  <option value="Nagad">নগদ (Nagad)</option>
                  <option value="Rocket">রকেট (Rocket)</option>
                  <option value="Bank">ব্যাংক ট্রান্সফার</option>
                  <option value="Cash">ক্যাশ পেমেন্ট</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#525252] mb-1">ট্রানজেকশন আইডি (TrxID) / রেফারেন্স</label>
                <input
                  type="text"
                  value={transactionId}
                  onChange={(e) => setTransactionId(e.target.value)}
                  placeholder="যেমন: 9J37A2KLM (যদি থাকে)"
                  className="w-full min-h-[44px] sm:min-h-[36px] px-3 py-2 bg-[#FAFAFA] border border-neutral-200/80 rounded-md text-xs sm:text-sm text-[#111111] font-mono focus:outline-none focus:bg-white focus:border-[#0F172A]"
                />
              </div>
            </div>

            {/* সংক্ষিপ্ত রসিদ কার্ড */}
            <div className="bg-[#0F172A] text-white rounded-lg p-4 flex flex-col sm:flex-row items-center justify-between gap-3 border border-slate-800">
              <div className="text-xs space-y-1 font-mono tabular-nums">
                <span className="text-slate-300 block">সাবটোটাল: {currencySymbol}{subTotal} | ডেলিভারি: +{currencySymbol}{deliveryCharge}</span>
                <span className="text-slate-300 block">অগ্রিম পরিশোধ: -{currencySymbol}{advancePaid}</span>
              </div>
              <div className="text-center sm:text-right">
                <span className="text-[10px] font-medium uppercase tracking-wider text-slate-300 block">ক্যাশ অন ডেলিভারি (সংগ্রহযোগ্য)</span>
                <span className="text-xl sm:text-2xl font-semibold text-white font-mono tabular-nums">
                  {currencySymbol}{dueAmount}
                </span>
              </div>
            </div>
          </div>

          {/* ডেলিভারি নির্দেশিকা ও স্টক রিজার্ভ */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-[#525252] mb-1">ডেলিভারি নোট / বিশেষ নির্দেশনা</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="যেমন: দুপুরের পর ডেলিভারি দিতে হবে"
                className="w-full min-h-[44px] sm:min-h-[36px] px-3 py-2 bg-[#FAFAFA] border border-neutral-200/80 rounded-md text-xs sm:text-sm text-[#111111] focus:outline-none focus:bg-white focus:border-[#0F172A]"
              />
            </div>

            {!isPreOrder && (
              <label className="flex items-center space-x-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={reserveStock}
                  onChange={(e) => setReserveStock(e.target.checked)}
                  className="w-4 h-4 rounded accent-[#0F172A] cursor-pointer"
                />
                <span className="text-xs font-medium text-[#111111]">
                  অর্ডার সেভ করার সাথে সাথে মূল ইনভেন্টরি থেকে স্টক স্বয়ংক্রিয়ভাবে মাইনাস (রিজার্ভ) করুন
                </span>
              </label>
            )}
          </div>

          {/* ফুটার অ্যাকশন বাটন */}
          <div className="flex items-center justify-end space-x-3 pt-3 border-t border-neutral-200/80">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] sm:min-h-[36px] px-4 py-2 text-xs font-medium text-[#111111] bg-white hover:bg-[#F5F5F5] border border-neutral-200/80 rounded-md cursor-pointer"
            >
              বাতিল
            </button>
            <button
              type="submit"
              className="min-h-[44px] sm:min-h-[36px] px-6 py-2 bg-[#0F172A] hover:bg-slate-800 text-white text-xs sm:text-sm font-medium rounded-md transition-colors cursor-pointer"
            >
              {isEditMode ? 'পরিবর্তন সংরক্ষণ করুন' : 'অর্ডার নিশ্চিত করুন'}
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
  onEditOrder,
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
    <div className="fixed inset-0 z-50 bg-neutral-900/40 flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-neutral-200/80 animate-in fade-in zoom-in-95">
        {/* হেডার */}
        <div className="p-4 sm:p-5 border-b border-neutral-200/80 flex items-center justify-between sticky top-0 bg-[#FAFAFA] z-10">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono tabular-nums font-semibold text-[#111111] text-base">
              {order.OrderID}
            </span>
            <span className={`px-2 py-0.5 rounded-md text-[10px] font-medium border ${statusObj.color}`}>
              {statusObj.label}
            </span>
            {order.IsPreOrder && (
              <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-amber-50 text-[#B45309] border border-amber-200/80">
                প্রি-অর্ডার
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="min-h-[44px] sm:min-h-[36px] min-w-[44px] sm:min-w-[36px] rounded-md hover:bg-neutral-200/60 text-[#525252] hover:text-[#111111] flex items-center justify-center cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-6 bg-white">
          {/* এআই ফ্রড ও রিস্ক কার্ড (AI Risk Card) */}
          <div className={`p-4 rounded-lg border text-xs space-y-2 ${
            risk.level === 'High'
              ? 'bg-red-50 border-red-200/80 text-[#B91C1C]'
              : risk.level === 'Medium'
              ? 'bg-amber-50 border-amber-200/80 text-[#B45309]'
              : 'bg-emerald-50 border-emerald-200/80 text-[#15803D]'
          }`}>
            <div className="flex items-center justify-between font-semibold">
              <div className="flex items-center space-x-2">
                {risk.level === 'High' ? (
                  <AlertTriangle className="w-4 h-4 text-[#B91C1C]" />
                ) : risk.level === 'Medium' ? (
                  <Clock className="w-4 h-4 text-[#B45309]" />
                ) : (
                  <ShieldCheck className="w-4 h-4 text-[#15803D]" />
                )}
                <span>AI Risk Assessment: {risk.level === 'High' ? 'উচ্চ ঝুঁকি (High Risk)' : risk.level === 'Medium' ? 'মাঝারি সতর্কতা (Medium Risk)' : 'নিরাপদ অর্ডার (Low Risk)'}</span>
              </div>
              <span className="font-mono tabular-nums text-xs">স্কোর: {risk.score}/100</span>
            </div>

            {risk.flags.length > 0 && (
              <ul className="list-disc list-inside space-y-0.5 text-[11px] font-medium">
                {risk.flags.map((flag, idx) => (
                  <li key={idx}>{flag}</li>
                ))}
              </ul>
            )}

            <p className="text-[11px] font-semibold text-[#111111] pt-1.5 border-t border-neutral-200/80">
              সুপারিশ: {risk.recommendation}
            </p>
          </div>

          {/* আরএমএ রিটার্ন আবেদন ব্যানার (যদি গ্রাহক আবেদন করে থাকে) */}
          {order.RmaRequest && (
            <div className="bg-amber-50 p-4 rounded-lg border border-amber-200/80 space-y-2 text-xs">
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-[#B45309] flex items-center space-x-1.5">
                  <RotateCcw className="w-4 h-4" />
                  <span>গ্রাহক কর্তৃক {order.RmaRequest.type === 'Exchange' ? 'এক্সচেঞ্জ' : 'রিটার্ন'} আবেদন</span>
                </span>
                <span className="font-medium px-2 py-0.5 bg-white text-[#B45309] border border-amber-200/80 rounded-md text-[10px]">
                  স্ট্যাটাস: {order.RmaRequest.status}
                </span>
              </div>
              <p className="text-[#111111]">কারণ: <strong>{order.RmaRequest.reason}</strong></p>
              {order.RmaRequest.details && (
                <p className="text-[#525252] italic">"{order.RmaRequest.details}"</p>
              )}

              {order.RmaRequest.status === 'Pending' && (
                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-amber-200/80">
                  <button
                    onClick={handleApproveRma}
                    className="min-h-[44px] sm:min-h-[36px] px-3 py-1.5 bg-[#15803D] hover:bg-emerald-800 text-white rounded-md font-medium cursor-pointer transition-colors"
                  >
                    রিটার্ন অনুমোদন ও রিস্টক করুন
                  </button>
                  <button
                    onClick={handleRejectRma}
                    className="min-h-[44px] sm:min-h-[36px] px-3 py-1.5 bg-[#B91C1C] hover:bg-red-800 text-white rounded-md font-medium cursor-pointer transition-colors"
                  >
                    আবেদন প্রত্যাখ্যান করুন
                  </button>
                </div>
              )}
            </div>
          )}

          {/* গ্রাহক ও শিপিং তথ্য */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-[#F5F5F5] p-4 rounded-lg border border-neutral-200/80 text-xs">
            <div>
              <span className="text-[10px] font-medium uppercase tracking-wider text-[#737373] block">গ্রাহকের বিবরণ</span>
              <span className="text-sm font-semibold text-[#111111] mt-1 block">{order.CustomerName}</span>
              <div className="flex items-center space-x-2 mt-1">
                <a
                  href={`tel:${order.CustomerPhone}`}
                  className="text-[#525252] hover:text-[#0F172A] font-mono tabular-nums text-xs flex items-center space-x-1"
                >
                  <Phone className="w-3 h-3 text-[#737373]" />
                  <span>{order.CustomerPhone}</span>
                </a>
                <button
                  type="button"
                  onClick={() => openOrderWhatsApp(order, 'Pabna Bostraloy', currencySymbol)}
                  className="px-2 py-0.5 bg-emerald-50 hover:bg-emerald-100 text-[#15803D] border border-emerald-200/80 rounded-md text-[10px] font-medium flex items-center space-x-1 cursor-pointer transition-colors"
                  title="হোয়াটসঅ্যাপে সরাসরি মেসেজ পাঠান"
                >
                  <MessageCircle className="w-3 h-3" />
                  <span>WhatsApp</span>
                </button>
              </div>
              {order.AltPhone && (
                <span className="text-[#525252] font-mono tabular-nums text-[11px] block mt-0.5">বিকল্প: {order.AltPhone}</span>
              )}
            </div>

            <div>
              <span className="text-[10px] font-medium uppercase tracking-wider text-[#737373] block">ডেলিভারি ঠিকানা</span>
              <span className="text-[#111111] mt-1 block font-medium leading-relaxed">
                {order.CustomerAddress || 'ঠিকানা দেওয়া হয়নি'}
              </span>
              <span className="text-[#525252] text-[11px] font-medium mt-1 block">
                জেলা: {order.District || 'ঢাকা'} | সোর্স: {order.OrderSource}
              </span>
            </div>
          </div>

          {/* স্ট্যাটাস ও ট্র্যাকিং আপডেট সেকশন */}
          <div className="bg-[#FAFAFA] p-4 rounded-lg border border-neutral-200/80 space-y-3">
            <span className="text-xs font-semibold text-[#111111] block">স্ট্যাটাস ও কুরিয়ার আপডেট করুন</span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-[#525252] mb-1">অর্ডার স্ট্যাটাস</label>
                <select
                  value={currentStatus}
                  onChange={(e) => setCurrentStatus(e.target.value)}
                  className="w-full min-h-[44px] sm:min-h-[36px] px-3 py-2 bg-white border border-neutral-200/80 rounded-md text-xs font-medium text-[#111111] focus:outline-none focus:border-[#0F172A]"
                >
                  {ORDER_STATUSES.map((s) => (
                    <option key={s.id} value={s.id}>{s.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-[#525252] mb-1">কুরিয়ার</label>
                <select
                  value={courierName}
                  onChange={(e) => setCourierName(e.target.value)}
                  className="w-full min-h-[44px] sm:min-h-[36px] px-3 py-2 bg-white border border-neutral-200/80 rounded-md text-xs font-medium text-[#111111] focus:outline-none focus:border-[#0F172A]"
                >
                  {COURIER_LIST.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-[#525252] mb-1">ট্র্যাকিং কোড</label>
                <input
                  type="text"
                  value={trackingId}
                  onChange={(e) => setTrackingId(e.target.value)}
                  placeholder="Tracking ID"
                  className="w-full min-h-[44px] sm:min-h-[36px] px-3 py-2 bg-white border border-neutral-200/80 rounded-md text-xs font-mono tabular-nums text-[#111111] focus:outline-none focus:border-[#0F172A]"
                />
              </div>
            </div>

            {currentStatus === 'Returned' && (
              <p className="text-[11px] text-[#B91C1C] bg-red-50 p-2.5 rounded-md border border-red-200/80 font-medium">
                সতর্কতা: স্ট্যাটাস "রিটার্ন" করলে অর্ডারকৃত পণ্যগুলো স্বয়ংক্রিয়ভাবে মূল ইনভেন্টরি স্টকে ফেরত আনা হবে।
              </p>
            )}

            <button
              onClick={handleSaveStatus}
              className="min-h-[44px] sm:min-h-[36px] px-4 py-1.5 bg-[#0F172A] hover:bg-slate-800 text-white rounded-md text-xs font-medium cursor-pointer transition-colors"
            >
              পরিবর্তন সংরক্ষণ করুন
            </button>
          </div>

          {/* পণ্যের তালিকা */}
          <div className="space-y-2">
            <span className="text-xs font-semibold text-[#111111] block">অর্ডারকৃত পণ্যসমূহ</span>
            <div className="border border-neutral-200/80 rounded-lg overflow-hidden divide-y divide-neutral-200/80 text-xs bg-white">
              {(order.Items || []).map((item, idx) => (
                <div key={idx} className="p-3 flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-[#111111] block">{item.productName || item.ProductName}</span>
                    <span className="text-[10px] text-[#737373] font-mono tabular-nums">
                      {currencySymbol}{item.sellingPrice} × {item.quantity} {item.unit || 'Pcs'}
                    </span>
                  </div>
                  <span className="font-semibold text-[#111111] font-mono tabular-nums">
                    {currencySymbol}{Number(item.sellingPrice) * Number(item.quantity)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* আর্থিক হিসাব */}
          <div className="bg-[#F5F5F5] p-4 rounded-lg border border-neutral-200/80 space-y-1.5 text-xs">
            <div className="flex justify-between text-[#525252]">
              <span>সাবটোটাল:</span>
              <span className="font-mono tabular-nums text-[#111111]">{currencySymbol}{order.SubTotal}</span>
            </div>
            {order.DeliveryCharge > 0 && (
              <div className="flex justify-between text-[#525252]">
                <span>ডেলিভারি চার্জ:</span>
                <span className="font-mono tabular-nums text-[#111111]">+{currencySymbol}{order.DeliveryCharge}</span>
              </div>
            )}
            {order.DiscountAmount > 0 && (
              <div className="flex justify-between text-[#15803D] font-medium">
                <span>ছাড় / ডিসকাউন্ট:</span>
                <span className="font-mono tabular-nums">-{currencySymbol}{order.DiscountAmount}</span>
              </div>
            )}
            <div className="flex justify-between font-semibold text-[#111111] pt-1.5 border-t border-neutral-200/80">
              <span>সর্বমোট মূল্য:</span>
              <span className="font-mono tabular-nums text-sm">{currencySymbol}{order.TotalAmount}</span>
            </div>
            {order.AdvancePaid > 0 && (
              <div className="flex justify-between text-[#15803D] font-medium">
                <span>অগ্রিম পরিশোধিত:</span>
                <span className="font-mono tabular-nums">-{currencySymbol}{order.AdvancePaid}</span>
              </div>
            )}
            <div className="flex justify-between font-semibold text-[#B91C1C] text-sm pt-1.5 border-t border-neutral-200/80">
              <span>ক্যাশ অন ডেলিভারি (বাকি):</span>
              <span className="font-mono tabular-nums">{currencySymbol}{order.DueAmount}</span>
            </div>
            <div className="flex justify-between text-[#525252] pt-1.5 border-t border-neutral-200/80 text-[11px]">
              <span>পেমেন্ট মাধ্যম:</span>
              <span className="font-semibold text-[#111111]">{order.PaymentMethod || 'COD'}</span>
            </div>
            {order.TransactionID && (
              <div className="flex justify-between text-[#525252] text-[11px]">
                <span>ট্রানজেকশন আইডি (TrxID):</span>
                <span className="font-mono tabular-nums font-semibold text-[#111111] bg-white px-1.5 py-0.5 rounded-md border border-neutral-200/80">{order.TransactionID}</span>
              </div>
            )}
          </div>

          {/* টাইমলাইন অডিট লগ (Audit Activity History) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#111111] flex items-center space-x-1.5 uppercase tracking-wider">
                <History className="w-4 h-4 text-[#0F172A]" />
                <span>অর্ডার অ্যাক্টিভিটি টাইমলাইন (Audit Trail)</span>
              </span>
              <span className="text-[10px] text-[#737373] font-mono tabular-nums">
                {(order.ActivityLog || []).length || 1}টি ইভেন্ট
              </span>
            </div>

            <div className="bg-[#FAFAFA] p-4 sm:p-5 rounded-lg border border-neutral-200/80 relative">
              <div className="relative pl-5 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-neutral-300">
                {(order.ActivityLog || [
                  { timestamp: order.CreatedAt, action: 'অর্ডার তৈরি হয়েছে', actor: order.CreatedBy || 'Admin' }
                ]).map((log, idx) => (
                  <div key={idx} className="relative group">
                    <div className="absolute -left-5 top-1.5 w-2.5 h-2.5 rounded-full bg-[#0F172A] ring-4 ring-neutral-200" />
                    <div>
                      <span className="font-semibold text-[#111111] text-xs block">{log.action}</span>
                      <div className="flex items-center space-x-2 mt-0.5">
                        <span className="text-[10px] text-[#737373] font-mono tabular-nums">
                          {new Date(log.timestamp).toLocaleString('bn-BD')}
                        </span>
                        <span className="text-[9px] px-1.5 py-0.5 bg-white border border-neutral-200/80 text-[#525252] rounded-md font-medium">
                          {log.actor || 'Admin'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* প্রিন্ট ও ট্র্যাকিং প্রিভিউ অপশনসমূহ */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
            {onEditOrder && (
              <button
                onClick={onEditOrder}
                className="min-h-[44px] sm:min-h-[36px] py-2 bg-amber-50 hover:bg-amber-100 border border-amber-200/80 text-[#B45309] font-medium rounded-md text-xs flex items-center justify-center space-x-1.5 transition-colors cursor-pointer"
              >
                <Edit3 className="w-4 h-4" />
                <span>এডিট করুন</span>
              </button>
            )}

            <button
              onClick={onOpenCustomerTracking}
              className="min-h-[44px] sm:min-h-[36px] py-2 bg-[#F5F5F5] hover:bg-neutral-200/70 border border-neutral-200/80 text-[#111111] font-medium rounded-md text-xs flex items-center justify-center space-x-1.5 transition-colors cursor-pointer"
            >
              <Truck className="w-4 h-4" />
              <span>লাইভ ট্র্যাক</span>
            </button>

            <button
              onClick={onPrintLabel}
              className="min-h-[44px] sm:min-h-[36px] py-2 bg-[#F5F5F5] hover:bg-neutral-200/70 border border-neutral-200/80 text-[#111111] font-medium rounded-md text-xs flex items-center justify-center space-x-1.5 transition-colors cursor-pointer"
            >
              <Tag className="w-4 h-4" />
              <span>কুরিয়ার স্টিকার</span>
            </button>

            <button
              onClick={onPrintChallan}
              className="min-h-[44px] sm:min-h-[36px] py-2 bg-[#0F172A] hover:bg-slate-800 text-white font-medium rounded-md text-xs flex items-center justify-center space-x-1.5 transition-colors cursor-pointer"
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
    <div className="fixed inset-0 z-50 bg-neutral-900/40 flex items-center justify-center p-3 overflow-y-auto">
      <div className="bg-white rounded-lg max-w-md w-full border border-neutral-200/80 overflow-hidden animate-in fade-in zoom-in-95">
        <div className="p-4 border-b border-neutral-200/80 bg-[#FAFAFA] flex items-center justify-between no-print">
          <span className="text-xs font-semibold text-[#111111]">কুরিয়ার শিপিং লেবেল প্রিভিউ</span>
          <button onClick={onClose} className="min-h-[44px] sm:min-h-[36px] min-w-[44px] sm:min-w-[36px] p-1 hover:bg-neutral-200/60 text-[#525252] rounded-md cursor-pointer flex items-center justify-center">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* প্রিন্টেবল লেবেল এলাকা */}
        <div className="p-6 bg-white font-sans text-[#111111]" id="shipping-label-printable">
          <div className="border-2 border-[#0F172A] rounded-lg p-4 space-y-3">
            {/* প্রেরক ও কুরিয়ার হেডার */}
            <div className="flex items-center justify-between border-b-2 border-[#0F172A] pb-2.5">
              <div>
                <span className="text-sm font-semibold text-[#111111] block uppercase tracking-tight">
                  {settings.StoreName || 'Pabna Bostraloy'}
                </span>
                <span className="text-[10px] text-[#525252] font-mono tabular-nums block mt-0.5">
                  মোবাইল: {settings.Phone || '01675934919'}
                </span>
              </div>
              <div className="text-right">
                <span className="text-xs font-semibold text-white bg-[#0F172A] px-2 py-0.5 rounded-md inline-block">
                  {order.CourierName}
                </span>
                <span className="text-[9px] text-[#525252] block font-mono tabular-nums mt-0.5">
                  {order.OrderID}
                </span>
              </div>
            </div>

            {/* প্রাপক / গ্রাহক বক্স */}
            <div className="bg-[#F5F5F5] p-3 rounded-md border border-neutral-300">
              <span className="text-[10px] font-medium text-[#525252] uppercase tracking-wider block">প্রাপক / To:</span>
              <span className="text-base font-semibold text-[#111111] mt-0.5 block">{order.CustomerName}</span>
              <span className="text-xs font-semibold text-[#111111] font-mono tabular-nums block mt-0.5">
                মোবাইল: {order.CustomerPhone} {order.AltPhone ? `| ${order.AltPhone}` : ''}
              </span>
              <span className="text-xs text-[#111111] font-medium block mt-1 leading-snug">
                {order.CustomerAddress}
              </span>
              <span className="text-[11px] font-semibold text-[#111111] block mt-1">
                জেলা: {order.District || 'ঢাকা'}
              </span>
            </div>

            {/* বিশাল COD এমাউন্ট ব্যানার */}
            <div className="bg-[#0F172A] text-white p-3 rounded-md text-center">
              <span className="text-[10px] font-medium uppercase tracking-wider text-slate-300 block">
                ক্যাশ অন ডেলিভারি (সংগ্রহযোগ্য টাকা)
              </span>
              <span className="text-2xl font-semibold block mt-0.5 font-mono tabular-nums">
                {currencySymbol} {order.DueAmount}
              </span>
            </div>

            {/* প্যাকেজ আইটেম সারসংক্ষেপ ও বারকোড সিমুলেশন */}
            <div className="pt-2 border-t border-neutral-200/80 flex items-center justify-between text-[10px]">
              <div>
                <span className="text-[#525252] font-medium block">পণ্য সংখ্যা:</span>
                <span className="font-semibold font-mono tabular-nums text-[#111111]">{(order.Items || []).length}টি আইটেম</span>
              </div>
              <div className="text-right">
                <span className="text-[#737373] font-mono tabular-nums text-[9px] block">
                  {new Date(order.CreatedAt).toLocaleDateString('bn-BD')}
                </span>
                <span className="text-[10px] font-semibold font-mono tabular-nums text-[#111111] block">
                  {order.TrackingID || order.OrderID}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* প্রিন্ট অ্যাকশন বাটন */}
        <div className="p-4 bg-[#FAFAFA] border-t border-neutral-200/80 flex items-center justify-end space-x-3 no-print">
          <button
            onClick={onClose}
            className="min-h-[44px] sm:min-h-[36px] px-4 py-2 text-xs font-medium text-[#111111] bg-white hover:bg-[#F5F5F5] border border-neutral-200/80 rounded-md cursor-pointer"
          >
            বন্ধ করুন
          </button>
          <button
            onClick={handlePrint}
            className="min-h-[44px] sm:min-h-[36px] px-5 py-2 bg-[#0F172A] hover:bg-slate-800 text-white text-xs font-medium rounded-md flex items-center space-x-2 cursor-pointer"
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
    <div className="fixed inset-0 z-50 bg-neutral-900/40 flex items-center justify-center p-3 overflow-y-auto">
      <div className="bg-white rounded-lg max-w-xl w-full border border-neutral-200/80 overflow-hidden animate-in fade-in zoom-in-95">
        <div className="p-4 border-b border-neutral-200/80 bg-[#FAFAFA] flex items-center justify-between no-print">
          <span className="text-xs font-semibold text-[#111111]">ডেলিভারি চালান প্রিভিউ</span>
          <button onClick={onClose} className="min-h-[44px] sm:min-h-[36px] min-w-[44px] sm:min-w-[36px] p-1 hover:bg-neutral-200/60 text-[#525252] rounded-md cursor-pointer flex items-center justify-center">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* চালান কন্টেন্ট */}
        <div className="p-6 bg-white font-sans text-[#111111] space-y-4" id="delivery-challan-printable">
          {/* হেডার */}
          <div className="text-center border-b-2 border-[#0F172A] pb-3">
            <h2 className="text-xl font-semibold tracking-tight text-[#111111] uppercase">
              {settings.StoreName || 'Pabna Bostraloy'}
            </h2>
            <p className="text-xs text-[#525252] mt-0.5">{settings.Address}</p>
            <p className="text-xs text-[#525252] font-mono tabular-nums">মোবাইল: {settings.Phone} | ইমেইল: {settings.Email}</p>
            <span className="inline-block mt-2 px-3 py-0.5 bg-[#0F172A] text-white rounded-md text-xs font-medium uppercase tracking-wider">
              ডেলিভারি চালান / Delivery Challan
            </span>
          </div>

          {/* মেমো ইনফো ও কাস্টমার */}
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <span className="font-medium text-[#737373] block text-[10px] uppercase">গ্রাহকের নাম ও ঠিকানা:</span>
              <span className="font-semibold text-[#111111] block mt-0.5">{order.CustomerName}</span>
              <span className="text-[#525252] font-mono tabular-nums block">{order.CustomerPhone}</span>
              <span className="text-[#525252] block mt-0.5 leading-snug">{order.CustomerAddress}</span>
            </div>

            <div className="text-right">
              <span className="font-medium text-[#737373] block text-[10px] uppercase">চালান বিবরণ:</span>
              <span className="font-mono tabular-nums font-semibold text-[#111111] block mt-0.5">অর্ডার: {order.OrderID}</span>
              <span className="text-[#525252] font-mono tabular-nums block text-[11px]">
                তারিখ: {new Date(order.CreatedAt).toLocaleDateString('bn-BD')}
              </span>
              <span className="text-[#525252] block text-[11px]">
                কুরিয়ার: <strong className="text-[#111111]">{order.CourierName}</strong>
              </span>
            </div>
          </div>

          {/* পণ্যের টেবিল */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs border border-neutral-300">
              <thead>
                <tr className="bg-[#F5F5F5] border-b border-neutral-300 text-[#111111] font-semibold">
                  <th className="p-2 text-center w-10">নং</th>
                  <th className="p-2 text-left">পণ্যের বিবরণ</th>
                  <th className="p-2 text-center w-16">পরিমাণ</th>
                  <th className="p-2 text-right w-20">দর</th>
                  <th className="p-2 text-right w-24">মোট</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 font-medium">
                {(order.Items || []).map((item, idx) => (
                  <tr key={idx}>
                    <td className="p-2 text-center font-mono tabular-nums text-[#737373]">{idx + 1}</td>
                    <td className="p-2 font-semibold text-[#111111]">{item.productName || item.ProductName}</td>
                    <td className="p-2 text-center font-mono tabular-nums">{item.quantity} {item.unit || 'Pcs'}</td>
                    <td className="p-2 text-right font-mono tabular-nums">{currencySymbol}{item.sellingPrice}</td>
                    <td className="p-2 text-right font-mono tabular-nums font-semibold">{currencySymbol}{item.sellingPrice * item.quantity}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-neutral-300">
                  <td colSpan={4} className="p-2 text-right font-medium text-[#525252]">সাবটোটাল:</td>
                  <td className="p-2 text-right font-mono tabular-nums font-semibold">{currencySymbol}{order.SubTotal}</td>
                </tr>
                {order.DeliveryCharge > 0 && (
                  <tr>
                    <td colSpan={4} className="p-2 text-right font-medium text-[#525252]">ডেলিভারি চার্জ:</td>
                    <td className="p-2 text-right font-mono tabular-nums font-semibold">+{currencySymbol}{order.DeliveryCharge}</td>
                  </tr>
                )}
                {order.AdvancePaid > 0 && (
                  <tr>
                    <td colSpan={4} className="p-2 text-right font-medium text-[#15803D]">অগ্রিম পরিশোধ:</td>
                    <td className="p-2 text-right font-mono tabular-nums font-semibold text-[#15803D]">-{currencySymbol}{order.AdvancePaid}</td>
                  </tr>
                )}
                <tr className="bg-[#F5F5F5] font-semibold">
                  <td colSpan={4} className="p-2 text-right text-[#B91C1C]">ক্যাশ অন ডেলিভারি (বাকি):</td>
                  <td className="p-2 text-right font-mono tabular-nums text-[#B91C1C] text-sm">{currencySymbol}{order.DueAmount}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* স্বাক্ষর ও নোট */}
          <div className="pt-8 flex items-center justify-between text-xs text-[#525252]">
            <div className="text-center">
              <div className="w-28 border-t border-neutral-400 mb-1" />
              <span>ক্রেতার স্বাক্ষর</span>
            </div>
            <div className="text-center">
              <div className="w-28 border-t border-neutral-400 mb-1" />
              <span>কর্তৃপক্ষের স্বাক্ষর</span>
            </div>
          </div>
        </div>

        {/* প্রিন্ট অ্যাকশন বাটন */}
        <div className="p-4 bg-[#FAFAFA] border-t border-neutral-200/80 flex items-center justify-end space-x-3 no-print">
          <button
            onClick={onClose}
            className="min-h-[44px] sm:min-h-[36px] px-4 py-2 text-xs font-medium text-[#111111] bg-white hover:bg-[#F5F5F5] border border-neutral-200/80 rounded-md cursor-pointer"
          >
            বন্ধ করুন
          </button>
          <button
            onClick={handlePrint}
            className="min-h-[44px] sm:min-h-[36px] px-5 py-2 bg-[#0F172A] hover:bg-slate-800 text-white text-xs font-medium rounded-md flex items-center space-x-2 cursor-pointer"
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
 * সাব-কম্পোনেন্ট ৫: বাল্ক শিপিং লেবেল প্রিন্ট মডাল (BulkShippingLabelsModal)
 * ============================================================================
 */
function BulkShippingLabelsModal({
  isOpen,
  orders = [],
  settings = {},
  onClose,
  currencySymbol = '৳'
}) {
  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-neutral-900/40 flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-neutral-200/80 animate-in fade-in zoom-in-95 flex flex-col">
        {/* হেডার */}
        <div className="p-4 border-b border-neutral-200/80 flex items-center justify-between no-print sticky top-0 bg-[#FAFAFA] z-10">
          <div>
            <h3 className="text-sm font-semibold tracking-tight text-[#111111]">
              বাল্ক শিপিং লেবেল প্রিন্ট (<span className="font-mono tabular-nums">{orders.length}</span>টি পার্সেল)
            </h3>
            <p className="text-xs text-[#525252]">
              স্টিকার পেপারে প্রিন্ট করার উপযোগী ২-কলাম গ্রিড লেআউট
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handlePrint}
              className="min-h-[44px] sm:min-h-[36px] px-4 py-2 bg-[#0F172A] hover:bg-slate-800 text-white text-xs font-medium rounded-md flex items-center space-x-1.5 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>একসাথে প্রিন্ট করুন</span>
            </button>
            <button
              onClick={onClose}
              className="min-h-[44px] sm:min-h-[36px] min-w-[44px] sm:min-w-[36px] p-1.5 hover:bg-neutral-200/60 text-[#525252] hover:text-[#111111] rounded-md cursor-pointer flex items-center justify-center"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* প্রিন্ট এলাকা: ২-কলাম স্টিকার শিট */}
        <div className="p-6 overflow-y-auto flex-1 bg-[#FAFAFA]" id="bulk-shipping-labels-printable">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {orders.map((order) => {
              const formattedDate = new Date(order.CreatedAt || order.OrderDate || Date.now()).toLocaleDateString('bn-BD', {
                day: 'numeric',
                month: 'short',
                year: 'numeric'
              });

              return (
                <div
                  key={order.OrderID}
                  className="bg-white border-2 border-[#0F172A] rounded-lg p-4 text-[#111111] space-y-3 print:break-inside-avoid print:mb-4"
                >
                  {/* প্রেরক ও কুরিয়ার */}
                  <div className="flex items-center justify-between border-b-2 border-[#0F172A] pb-2">
                    <div>
                      <span className="text-[9px] font-medium text-[#525252] uppercase block tracking-wider">প্রেরক / FROM:</span>
                      <strong className="text-xs font-semibold block">{settings.StoreName || 'Pabna Bostraloy'}</strong>
                      <span className="text-[10px] text-[#525252] font-mono tabular-nums block">{settings.Phone || '01712345678'}</span>
                    </div>
                    <div className="text-right">
                      <span className="inline-block px-2.5 py-0.5 bg-[#0F172A] text-white rounded-md text-[10px] font-medium uppercase">
                        {order.CourierName || 'Steadfast'}
                      </span>
                      <span className="text-[9px] font-mono tabular-nums block text-[#525252] mt-0.5">{formattedDate}</span>
                    </div>
                  </div>

                  {/* প্রাপক / গ্রাহক */}
                  <div className="space-y-1">
                    <span className="text-[9px] font-medium text-[#525252] uppercase tracking-wider block">প্রাপক / TO (CUSTOMER):</span>
                    <strong className="text-sm font-semibold text-[#111111] block leading-tight">{order.CustomerName}</strong>
                    <span className="font-mono tabular-nums text-xs font-semibold text-[#111111] block">{order.CustomerPhone}</span>
                    {order.AltPhone && (
                      <span className="font-mono tabular-nums text-[10px] text-[#525252] block">বিকল্প: {order.AltPhone}</span>
                    )}
                    <p className="text-xs text-[#525252] leading-snug pt-0.5">{order.CustomerAddress}</p>
                    <span className="text-[10px] font-semibold text-[#111111] block">জেলা: {order.District || 'ঢাকা'}</span>
                  </div>

                  {/* COD সংগ্রহযোগ্য টাকা */}
                  <div className="bg-[#F5F5F5] rounded-md p-2.5 text-center border border-neutral-300">
                    <span className="text-[9px] font-medium text-[#525252] uppercase tracking-wider block">
                      ক্যাশ অন ডেলিভারি (সংগ্রহযোগ্য টাকা)
                    </span>
                    <span className="text-xl font-semibold block mt-0.5 font-mono tabular-nums text-[#B91C1C]">
                      {currencySymbol} {Number(order.DueAmount || 0).toLocaleString('en-US')}
                    </span>
                  </div>

                  {/* প্যাকেজ ও ট্র্যাকিং কোড */}
                  <div className="pt-2 border-t border-neutral-200/80 flex items-center justify-between text-[10px]">
                    <div>
                      <span className="text-[#525252] font-medium block font-mono tabular-nums">পণ্য: {(order.Items || []).length}টি আইটেম</span>
                      {order.Notes && (
                        <span className="text-[#525252] text-[9px] italic block truncate max-w-[160px]">
                          নোট: {order.Notes}
                        </span>
                      )}
                    </div>
                    <div className="text-right">
                      <span className="font-mono tabular-nums font-semibold text-[#111111] text-[11px] block">
                        {order.TrackingID || order.OrderID}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ফুটার */}
        <div className="p-4 bg-[#FAFAFA] border-t border-neutral-200/80 flex items-center justify-end space-x-3 no-print">
          <button
            onClick={onClose}
            className="min-h-[44px] sm:min-h-[36px] px-4 py-2 text-xs font-medium text-[#111111] bg-white hover:bg-[#F5F5F5] border border-neutral-200/80 rounded-md cursor-pointer"
          >
            বন্ধ করুন
          </button>
          <button
            onClick={handlePrint}
            className="min-h-[44px] sm:min-h-[36px] px-5 py-2 bg-[#0F172A] hover:bg-slate-800 text-white text-xs font-medium rounded-md flex items-center space-x-2 cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>প্রিন্ট করুন</span>
          </button>
        </div>
      </div>
    </div>
  );
}
