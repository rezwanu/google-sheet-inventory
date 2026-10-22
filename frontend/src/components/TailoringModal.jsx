import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  Scissors,
  Plus,
  Search,
  Filter,
  Calendar,
  Clock,
  Printer,
  Share2,
  CheckCircle,
  AlertCircle,
  User,
  Phone,
  MapPin,
  ChevronRight,
  Sparkles,
  Shirt,
  DollarSign,
  Layers,
  ArrowRight,
  RotateCcw,
  Trash2,
  Edit3,
  Check,
  Send,
  Eye,
  Tag,
  UserCheck,
  History
} from 'lucide-react';
import { formatBdPhoneForWhatsApp } from '../utils/whatsappUtils';
import { playCashChime, playWarningBeep } from '../utils/soundEffects';

// পোশাকের ধরণ অনুযায়ী প্রিসেট মাপের তালিকা
export const GARMENT_PRESETS = {
  'পাঞ্জাবি': {
    name: 'পাঞ্জাবি (Panjabi)',
    icon: '👔',
    fields: [
      { key: 'length', label: 'ঝুল (Length)', placeholder: '৪০', defaultVal: '40' },
      { key: 'chest', label: 'ছাতি (Chest)', placeholder: '৩৮', defaultVal: '38' },
      { key: 'waist', label: 'কোমর (Waist)', placeholder: '৩৬', defaultVal: '36' },
      { key: 'shoulder', label: 'তিড়া / পুট (Shoulder)', placeholder: '১৭', defaultVal: '17' },
      { key: 'sleeve', label: 'হাতা (Sleeve)', placeholder: '২৪', defaultVal: '24' },
      { key: 'collar', label: 'কলার (Collar)', placeholder: '১৫.৫', defaultVal: '15.5' },
      { key: 'armhole', label: 'মোহড়া (Armhole)', placeholder: '১৮', defaultVal: '18' },
      { key: 'cuff', label: 'কাফ / মোহরী (Cuff)', placeholder: '৯.৫', defaultVal: '9.5' },
      { key: 'flair', label: 'ঘেড় (Flair)', placeholder: '২৬', defaultVal: '26' }
    ],
    defaultCharges: { stitching: 450, accessories: 100 },
    defaultDesign: 'ব্যান্ড কলার, সাইড কাট পকেট, মেটাল বোতাম'
  },
  'শার্ট': {
    name: 'ফরমাল / ক্যাজুয়াল শার্ট (Shirt)',
    icon: '👔',
    fields: [
      { key: 'length', label: 'ঝুল (Length)', placeholder: '২৯', defaultVal: '29' },
      { key: 'chest', label: 'ছাতি (Chest)', placeholder: '৩৯', defaultVal: '39' },
      { key: 'waist', label: 'কোমর (Waist)', placeholder: '৩৬', defaultVal: '36' },
      { key: 'shoulder', label: 'তিড়া / পুট (Shoulder)', placeholder: '১৮', defaultVal: '18' },
      { key: 'sleeve', label: 'হাতা (Sleeve)', placeholder: '২৪', defaultVal: '24' },
      { key: 'collar', label: 'কলার (Collar)', placeholder: '১৫.৫', defaultVal: '15.5' },
      { key: 'armhole', label: 'মোহড়া (Armhole)', placeholder: '১৮.৫', defaultVal: '18.5' },
      { key: 'cuff', label: 'কাফ (Cuff)', placeholder: '৯.৫', defaultVal: '9.5' }
    ],
    defaultCharges: { stitching: 350, accessories: 50 },
    defaultDesign: 'রেগুলার কলার, ১টি বুক পকেট, নরমাল ফিট'
  },
  'প্যান্ট': {
    name: 'ফরমাল / গ্যাবার্ডিন প্যান্ট (Pant)',
    icon: '👖',
    fields: [
      { key: 'length', label: 'ঝুল (Length)', placeholder: '৩৯', defaultVal: '39' },
      { key: 'waist', label: 'কোমর (Waist)', placeholder: '৩২', defaultVal: '32' },
      { key: 'hip', label: 'হিপ / সিট (Seat)', placeholder: '৩৮', defaultVal: '38' },
      { key: 'thigh', label: 'থাই / রান (Thigh)', placeholder: '২৪', defaultVal: '24' },
      { key: 'bottom', label: 'মোহরী / বটম (Bottom)', placeholder: '১৫', defaultVal: '15' },
      { key: 'rise', label: 'হাই (Rise)', placeholder: '১১', defaultVal: '11' }
    ],
    defaultCharges: { stitching: 400, accessories: 80 },
    defaultDesign: 'ক্রস পকেট, বেল্ট লুপ, ১টি ব্যাক পকেট'
  },
  'পায়জামা': {
    name: 'পায়জামা / সালোয়ার (Pajama)',
    icon: '🩳',
    fields: [
      { key: 'length', label: 'ঝুল (Length)', placeholder: '৩৮', defaultVal: '38' },
      { key: 'waist', label: 'কোমর (Waist)', placeholder: '৩৮', defaultVal: '38' },
      { key: 'bottom', label: 'মোহরী (Bottom)', placeholder: '১৪', defaultVal: '14' },
      { key: 'rise', label: 'হাই (Rise)', placeholder: '১৫', defaultVal: '15' }
    ],
    defaultCharges: { stitching: 200, accessories: 30 },
    defaultDesign: 'ইলাস্টিক কোমর, নরমাল মোহরী'
  },
  'কামিজ': {
    name: 'থ্রি-পিস কামিজ / কুর্তি (Kameez)',
    icon: '👗',
    fields: [
      { key: 'length', label: 'ঝুল (Length)', placeholder: '৪২', defaultVal: '42' },
      { key: 'chest', label: 'ছাতি (Chest)', placeholder: '৩৬', defaultVal: '36' },
      { key: 'waist', label: 'কোমর (Waist)', placeholder: '৩২', defaultVal: '32' },
      { key: 'hip', label: 'হিপ (Hip)', placeholder: '৩৮', defaultVal: '38' },
      { key: 'shoulder', label: 'পুট (Shoulder)', placeholder: '১৪.৫', defaultVal: '14.5' },
      { key: 'sleeve', label: 'হাতা (Sleeve)', placeholder: '১৯', defaultVal: '19' },
      { key: 'armhole', label: 'মোহড়া (Armhole)', placeholder: '১৬', defaultVal: '16' },
      { key: 'frontNeck', label: 'সামনের গলা', placeholder: '৬', defaultVal: '6' },
      { key: 'backNeck', label: 'পেছনের গলা', placeholder: '৫', defaultVal: '5' },
      { key: 'slit', label: 'ফাড়া (Slit)', placeholder: '২০', defaultVal: '20' }
    ],
    defaultCharges: { stitching: 450, accessories: 50 },
    defaultDesign: 'পান গলা, ফুল হাতা, সাইড ফাড়া'
  },
  'বোরকা': {
    name: 'বোরকা / আবায়া (Burqa / Abaya)',
    icon: '🧕',
    fields: [
      { key: 'length', label: 'ঝুল (Length)', placeholder: '৫২', defaultVal: '52' },
      { key: 'chest', label: 'বডি / ছাতি', placeholder: '৪৪', defaultVal: '44' },
      { key: 'sleeve', label: 'হাতা (Sleeve)', placeholder: '২২', defaultVal: '22' },
      { key: 'flair', label: 'ঘেড় (Flair)', placeholder: '৫০', defaultVal: '50' },
      { key: 'armhole', label: 'মোহড়া', placeholder: '১৮', defaultVal: '18' }
    ],
    defaultCharges: { stitching: 550, accessories: 100 },
    defaultDesign: 'সামনে চেইন, ইলাস্টিক হাতা, কুঁচি ওয়ালা ঘেড়'
  },
  'কোটি': {
    name: 'মুজিব কোট / ওয়েস্টকোট (Waistcoat)',
    icon: '🧥',
    fields: [
      { key: 'length', label: 'ঝুল (Length)', placeholder: '২৮', defaultVal: '28' },
      { key: 'chest', label: 'ছাতি (Chest)', placeholder: '৩৮', defaultVal: '38' },
      { key: 'waist', label: 'কোমর (Waist)', placeholder: '৩৬', defaultVal: '36' },
      { key: 'shoulder', label: 'পুট (Shoulder)', placeholder: '১৭', defaultVal: '17' }
    ],
    defaultCharges: { stitching: 600, accessories: 150 },
    defaultDesign: 'হাই নেক কলার, মেটাল বোতাম, আস্তরণ যুক্ত'
  },
  'অন্যান্য': {
    name: 'অন্যান্য কাস্টম পোশাক (Custom)',
    icon: '✂️',
    fields: [
      { key: 'length', label: 'ঝুল (Length)', placeholder: '', defaultVal: '' },
      { key: 'chest', label: 'ছাতি (Chest)', placeholder: '', defaultVal: '' },
      { key: 'waist', label: 'কোমর (Waist)', placeholder: '', defaultVal: '' },
      { key: 'shoulder', label: 'পুট (Shoulder)', placeholder: '', defaultVal: '' }
    ],
    defaultCharges: { stitching: 300, accessories: 50 },
    defaultDesign: 'গ্রাহকের পছন্দ অনুযায়ী'
  }
};

export const STATUS_MAP = {
  Pending: { label: 'অর্ডার গৃহীত', color: 'bg-amber-100 text-amber-800 border-amber-300', dot: 'bg-amber-500' },
  Cutting: { label: 'কাটিং চলছে', color: 'bg-blue-100 text-blue-800 border-blue-300', dot: 'bg-blue-500' },
  Stitching: { label: 'সেলাই চলছে', color: 'bg-purple-100 text-purple-800 border-purple-300', dot: 'bg-purple-500' },
  Ready: { label: 'প্রস্তুত (Ready)', color: 'bg-emerald-100 text-emerald-800 border-emerald-300', dot: 'bg-emerald-500' },
  Delivered: { label: 'ডেলিভারি সম্পন্ন', color: 'bg-slate-100 text-slate-800 border-slate-300', dot: 'bg-slate-500' },
  Cancelled: { label: 'বাতিল', color: 'bg-rose-100 text-rose-800 border-rose-300', dot: 'bg-rose-500' }
};

export default function TailoringModal({
  isOpen,
  onClose,
  embedded = false,
  tailoringOrders = [],
  tailorMasters = [],
  products = [],
  customers = [],
  currencySymbol = '৳',
  activeUser = null,
  storeSettings = {},
  initialPreload = null, // { customerName, customerPhone, fabricItem }
  onSaveOrder,
  onUpdateOrderStatus,
  onCollectDue,
  onDeleteOrder,
  onAddTailorMaster
}) {
  const [activeTab, setActiveTab] = useState('orders'); // 'orders' | 'new' | 'tailors'
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('ALL');
  const [selectedGarmentFilter, setSelectedGarmentFilter] = useState('ALL');

  // নতুন অর্ডার ফর্ম স্টেট
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [garmentType, setGarmentType] = useState('পাঞ্জাবি');
  const [quantity, setQuantity] = useState(1);
  const [fabricSource, setFabricSource] = useState('store'); // 'store' | 'customer'
  const [fabricProductId, setFabricProductId] = useState('');
  const [fabricName, setFabricName] = useState('');
  const [fabricYards, setFabricYards] = useState(2.5);
  const [tailorMaster, setTailorMaster] = useState(tailorMasters[0]?.Name || 'মাস্টার বশির আহমেদ');
  const [measurements, setMeasurements] = useState({});
  const [customFields, setCustomFields] = useState([]);
  const [newFieldName, setNewFieldName] = useState('');
  const [designDetails, setDesignDetails] = useState('');
  const [stitchingCharge, setStitchingCharge] = useState(450);
  const [accessoriesCharge, setAccessoriesCharge] = useState(100);
  const [advancePaid, setAdvancePaid] = useState(300);
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [deliveryDate, setDeliveryDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 4);
    return d.toISOString().slice(0, 10);
  });
  const [deliveryTime, setDeliveryTime] = useState('18:00');
  const [orderNotes, setOrderNotes] = useState('');

  // প্রিন্ট ও ভিউ স্টেট
  const [activeSlipOrder, setActiveSlipOrder] = useState(null);
  const [slipType, setSlipType] = useState('customer'); // 'customer' | 'tailor'

  // বকেয়া আদায় পপআপ স্টেট
  const [dueCollectOrder, setDueCollectOrder] = useState(null);
  const [collectAmount, setCollectAmount] = useState(0);
  const [collectMethod, setCollectMethod] = useState('Cash');

  // পোশাক প্রিসেট পরিবর্তন হলে মাপ ও চার্জ অটো-আপডেট করা
  useEffect(() => {
    const preset = GARMENT_PRESETS[garmentType] || GARMENT_PRESETS['পাঞ্জাবি'];
    const initM = {};
    preset.fields.forEach((f) => {
      initM[f.key] = f.defaultVal || '';
    });
    setMeasurements(initM);
    setStitchingCharge(preset.defaultCharges?.stitching || 400);
    setAccessoriesCharge(preset.defaultCharges?.accessories || 50);
    setDesignDetails(preset.defaultDesign || '');
  }, [garmentType]);

  // যদি বাইরে থেকে (যেমন কার্ট থেকে) প্রিলোড ডেটা আসে
  useEffect(() => {
    if (initialPreload) {
      if (initialPreload.customerName) setCustomerName(initialPreload.customerName);
      if (initialPreload.customerPhone) setCustomerPhone(initialPreload.customerPhone);
      if (initialPreload.fabricItem) {
        setFabricSource('store');
        setFabricProductId(initialPreload.fabricItem.id || initialPreload.fabricItem.ProductID || '');
        setFabricName(initialPreload.fabricItem.name || initialPreload.fabricItem.ProductName || '');
        setFabricYards(Number(initialPreload.fabricItem.quantity || 2.5));
      }
      setActiveTab('new');
    }
  }, [initialPreload]);

  // স্টোরের থান কাপড় তালিকা
  const fabricProducts = useMemo(() => {
    return products.filter((p) => {
      const u = String(p.Unit || p.unit || '').toLowerCase();
      const cat = String(p.Category || p.category || '').toLowerCase();
      return u.includes('গজ') || u.includes('yard') || cat.includes('থান') || cat.includes('কাপড়');
    });
  }, [products]);

  // মোট বিল ও বকেয়া হিসাব
  const totalAmount = useMemo(() => {
    return (Number(stitchingCharge) || 0) + (Number(accessoriesCharge) || 0);
  }, [stitchingCharge, accessoriesCharge]);

  const dueAmount = useMemo(() => {
    return Math.max(0, totalAmount - (Number(advancePaid) || 0));
  }, [totalAmount, advancePaid]);

  // নির্বাচিত কাস্টমারের পূর্ববর্তী অর্ডারের মাপ রিকল করার অপশন
  const handleRecallPreviousMeasurements = () => {
    if (!customerPhone && !customerName) {
      alert('অনুগ্রহ করে প্রথমে গ্রাহকের নাম বা মোবাইল নম্বর দিন।');
      return;
    }
    const pastOrder = tailoringOrders.find(
      (o) =>
        (customerPhone && o.CustomerPhone === customerPhone) ||
        (customerName && o.CustomerName.toLowerCase() === customerName.toLowerCase())
    );
    if (pastOrder && pastOrder.Measurements) {
      setMeasurements({ ...pastOrder.Measurements });
      if (pastOrder.GarmentType && GARMENT_PRESETS[pastOrder.GarmentType]) {
        setGarmentType(pastOrder.GarmentType);
      }
      playCashChime();
      alert(`পূর্ববর্তী অর্ডার (${pastOrder.OrderID}) থেকে মাপ লোড করা হয়েছে!`);
    } else {
      alert('এই গ্রাহকের কোনো পূর্ববর্তী সেলাই অর্ডারের রেকর্ড পাওয়া যায়নি।');
    }
  };

  // নতুন কাস্টম মাপের ফিল্ড যুক্ত করা
  const handleAddCustomField = (e) => {
    e.preventDefault();
    if (!newFieldName.trim()) return;
    const key = `custom_${Date.now()}`;
    setCustomFields((prev) => [...prev, { key, label: newFieldName.trim() }]);
    setMeasurements((prev) => ({ ...prev, [key]: '' }));
    setNewFieldName('');
  };

  // নতুন অর্ডার সেভ করা
  const handleSubmitNewOrder = (e) => {
    e.preventDefault();
    if (!customerName.trim()) {
      alert('অনুগ্রহ করে গ্রাহকের নাম দিন!');
      return;
    }

    const newOrderPayload = {
      CustomerName: customerName.trim(),
      CustomerPhone: customerPhone.trim(),
      CustomerAddress: customerAddress.trim(),
      GarmentType: garmentType,
      Quantity: Number(quantity) || 1,
      FabricSource: fabricSource,
      FabricName: fabricSource === 'store' ? (fabricName || 'দোকানের কাপড়') : (fabricName || 'গ্রাহকের কাপড়'),
      FabricYards: Number(fabricYards) || 0,
      TailorMaster: tailorMaster,
      Measurements: measurements,
      DesignDetails: designDetails.trim(),
      StitchingCharge: Number(stitchingCharge) || 0,
      AccessoriesCharge: Number(accessoriesCharge) || 0,
      TotalAmount: totalAmount,
      AdvancePaid: Number(advancePaid) || 0,
      DueAmount: dueAmount,
      PaymentMethod: paymentMethod,
      DeliveryDate: `${deliveryDate}T${deliveryTime}:00.000Z`,
      Notes: orderNotes.trim(),
      Status: 'Pending'
    };

    if (onSaveOrder) {
      const saved = onSaveOrder(newOrderPayload);
      playCashChime();
      // সফল হলে রসিদ প্রিন্ট প্রিভিউ খোলা
      if (saved) {
        setActiveSlipOrder(saved);
        setSlipType('customer');
      }
    }

    // ফর্ম রিসেট
    setActiveTab('orders');
  };

  // স্ট্যাটাস পরবর্তী ধাপে অগ্রসর করা
  const handleAdvanceStatus = (order) => {
    const flow = ['Pending', 'Cutting', 'Stitching', 'Ready', 'Delivered'];
    const curIdx = flow.indexOf(order.Status);
    if (curIdx === -1 || curIdx >= flow.length - 1) return;

    const nextStatus = flow[curIdx + 1];
    if (nextStatus === 'Delivered' && Number(order.DueAmount) > 0) {
      // ডেলিভারি করার সময় বকেয়া থাকলে পপআপ ওপেন
      setDueCollectOrder(order);
      setCollectAmount(order.DueAmount);
      return;
    }

    if (onUpdateOrderStatus) {
      onUpdateOrderStatus(order.OrderID, nextStatus, `স্ট্যাটাস পরিবর্তন করে ${STATUS_MAP[nextStatus]?.label || nextStatus} করা হয়েছে`);
      playCashChime();
    }
  };

  // বকেয়া আদায় সাবমিট
  const handleConfirmDueCollection = (e) => {
    e.preventDefault();
    if (!dueCollectOrder) return;
    const amt = Number(collectAmount) || 0;
    if (amt <= 0) {
      alert('সঠিক টাকার অংক লিখুন!');
      return;
    }

    if (onCollectDue) {
      onCollectDue(dueCollectOrder.OrderID, amt, collectMethod);
      playCashChime();
    }
    setDueCollectOrder(null);
  };

  // হোয়াটসঅ্যাপে সেলাই মেমো পাঠানো
  const handleSendWhatsAppMemo = (order) => {
    const rawPhone = order.CustomerPhone || '';
    const phone = formatBdPhoneForWhatsApp(rawPhone);
    if (!phone) {
      alert('গ্রাহকের সঠিক মোবাইল নম্বর দেওয়া নেই!');
      return;
    }

    const storeName = storeSettings.StoreName || 'পাবনা বস্ত্রালয়';
    const storePhone = storeSettings.Phone || '01675934919';
    const deliveryFormatted = new Date(order.DeliveryDate).toLocaleDateString('bn-BD', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });

    const statusLabel = STATUS_MAP[order.Status]?.label || order.Status;

    const msg = `*${storeName} - টেইলারিং ও সেলাই মেমো* 🧵
━━━━━━━━━━━━━━━━━━━━━━
📋 *অর্ডার নং:* ${order.OrderID} (টোকেন: #${order.TokenNo || '---'})
👤 *গ্রাহক:* ${order.CustomerName}
👔 *পোশাক:* ${order.GarmentType} (${order.Quantity || 1}টি)
✂️ *কারিগর:* ${order.TailorMaster || 'মাস্টার'}
📅 *ডেলিভারি তারিখ:* ${deliveryFormatted}
📍 *বর্তমান অবস্থা:* [ *${statusLabel}* ]
━━━━━━━━━━━━━━━━━━━━━━
💰 *মোট মজুরি:* ${currencySymbol}${order.TotalAmount}
💵 *অগ্রিম জমা:* ${currencySymbol}${order.AdvancePaid}
⚠️ *অবশিষ্ট বকেয়া:* ${currencySymbol}${order.DueAmount}
━━━━━━━━━━━━━━━━━━━━━━
${order.DesignDetails ? `📌 *ডিজাইন:* ${order.DesignDetails}\n` : ''}দোকানের ঠিকানা: ${storeSettings.Address || 'বসিলা, মোহাম্মদপুর, ঢাকা'}
যোগাযোগ: ${storePhone}

ধন্যবাদ আমাদের সাথে থাকার জন্য! ❤️`;

    const encoded = encodeURIComponent(msg);
    const url = `https://wa.me/${phone}?text=${encoded}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  // ফিল্টার করা অর্ডার তালিকা
  const filteredOrders = useMemo(() => {
    return tailoringOrders.filter((o) => {
      const q = searchQuery.trim().toLowerCase();
      const matchQ =
        !q ||
        o.OrderID.toLowerCase().includes(q) ||
        (o.TokenNo && o.TokenNo.toLowerCase().includes(q)) ||
        o.CustomerName.toLowerCase().includes(q) ||
        (o.CustomerPhone && o.CustomerPhone.includes(q)) ||
        (o.TailorMaster && o.TailorMaster.toLowerCase().includes(q));

      const matchStatus = selectedStatusFilter === 'ALL' || o.Status === selectedStatusFilter;
      const matchGarment = selectedGarmentFilter === 'ALL' || o.GarmentType === selectedGarmentFilter;

      return matchQ && matchStatus && matchGarment;
    });
  }, [tailoringOrders, searchQuery, selectedStatusFilter, selectedGarmentFilter]);

  // KPI হিসাব
  const kpi = useMemo(() => {
    const totalOrders = tailoringOrders.length;
    const inProgress = tailoringOrders.filter((o) => o.Status === 'Cutting' || o.Status === 'Stitching').length;
    const readyCount = tailoringOrders.filter((o) => o.Status === 'Ready').length;
    const totalDue = tailoringOrders.reduce((acc, o) => acc + (Number(o.DueAmount) || 0), 0);
    return { totalOrders, inProgress, readyCount, totalDue };
  }, [tailoringOrders]);

  if (!isOpen) return null;

  return (
    <div
      className={
        embedded
          ? 'w-full h-full flex flex-col bg-slate-50'
          : 'fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-in fade-in duration-200'
      }
      role="dialog"
      aria-modal="true"
    >
      <div
        className={
          embedded
            ? 'w-full h-full flex flex-col bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden'
            : 'bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-6xl max-h-[92vh] flex flex-col overflow-hidden my-auto animate-in zoom-in-95 duration-200'
        }
      >
        {/* ================= ১. আল্ট্রা-মডার্ন হেডার ================= */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3 border-b border-indigo-900/40">
          <div className="flex items-center space-x-3">
            <div className="w-11 h-11 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-400 shadow-inner">
              <Scissors className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg sm:text-xl font-black tracking-tight text-white">
                  টেইলারিং ও সেলাই অর্ডার স্টুডিও
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/30 text-indigo-300 border border-indigo-400/40 uppercase tracking-wider">
                  Phase 2 Special
                </span>
              </div>
              <p className="text-xs text-indigo-200/80 mt-0.5">
                গ্রাহকের নিখুঁত শরীরের মাপজোখ, কারিগর কার্যপত্র ও সেলাই ডেলিভারি ট্র্যাকিং
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* ট্যাব নেভিগেশন */}
            <div className="bg-slate-800/80 p-1 rounded-xl flex items-center border border-slate-700/60 text-xs font-bold">
              <button
                type="button"
                onClick={() => setActiveTab('orders')}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center space-x-1.5 ${
                  activeTab === 'orders'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <span>অর্ডার তালিকা ও ট্র্যাকিং</span>
                {tailoringOrders.length > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-indigo-400/30 text-white">
                    {tailoringOrders.length}
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('new')}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center space-x-1.5 ${
                  activeTab === 'new'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>নতুন সেলাই অর্ডার</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('tailors')}
                className={`px-3 py-1.5 rounded-lg transition-all flex items-center space-x-1.5 ${
                  activeTab === 'tailors'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>কারিগর মাস্টার্স</span>
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-all cursor-pointer"
              title="বন্ধ করুন"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ================= ২. মূল কনটেন্ট এরিয়া ================= */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50/60 space-y-5">
          {/* ট্যাব ১: অর্ডার তালিকা ও লাইভ ট্র্যাকিং */}
          {activeTab === 'orders' && (
            <div className="space-y-5">
              {/* KPI স্ট্রিপ */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">মোট অর্ডার</span>
                    <h3 className="text-xl sm:text-2xl font-black text-slate-900 mt-0.5">{kpi.totalOrders}টি</h3>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                    <Scissors className="w-5 h-5" />
                  </div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-bold text-amber-600 uppercase tracking-wider">সেলাই / কাটিং চলছে</span>
                    <h3 className="text-xl sm:text-2xl font-black text-amber-700 mt-0.5">{kpi.inProgress}টি</h3>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                    <Clock className="w-5 h-5" />
                  </div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">ডেলিভারির জন্য প্রস্তুত</span>
                    <h3 className="text-xl sm:text-2xl font-black text-emerald-700 mt-0.5">{kpi.readyCount}টি</h3>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                    <CheckCircle className="w-5 h-5" />
                  </div>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-bold text-rose-600 uppercase tracking-wider">মোট বকেয়া মজুরি</span>
                    <h3 className="text-xl sm:text-2xl font-black text-rose-700 mt-0.5">
                      {currencySymbol}{kpi.totalDue.toLocaleString('en-IN')}
                    </h3>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
                    <DollarSign className="w-5 h-5" />
                  </div>
                </div>
              </div>

              {/* ফিল্টার ও সার্চ বার */}
              <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-3">
                <div className="relative flex-1 min-w-[240px]">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="অর্ডার নং, টোকেন, গ্রাহকের নাম, মোবাইল বা কারিগর দিয়ে খুঁজুন..."
                    className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-medium"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                    >
                      মুছুন
                    </button>
                  )}
                </div>

                {/* স্ট্যাটাস ও পোশাক ফিল্টার */}
                <div className="flex items-center space-x-2">
                  <select
                    value={selectedStatusFilter}
                    onChange={(e) => setSelectedStatusFilter(e.target.value)}
                    className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="ALL">সকল স্ট্যাটাস</option>
                    <option value="Pending">অর্ডার গৃহীত</option>
                    <option value="Cutting">কাটিং চলছে</option>
                    <option value="Stitching">সেলাই চলছে</option>
                    <option value="Ready">প্রস্তুত (Ready)</option>
                    <option value="Delivered">ডেলিভারি সম্পন্ন</option>
                    <option value="Cancelled">বাতিল</option>
                  </select>

                  <select
                    value={selectedGarmentFilter}
                    onChange={(e) => setSelectedGarmentFilter(e.target.value)}
                    className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-bold text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="ALL">সকল পোশাক</option>
                    {Object.keys(GARMENT_PRESETS).map((g) => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* অর্ডার তালিকা কার্ড / টেবিল */}
              {filteredOrders.length === 0 ? (
                <div className="bg-white rounded-3xl p-10 text-center border border-slate-200/80 shadow-xs space-y-3">
                  <div className="w-16 h-16 rounded-full bg-indigo-50 text-indigo-500 mx-auto flex items-center justify-center">
                    <Scissors className="w-8 h-8" />
                  </div>
                  <h3 className="text-base font-black text-slate-800">কোনো টেইলারিং অর্ডার পাওয়া যায়নি</h3>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    গ্রাহকের নতুন পোশাক সেলাইয়ের জন্য "নতুন সেলাই অর্ডার" বাটনে ক্লিক করে সহজে অর্ডার তৈরি করুন।
                  </p>
                  <button
                    onClick={() => setActiveTab('new')}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all inline-flex items-center space-x-1.5 shadow-md shadow-indigo-500/20"
                  >
                    <Plus className="w-4 h-4" />
                    <span>নতুন অর্ডার তৈরি করুন</span>
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredOrders.map((order) => {
                    const st = STATUS_MAP[order.Status] || STATUS_MAP.Pending;
                    const deliveryDt = new Date(order.DeliveryDate);
                    const isDueToday = deliveryDt.toDateString() === new Date().toDateString();
                    const isOverdue = deliveryDt < new Date() && order.Status !== 'Delivered' && order.Status !== 'Cancelled';

                    return (
                      <div
                        key={order.OrderID}
                        className="bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all flex flex-col justify-between overflow-hidden group"
                      >
                        {/* টপ বার */}
                        <div className="p-4 border-b border-slate-100 flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center space-x-2">
                              <span className="px-2 py-0.5 rounded-lg bg-indigo-50 text-indigo-700 font-mono font-black text-xs border border-indigo-200/60">
                                #{order.TokenNo || '---'}
                              </span>
                              <span className="text-xs font-mono font-bold text-slate-500">
                                {order.OrderID}
                              </span>
                            </div>
                            <h4 className="text-sm font-black text-slate-900 mt-1 flex items-center space-x-1.5">
                              <span>{order.CustomerName}</span>
                              {order.CustomerPhone && (
                                <span className="text-[11px] font-normal text-slate-500">
                                  ({order.CustomerPhone})
                                </span>
                              )}
                            </h4>
                          </div>

                          <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold border flex items-center space-x-1.5 ${st.color}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`}></span>
                            <span>{st.label}</span>
                          </span>
                        </div>

                        {/* পোশাক ও মেজারমেন্ট প্রিভিউ */}
                        <div className="p-4 space-y-3 flex-1 text-xs">
                          <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-200/60 space-y-1">
                            <div className="flex items-center justify-between font-bold text-slate-800">
                              <span className="flex items-center space-x-1">
                                <span className="text-base">{GARMENT_PRESETS[order.GarmentType]?.icon || '✂️'}</span>
                                <span>{order.GarmentType}</span>
                              </span>
                              <span className="text-indigo-600 font-black">{order.Quantity || 1}টি</span>
                            </div>
                            <p className="text-[11px] text-slate-500">
                              {order.FabricSource === 'store' ? 'দোকানের কাপড়' : 'গ্রাহকের কাপড়'}: {order.FabricName} ({order.FabricYards || 0} গজ)
                            </p>
                            {order.TailorMaster && (
                              <p className="text-[11px] text-slate-600 font-medium flex items-center space-x-1">
                                <span className="font-bold text-slate-700">কারিগর:</span>
                                <span>{order.TailorMaster}</span>
                              </p>
                            )}
                          </div>

                          {/* মাপের সংক্ষিপ্ত বিবরণ */}
                          {order.Measurements && (
                            <div className="grid grid-cols-3 gap-1.5 text-[10px] bg-indigo-50/50 p-2 rounded-xl border border-indigo-100">
                              {Object.entries(order.Measurements)
                                .slice(0, 6)
                                .map(([k, v]) => (
                                  <div key={k} className="flex flex-col">
                                    <span className="text-slate-400 font-medium capitalize truncate">
                                      {GARMENT_PRESETS[order.GarmentType]?.fields?.find((f) => f.key === k)?.label?.split(' ')[0] || k}
                                    </span>
                                    <span className="font-bold text-indigo-900">{v || '-'}″</span>
                                  </div>
                                ))}
                            </div>
                          )}

                          {/* ডেলিভারি তারিখ */}
                          <div className="flex items-center justify-between text-[11px] pt-1">
                            <span className="text-slate-500 flex items-center space-x-1">
                              <Calendar className="w-3.5 h-3.5 text-slate-400" />
                              <span>ডেলিভারি:</span>
                            </span>
                            <span
                              className={`font-black ${
                                isOverdue
                                  ? 'text-rose-600 animate-pulse'
                                  : isDueToday
                                  ? 'text-amber-600 font-bold'
                                  : 'text-slate-700'
                              }`}
                            >
                              {deliveryDt.toLocaleDateString('bn-BD', { day: 'numeric', month: 'short' })}
                              {isOverdue && ' (দেরি!)'}
                              {isDueToday && ' (আজই)'}
                            </span>
                          </div>

                          {/* ফাইন্যান্সিয়ালস (মজুরি ও বকেয়া) */}
                          <div className="bg-slate-900 text-white rounded-xl p-2.5 flex items-center justify-between">
                            <div>
                              <span className="text-[10px] text-slate-400 block">মোট মজুরি</span>
                              <span className="font-black text-sm">{currencySymbol}{order.TotalAmount}</span>
                            </div>
                            <div className="text-right">
                              <span className="text-[10px] text-slate-400 block">অবশিষ্ট বকেয়া</span>
                              <span className={`font-black text-sm ${Number(order.DueAmount) > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                                {currencySymbol}{order.DueAmount}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* অ্যাকশন বাটনসমূহ */}
                        <div className="p-3 bg-slate-50/80 border-t border-slate-100 flex flex-wrap items-center justify-between gap-1.5">
                          {/* স্ট্যাটাস অ্যাডভান্স বাটন */}
                          {order.Status !== 'Delivered' && order.Status !== 'Cancelled' ? (
                            <button
                              onClick={() => handleAdvanceStatus(order)}
                              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all flex items-center space-x-1 shadow-xs cursor-pointer"
                              title="পরবর্তী ধাপে অগ্রসর করুন"
                            >
                              <span>
                                {order.Status === 'Pending' && 'কাটিং শুরু'}
                                {order.Status === 'Cutting' && 'সেলাই শুরু'}
                                {order.Status === 'Stitching' && 'রেডি করুন'}
                                {order.Status === 'Ready' && 'ডেলিভারি দিন'}
                              </span>
                              <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                          ) : (
                            <span className="text-[11px] font-bold text-slate-500 px-2 py-1 bg-slate-200/80 rounded-lg">
                              সম্পন্ন
                            </span>
                          )}

                          <div className="flex items-center space-x-1">
                            {/* হোয়াটসঅ্যাপ মেমো */}
                            <button
                              onClick={() => handleSendWhatsAppMemo(order)}
                              className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg transition-all cursor-pointer"
                              title="হোয়াটসঅ্যাপে মেমো পাঠান"
                            >
                              <Share2 className="w-3.5 h-3.5" />
                            </button>

                            {/* কাস্টমার রসিদ প্রিন্ট */}
                            <button
                              onClick={() => {
                                setActiveSlipOrder(order);
                                setSlipType('customer');
                              }}
                              className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-lg transition-all cursor-pointer"
                              title="গ্রাহক কপি প্রিন্ট"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>

                            {/* কারিগর কাটিং স্লিপ */}
                            <button
                              onClick={() => {
                                setActiveSlipOrder(order);
                                setSlipType('tailor');
                              }}
                              className="p-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-lg transition-all cursor-pointer"
                              title="কারিগর কাটিং স্লিপ প্রিন্ট"
                            >
                              <Scissors className="w-3.5 h-3.5" />
                            </button>

                            {/* বকেয়া আদায় বাটন */}
                            {Number(order.DueAmount) > 0 && (
                              <button
                                onClick={() => {
                                  setDueCollectOrder(order);
                                  setCollectAmount(order.DueAmount);
                                }}
                                className="px-2 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 rounded-lg text-[10px] font-black transition-all cursor-pointer"
                                title="বকেয়া আদায় করুন"
                              >
                                আদায়
                              </button>
                            )}

                            {/* ডিলিট অপশন */}
                            {onDeleteOrder && (
                              <button
                                onClick={() => {
                                  if (confirm(`আপনি কি নিশ্চিত যে "${order.OrderID}" অর্ডারটি মুছে ফেলতে চান?`)) {
                                    onDeleteOrder(order.OrderID);
                                  }
                                }}
                                className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition-all cursor-pointer"
                                title="মুছে ফেলুন"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ট্যাব ২: নতুন সেলাই অর্ডার ফরম */}
          {activeTab === 'new' && (
            <form onSubmit={handleSubmitNewOrder} className="space-y-6">
              {/* স্টেপ ১: গ্রাহক তথ্য */}
              <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center space-x-2">
                    <span className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-black flex items-center justify-center">
                      ১
                    </span>
                    <h3 className="text-sm font-black text-slate-900">গ্রাহকের তথ্য ও পূর্বের মাপ</h3>
                  </div>

                  <button
                    type="button"
                    onClick={handleRecallPreviousMeasurements}
                    className="px-3 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>পূর্ববর্তী মাপ রিকল করুন</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">গ্রাহকের নাম *</label>
                    <input
                      type="text"
                      required
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="যেমন: মো: রফিকুল ইসলাম"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1">মোবাইল নম্বর (হোয়াটসঅ্যাপ) *</label>
                    <input
                      type="text"
                      required
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="017XXXXXXXX"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden font-mono font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1">ঠিকানা / এলাকা</label>
                    <input
                      type="text"
                      value={customerAddress}
                      onChange={(e) => setCustomerAddress(e.target.value)}
                      placeholder="যেমন: বসিলা, মোহাম্মদপুর"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden font-medium"
                    />
                  </div>
                </div>
              </div>

              {/* স্টেপ ২: পোশাক নির্বাচন ও পরিমাপক চার্ট */}
              <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
                <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
                  <span className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-black flex items-center justify-center">
                    ২
                  </span>
                  <h3 className="text-sm font-black text-slate-900">পোশাকের ধরণ ও শরীরের নিখুঁত মাপ (ইঞ্চি)</h3>
                </div>

                {/* পোশাকের কুইক পিল বাটনসমূহ */}
                <div className="flex flex-wrap gap-2">
                  {Object.entries(GARMENT_PRESETS).map(([key, data]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setGarmentType(key)}
                      className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
                        garmentType === key
                          ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/25 scale-102'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                      }`}
                    >
                      <span className="text-sm">{data.icon}</span>
                      <span>{data.name.split(' ')[0]}</span>
                    </button>
                  ))}
                </div>

                {/* মাপ ইনপুট গ্রিড */}
                <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-200/80">
                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3 text-xs">
                    {(GARMENT_PRESETS[garmentType]?.fields || []).map((f) => (
                      <div key={f.key}>
                        <label className="block text-slate-700 font-bold mb-1 truncate" title={f.label}>
                          {f.label}
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            value={measurements[f.key] || ''}
                            onChange={(e) =>
                              setMeasurements((prev) => ({ ...prev, [f.key]: e.target.value }))
                            }
                            placeholder={f.placeholder}
                            className="w-full px-3 py-2 pr-6 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden font-bold text-slate-900"
                          />
                          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-bold">
                            ″
                          </span>
                        </div>
                      </div>
                    ))}

                    {/* কাস্টম যোগ করা ফিল্ডসমূহ */}
                    {customFields.map((cf) => (
                      <div key={cf.key}>
                        <label className="block text-indigo-700 font-bold mb-1 truncate">
                          {cf.label}
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            value={measurements[cf.key] || ''}
                            onChange={(e) =>
                              setMeasurements((prev) => ({ ...prev, [cf.key]: e.target.value }))
                            }
                            className="w-full px-3 py-2 pr-6 bg-white border border-indigo-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden font-bold text-slate-900"
                          />
                          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-bold">
                            ″
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* নতুন কাস্টম মাপ যোগ করার ইনপুট */}
                  <div className="mt-4 pt-3 border-t border-slate-200 flex items-center space-x-2">
                    <input
                      type="text"
                      value={newFieldName}
                      onChange={(e) => setNewFieldName(e.target.value)}
                      placeholder="+ অতিরিক্ত মাপের নাম (যেমন: কাফ হাইট, পকেট সাইজ)..."
                      className="text-xs px-3 py-1.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden flex-1 max-w-sm"
                    />
                    <button
                      type="button"
                      onClick={handleAddCustomField}
                      className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold transition-all cursor-pointer"
                    >
                      মাপ ফিল্ড যুক্ত করুন
                    </button>
                  </div>
                </div>

                {/* ডিজাইন ও বিশেষ নির্দেশনা */}
                <div className="text-xs">
                  <label className="block text-slate-700 font-bold mb-1">
                    ডিজাইন ও সেলাইয়ের বিশেষ নির্দেশনা (কলার, বোতাম, পকেট, কাটিং ইত্যাদি)
                  </label>
                  <textarea
                    rows={2}
                    value={designDetails}
                    onChange={(e) => setDesignDetails(e.target.value)}
                    placeholder="যেমন: ব্যান্ড কলার, মেটাল বোতাম, ডাবল সেলাই, সাইড কাট পকেট..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden font-medium"
                  />
                </div>
              </div>

              {/* স্টেপ ৩: কাপড়ের উৎস ও কারিগর নির্বাচন */}
              <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
                <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
                  <span className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-black flex items-center justify-center">
                    ৩
                  </span>
                  <h3 className="text-sm font-black text-slate-900">কাপড়ের উৎস ও কারিগর অ্যাসাইন</h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                  {/* কাপড়ের সোর্স */}
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">কাপড় কোথা থেকে?</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setFabricSource('store')}
                        className={`py-2 px-3 rounded-xl font-bold transition-all cursor-pointer ${
                          fabricSource === 'store'
                            ? 'bg-indigo-600 text-white shadow-xs'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        দোকানের কাপড়
                      </button>
                      <button
                        type="button"
                        onClick={() => setFabricSource('customer')}
                        className={`py-2 px-3 rounded-xl font-bold transition-all cursor-pointer ${
                          fabricSource === 'customer'
                            ? 'bg-indigo-600 text-white shadow-xs'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        গ্রাহকের নিজস্ব
                      </button>
                    </div>
                  </div>

                  {/* কাপড় বিবরণ বা সিলেকশন */}
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">কাপড়ের বিবরণ / থান</label>
                    {fabricSource === 'store' && fabricProducts.length > 0 ? (
                      <select
                        value={fabricProductId}
                        onChange={(e) => {
                          const p = fabricProducts.find((x) => (x.ProductID || x.id) === e.target.value);
                          setFabricProductId(e.target.value);
                          if (p) setFabricName(p.ProductName || p.name);
                        }}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 font-medium"
                      >
                        <option value="">দোকানের থান কাপড় নির্বাচন করুন...</option>
                        {fabricProducts.map((p) => (
                          <option key={p.ProductID || p.id} value={p.ProductID || p.id}>
                            {p.ProductName || p.name} (মজুত: {p.CurrentStock || p.stock || 0} গজ)
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        value={fabricName}
                        onChange={(e) => setFabricName(e.target.value)}
                        placeholder="কাপড়ের নাম ও কালার (যেমন: সুতি সাদা থান)"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 font-medium"
                      />
                    )}
                  </div>

                  {/* গজ সংখ্যা */}
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">কাপড়ের পরিমাণ (গজ)</label>
                    <input
                      type="number"
                      step="0.25"
                      min="0.5"
                      value={fabricYards}
                      onChange={(e) => setFabricYards(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 font-bold text-slate-900"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pt-2">
                  {/* কারিগর নির্বাচন */}
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">কারিগর / মাস্টার দর্জি</label>
                    <select
                      value={tailorMaster}
                      onChange={(e) => setTailorMaster(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 font-bold text-slate-800"
                    >
                      {tailorMasters.map((tm) => (
                        <option key={tm.TailorID || tm.Name} value={tm.Name}>
                          {tm.Name} ({tm.Speciality || 'কারিগর'})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* পোশাক সংখ্যা */}
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">পোশাকের সংখ্যা (Pcs)</label>
                    <input
                      type="number"
                      min="1"
                      value={quantity}
                      onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 font-bold text-slate-900"
                    />
                  </div>
                </div>
              </div>

              {/* স্টেপ ৪: মজুরি, অগ্রিম ও ডেলিভারি তারিখ */}
              <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
                <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
                  <span className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-black flex items-center justify-center">
                    ৪
                  </span>
                  <h3 className="text-sm font-black text-slate-900">সেলাই মজুরি, অগ্রিম পেমেন্ট ও ডেলিভারি তারিখ</h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs">
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">সেলাই মজুরি (৳) *</label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={stitchingCharge}
                      onChange={(e) => setStitchingCharge(Math.max(0, parseFloat(e.target.value) || 0))}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 font-black text-slate-900 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1">বোতাম / আস্তরণ ইত্যাদি (৳)</label>
                    <input
                      type="number"
                      min="0"
                      value={accessoriesCharge}
                      onChange={(e) => setAccessoriesCharge(Math.max(0, parseFloat(e.target.value) || 0))}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 font-bold text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1">অগ্রিম জমা (৳)</label>
                    <input
                      type="number"
                      min="0"
                      max={totalAmount}
                      value={advancePaid}
                      onChange={(e) => setAdvancePaid(Math.max(0, parseFloat(e.target.value) || 0))}
                      className="w-full px-3 py-2 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-xl focus:ring-2 focus:ring-emerald-500 font-black text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1">পেমেন্ট মাধ্যম</label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 font-bold text-slate-800"
                    >
                      <option value="Cash">ক্যাশ (Cash)</option>
                      <option value="bKash">বিকাশ (bKash)</option>
                      <option value="Nagad">নগদ (Nagad)</option>
                      <option value="Card">কার্ড (Card)</option>
                    </select>
                  </div>
                </div>

                {/* ডেলিভারি তারিখ ও দ্রুত শর্টকাট */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pt-2">
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">ডেলিভারির তারিখ *</label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="date"
                        required
                        value={deliveryDate}
                        onChange={(e) => setDeliveryDate(e.target.value)}
                        className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 font-bold text-slate-900 flex-1"
                      />
                      <input
                        type="time"
                        value={deliveryTime}
                        onChange={(e) => setDeliveryTime(e.target.value)}
                        className="px-2 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 font-bold text-slate-900 w-24"
                      />
                    </div>
                    {/* কুইক ডেট চিপস */}
                    <div className="flex items-center space-x-2 mt-2">
                      <button
                        type="button"
                        onClick={() => {
                          const d = new Date();
                          d.setDate(d.getDate() + 3);
                          setDeliveryDate(d.toISOString().slice(0, 10));
                        }}
                        className="text-[10px] px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-700 font-bold cursor-pointer"
                      >
                        +৩ দিন
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const d = new Date();
                          d.setDate(d.getDate() + 5);
                          setDeliveryDate(d.toISOString().slice(0, 10));
                        }}
                        className="text-[10px] px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-700 font-bold cursor-pointer"
                      >
                        +৫ দিন
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const d = new Date();
                          d.setDate(d.getDate() + 7);
                          setDeliveryDate(d.toISOString().slice(0, 10));
                        }}
                        className="text-[10px] px-2 py-1 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-700 font-bold cursor-pointer"
                      >
                        +৭ দিন (১ সপ্তাহ)
                      </button>
                    </div>
                  </div>

                  {/* বিল সারাংশ কার্ড */}
                  <div className="bg-slate-900 text-white p-4 rounded-2xl flex items-center justify-between">
                    <div>
                      <span className="text-xs text-slate-400 block font-medium">মোট সেলাই বিল</span>
                      <h4 className="text-xl font-black">{currencySymbol}{totalAmount}</h4>
                      <span className="text-[11px] text-emerald-400 font-bold mt-1 block">
                        অগ্রিম জমা: {currencySymbol}{advancePaid}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-xs text-slate-400 block font-medium">অবশিষ্ট বকেয়া</span>
                      <h4 className={`text-xl font-black ${dueAmount > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                        {currencySymbol}{dueAmount}
                      </h4>
                      <span className="text-[10px] text-slate-400 block mt-1">ডেলিভারির সময় প্রদেয়</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* সাবমিট বোতাম */}
              <div className="flex items-center justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('orders')}
                  className="px-5 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-2xl text-xs font-bold transition-all cursor-pointer"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-black transition-all flex items-center space-x-2 shadow-lg shadow-indigo-500/30 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>অর্ডার নিশ্চিত ও রসিদ তৈরি করুন</span>
                </button>
              </div>
            </form>
          )}

          {/* ট্যাব ৩: কারিগর মাস্টার্স তালিকা */}
          {activeTab === 'tailors' && (
            <div className="space-y-4">
              <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-slate-900">কারিগর ও মাস্টার্স প্যানেল</h3>
                  <p className="text-xs text-slate-500 mt-0.5">দোকানের দক্ষ কারিগরদের কাজের তালিকা ও কন্টাক্ট</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {tailorMasters.map((tm) => {
                  const assignedCount = tailoringOrders.filter(
                    (o) => o.TailorMaster === tm.Name && o.Status !== 'Delivered' && o.Status !== 'Cancelled'
                  ).length;

                  return (
                    <div
                      key={tm.TailorID || tm.Name}
                      className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-3"
                    >
                      <div className="flex items-start justify-between">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black text-lg">
                          {tm.Name.charAt(0)}
                        </div>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          সক্রিয় কারিগর
                        </span>
                      </div>

                      <div>
                        <h4 className="text-base font-black text-slate-900">{tm.Name}</h4>
                        <p className="text-xs text-indigo-600 font-bold mt-0.5">{tm.Speciality}</p>
                        <p className="text-xs text-slate-500 mt-1 flex items-center space-x-1">
                          <Phone className="w-3.5 h-3.5 text-slate-400" />
                          <span>{tm.Phone || 'নম্বর নেই'}</span>
                        </p>
                      </div>

                      <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 flex items-center justify-between text-xs">
                        <span className="text-slate-600 font-medium">চলতি কাজের অর্ডার:</span>
                        <span className="font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-lg">
                          {assignedCount}টি রানিং
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* ================= ৩. প্রিন্ট স্লিপ প্রিভিউ মডাল ================= */}
        {activeSlipOrder && (
          <div className="fixed inset-0 z-[120] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
            <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg p-6 space-y-4 my-auto relative animate-in zoom-in-95">
              <button
                onClick={() => setActiveSlipOrder(null)}
                className="absolute right-4 top-4 text-slate-400 hover:text-slate-700 p-1"
              >
                <X className="w-5 h-5" />
              </button>

              {/* স্লিপ টগল */}
              <div className="flex items-center space-x-2 bg-slate-100 p-1 rounded-xl text-xs font-bold">
                <button
                  onClick={() => setSlipType('customer')}
                  className={`flex-1 py-1.5 rounded-lg transition-all ${
                    slipType === 'customer' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600'
                  }`}
                >
                  গ্রাহক রসিদ (Customer Copy)
                </button>
                <button
                  onClick={() => setSlipType('tailor')}
                  className={`flex-1 py-1.5 rounded-lg transition-all ${
                    slipType === 'tailor' ? 'bg-purple-600 text-white shadow-xs' : 'text-slate-600'
                  }`}
                >
                  কারিগর স্লিপ (Tailor Work Slip)
                </button>
              </div>

              {/* প্রিন্ট ফ্রেম */}
              <div id="tailoring-printable-slip" className="border border-slate-200 rounded-2xl p-4 bg-white text-slate-900 space-y-3 font-sans">
                {/* হেড */}
                <div className="text-center border-b border-dashed border-slate-300 pb-2">
                  <h3 className="font-black text-base">{storeSettings.StoreName || 'পাবনা বস্ত্রালয়'}</h3>
                  <p className="text-[10px] text-slate-500">{storeSettings.Address || 'বসিলা, মোহাম্মদপুর, ঢাকা'}</p>
                  <p className="text-[10px] text-slate-500 font-mono">মোবাইল: {storeSettings.Phone || '01675934919'}</p>
                  <span className="inline-block mt-1 px-2.5 py-0.5 bg-slate-100 font-black text-[11px] rounded-full uppercase tracking-wider">
                    {slipType === 'customer' ? 'টেইলারিং গ্রাহক রসিদ' : 'কারিগর কাটিং ও সেলাই কার্যপত্র'}
                  </span>
                </div>

                {/* অর্ডার ও গ্রাহক তথ্য */}
                <div className="text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-500">টোকেন নং:</span>
                    <span className="font-black font-mono text-sm">#{activeSlipOrder.TokenNo || '---'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">অর্ডার নং:</span>
                    <span className="font-mono font-bold">{activeSlipOrder.OrderID}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">গ্রাহক:</span>
                    <span className="font-bold">{activeSlipOrder.CustomerName}</span>
                  </div>
                  {activeSlipOrder.CustomerPhone && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">মোবাইল:</span>
                      <span className="font-mono">{activeSlipOrder.CustomerPhone}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-slate-500">পোশাক:</span>
                    <span className="font-black text-indigo-700">{activeSlipOrder.GarmentType} ({activeSlipOrder.Quantity || 1}টি)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">ডেলিভারি তারিখ:</span>
                    <span className="font-bold text-rose-700">
                      {new Date(activeSlipOrder.DeliveryDate).toLocaleDateString('bn-BD', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </span>
                  </div>
                  {activeSlipOrder.TailorMaster && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">কারিগর:</span>
                      <span className="font-bold">{activeSlipOrder.TailorMaster}</span>
                    </div>
                  )}
                </div>

                {/* কারিগর স্লিপের ক্ষেত্রে বিস্তারিত মাপের ছক */}
                {slipType === 'tailor' && activeSlipOrder.Measurements && (
                  <div className="border-t border-b border-dashed border-slate-300 py-2 my-2 space-y-1.5">
                    <span className="text-[11px] font-black text-slate-800 block text-center">নিখুঁত কাটিং মাপ (ইঞ্চি)</span>
                    <div className="grid grid-cols-3 gap-1.5 text-xs bg-slate-50 p-2 rounded-xl">
                      {Object.entries(activeSlipOrder.Measurements).map(([k, v]) => (
                        <div key={k} className="flex justify-between border-b border-slate-200/60 pb-0.5">
                          <span className="text-slate-500 text-[10px]">{k}:</span>
                          <span className="font-black font-mono">{v || '-'}″</span>
                        </div>
                      ))}
                    </div>
                    {activeSlipOrder.DesignDetails && (
                      <p className="text-[11px] text-slate-700 font-medium pt-1">
                        <span className="font-bold">ডিজাইন:</span> {activeSlipOrder.DesignDetails}
                      </p>
                    )}
                  </div>
                )}

                {/* ফাইন্যান্সিয়ালস */}
                <div className="border-t border-dashed border-slate-300 pt-2 text-xs space-y-1">
                  <div className="flex justify-between">
                    <span>সেলাই মজুরি:</span>
                    <span className="font-mono font-bold">{currencySymbol}{activeSlipOrder.StitchingCharge}</span>
                  </div>
                  {activeSlipOrder.AccessoriesCharge > 0 && (
                    <div className="flex justify-between text-slate-500">
                      <span>অন্যান্য খরচ (বোতাম/আস্তরণ):</span>
                      <span className="font-mono">{currencySymbol}{activeSlipOrder.AccessoriesCharge}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-black text-sm border-t border-slate-200 pt-1">
                    <span>মোট বিল:</span>
                    <span className="font-mono">{currencySymbol}{activeSlipOrder.TotalAmount}</span>
                  </div>
                  <div className="flex justify-between text-emerald-700 font-bold">
                    <span>অগ্রিম জমা:</span>
                    <span className="font-mono">{currencySymbol}{activeSlipOrder.AdvancePaid}</span>
                  </div>
                  <div className="flex justify-between text-rose-700 font-black text-sm">
                    <span>অবশিষ্ট বকেয়া:</span>
                    <span className="font-mono">{currencySymbol}{activeSlipOrder.DueAmount}</span>
                  </div>
                </div>

                <div className="text-center pt-2 text-[9px] text-slate-400">
                  <p>ডেলিভারি গ্রহণের সময় অনুগ্রহ করে এই রসিদটি সাথে আনবেন।</p>
                  <p className="mt-0.5">সিস্টেম প্রস্তুতকৃত ডিজিটাল টোকেন স্লিপ</p>
                </div>
              </div>

              {/* অ্যাকশন বাটন */}
              <div className="flex items-center space-x-2 pt-2">
                <button
                  onClick={() => window.print()}
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black transition-all flex items-center justify-center space-x-1.5 shadow-md cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>প্রিন্ট করুন</span>
                </button>
                <button
                  onClick={() => handleSendWhatsAppMemo(activeSlipOrder)}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black transition-all flex items-center justify-center space-x-1.5 shadow-md cursor-pointer"
                >
                  <Share2 className="w-4 h-4" />
                  <span>হোয়াটসঅ্যাপে পাঠান</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ================= ৪. বকেয়া আদায় মডাল ================= */}
        {dueCollectOrder && (
          <div className="fixed inset-0 z-[130] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-sm p-5 space-y-4 animate-in zoom-in-95">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h4 className="text-sm font-black text-slate-900">সেলাই মজুরি বকেয়া আদায়</h4>
                <button onClick={() => setDueCollectOrder(null)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-1">
                <p><span className="font-bold">গ্রাহক:</span> {dueCollectOrder.CustomerName}</p>
                <p><span className="font-bold">অর্ডার নং:</span> {dueCollectOrder.OrderID}</p>
                <p><span className="font-bold text-rose-600">বকেয়া পরিমাণ:</span> {currencySymbol}{dueCollectOrder.DueAmount}</p>
              </div>

              <form onSubmit={handleConfirmDueCollection} className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">আদায়কৃত টাকা (৳)</label>
                  <input
                    type="number"
                    required
                    min="1"
                    max={dueCollectOrder.DueAmount}
                    value={collectAmount}
                    onChange={(e) => setCollectAmount(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-black text-sm focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">পেমেন্ট মেথড</label>
                  <select
                    value={collectMethod}
                    onChange={(e) => setCollectMethod(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                  >
                    <option value="Cash">ক্যাশ (Cash)</option>
                    <option value="bKash">বিকাশ (bKash)</option>
                    <option value="Nagad">নগদ (Nagad)</option>
                    <option value="Card">কার্ড (Card)</option>
                  </select>
                </div>

                <div className="flex items-center space-x-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setDueCollectOrder(null)}
                    className="flex-1 py-2 bg-slate-200 text-slate-700 rounded-xl font-bold"
                  >
                    বাতিল
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2 bg-emerald-600 text-white rounded-xl font-black shadow-md hover:bg-emerald-700"
                  >
                    আদায় সম্পন্ন করুন
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

