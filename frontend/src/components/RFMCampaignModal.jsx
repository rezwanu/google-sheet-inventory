import React, { useState, useMemo } from 'react';
import {
  X,
  Users,
  Send,
  MessageSquare,
  Sparkles,
  Award,
  AlertTriangle,
  Clock,
  CheckCircle,
  Search,
  Filter,
  CheckSquare,
  Square,
  Copy,
  Tag,
  Gift,
  HelpCircle,
  TrendingUp,
  History,
  Phone,
  ArrowRight
} from 'lucide-react';
import { calculateRFMSegmentation, getLocalCampaigns, saveCampaignLocally } from '../services/storage';

export default function RFMCampaignModal({
  isOpen,
  onClose,
  customers = [],
  salesHistory = [],
  orders = [],
  currencySymbol = '৳',
  activeUser = null,
  storeSettings = {},
  onSendBulkSmsCampaign
}) {
  const [activeTab, setActiveTab] = useState('segments'); // 'segments' | 'compose' | 'history'

  // নির্বাচিত সেগমেন্ট ফিল্টার
  const [selectedSegmentTag, setSelectedSegmentTag] = useState('all'); // 'all' | 'champions' | 'loyal' | 'at_risk' | 'new_customers' | 'lost'

  // সার্চ ও সিলেকশন স্টেট
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedPhones, setSelectedPhones] = useState(new Set());

  // ক্যাম্পেইন ও এসএমএস স্টেট
  const [campaignTitle, setCampaignTitle] = useState('কাস্টমার রি-অ্যাক্টিভেশন ক্যাম্পেইন');
  const [smsTemplate, setSmsTemplate] = useState('প্রিয় {Name}, পাবনা বস্ত্রালয়ে আপনাকে মিস করছি! বিশেষ কেনাকাটায় ১০% ছাড় পেতে কোড ব্যবহার করুন: {VoucherCode}। আসুন: {StoreName}।');
  const [voucherCode, setVoucherCode] = useState('REENGAGE10');
  const [isSending, setIsSending] = useState(false);

  // ক্যাম্পেইন হিস্ট্রি স্টেট
  const [campaignHistory, setCampaignHistory] = useState(getLocalCampaigns);

  // RFM অ্যানালিটিক্স হিসাব
  const rfmData = useMemo(() => {
    return calculateRFMSegmentation(customers, salesHistory, orders);
  }, [customers, salesHistory, orders]);

  // ফিল্টারকৃত কাস্টমার তালিকা
  const displayedCustomers = useMemo(() => {
    let list = rfmData.allCustomers;

    if (selectedSegmentTag !== 'all') {
      list = rfmData.segments[selectedSegmentTag] || [];
    }

    if (customerSearch.trim()) {
      const q = customerSearch.trim().toLowerCase();
      list = list.filter((c) =>
        c.name.toLowerCase().includes(q) || c.phone.includes(q)
      );
    }

    return list;
  }, [rfmData, selectedSegmentTag, customerSearch]);

  // সিলেক্ট অল / আনসিলেক্ট
  const handleToggleSelectAll = () => {
    const validPhones = displayedCustomers.map((c) => c.phone).filter(p => p && p.length >= 11);
    const allSelected = validPhones.every((p) => selectedPhones.has(p));

    if (allSelected) {
      setSelectedPhones(new Set());
    } else {
      setSelectedPhones(new Set(validPhones));
    }
  };

  const handleToggleSinglePhone = (phone) => {
    if (!phone || phone.length < 11) return;
    const next = new Set(selectedPhones);
    if (next.has(phone)) {
      next.delete(phone);
    } else {
      next.add(phone);
    }
    setSelectedPhones(next);
  };

  // কুইক সেগমেন্ট ক্লিক করে পুরো সেগমেন্ট নির্বাচন
  const handleQuickSelectSegment = (tag) => {
    setSelectedSegmentTag(tag);
    const targetCusts = rfmData.segments[tag] || [];
    const validPhones = targetCusts.map((c) => c.phone).filter(p => p && p.length >= 11);
    setSelectedPhones(new Set(validPhones));

    // অটোমেটেড টেমপ্লেট সুপারিশ
    if (tag === 'at_risk') {
      setCampaignTitle('হারিয়ে যাওয়া ক্রেতা রি-অ্যাক্টিভেশন');
      setSmsTemplate('প্রিয় {Name}, পাবনা বস্ত্রালয়ে আপনাকে মিস করছি! আপনার জন্য বিশেষ ১৫% মূল্যছাড় ভাউচার: {VoucherCode}। আজই ভিজিট করুন: {StoreName}।');
      setVoucherCode('COMEBACK15');
    } else if (tag === 'champions') {
      setCampaignTitle('ভিআইপি ক্রেতা রিওয়ার্ড অফার');
      setSmsTemplate('শ্রদ্ধেয় {Name}, আমাদের সেরা ভিআইপি গ্রাহক হিসেবে আপনার আস্থার জন্য ধন্যবাদ! পরবর্তী অর্ডারে বিশেষ উপহার পেতে ভাউচার: {VoucherCode}। {StoreName}।');
      setVoucherCode('VIPGIFT');
    } else if (tag === 'new_customers') {
      setCampaignTitle('নতুন গ্রাহক ওয়েলকাম অফার');
      setSmsTemplate('প্রিয় {Name}, {StoreName}-এ আপনার প্রথম কেনাকাটার জন্য ধন্যবাদ! দ্বিতীয় অর্ডারে বিশেষ ১০% ছাড়ের ভাউচার: {VoucherCode}। শুভকামনা!');
      setVoucherCode('WELCOME10');
    }
  };

  // লাইভ মেসেজ প্রিভিউ জেনারেটর
  const previewMessage = useMemo(() => {
    const storeName = storeSettings?.StoreName || 'Pabna Bostraloy';
    return smsTemplate
      .replace(/\{Name\}|\{CustomerName\}/gi, 'মোঃ রহিম')
      .replace(/\{StoreName\}/gi, storeName)
      .replace(/\{VoucherCode\}|\{CouponCode\}/gi, voucherCode.trim() || 'PROMO10');
  }, [smsTemplate, storeSettings, voucherCode]);

  // মেসেজ ক্যারেক্টার ও এসএমএস কাউন্ট
  const charCount = previewMessage.length;
  const isUnicode = /[^\u0000-\u00ff]/.test(previewMessage);
  const smsCount = isUnicode
    ? (charCount <= 70 ? 1 : Math.ceil(charCount / 67))
    : (charCount <= 160 ? 1 : Math.ceil(charCount / 153));

  // বাল্ক এসএমএস ডিসপ্যাচ হ্যান্ডলার
  const handleDispatchCampaign = async () => {
    const targetList = displayedCustomers.filter((c) => selectedPhones.has(c.phone));
    if (targetList.length === 0) {
      alert('অনুগ্রহ করে অন্তত ১ জন গ্রাহককে নির্বাচন করুন।');
      return;
    }

    if (!confirm(`${targetList.length} জন গ্রাহককে এই এসএমএস ক্যাম্পেইন পাঠাতে চান? মোট এসএমএস গণনা: ${targetList.length * smsCount}টি।`)) {
      return;
    }

    setIsSending(true);
    try {
      const payload = {
        title: campaignTitle.trim(),
        segment: selectedSegmentTag,
        messageTemplate: smsTemplate.trim(),
        voucherCode: voucherCode.trim(),
        sentBy: activeUser?.FullName || 'Admin',
        recipients: targetList.map((c) => ({
          phone: c.phone,
          name: c.name,
          voucherCode: voucherCode.trim()
        }))
      };

      let result = { success: true, count: targetList.length };
      if (typeof onSendBulkSmsCampaign === 'function') {
        result = await onSendBulkSmsCampaign(payload);
      }

      // হিস্ট্রিতে সেভ
      saveCampaignLocally({
        Title: campaignTitle,
        TargetSegment: selectedSegmentTag,
        MessageTemplate: smsTemplate,
        RecipientCount: targetList.length,
        SuccessCount: targetList.length,
        Status: 'Sent',
        SentBy: activeUser?.FullName || 'Admin'
      });
      setCampaignHistory(getLocalCampaigns());

      alert(`সফলভাবে ${targetList.length} জন গ্রাহকের কাছে এসএমএস ক্যাম্পেইন পাঠানো হয়েছে!`);
      setActiveTab('history');
      setSelectedPhones(new Set());
    } catch (e) {
      alert(`ক্যাম্পেইন প্রেরণে সমস্যা: ${e.message}`);
    } finally {
      setIsSending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/70 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-6xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-auto flex flex-col max-h-[92vh]">
        
        {/* মডাল হেডার */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-900 via-purple-950 to-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-500/20 border border-purple-400/30 flex items-center justify-center text-purple-400 shadow-inner">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg font-black tracking-tight">RFM গ্রাহক সেগমেন্টেশন ও রি-টার্গেটিং ক্যাম্পেইন</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/30 text-purple-200 border border-purple-400/20">
                  Phase 8 AI Suite
                </span>
              </div>
              <p className="text-xs text-slate-300">
                গ্রাহকদের আচরণ ও কেনাকাটার ভিত্তিতে সেগমেন্টেশন এবং ১-ক্লিকে টার্গেটেড এসএমএস অফার প্রেরণ
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* ট্যাব নেভিগেশন */}
            <div className="bg-slate-800/80 p-1 rounded-xl flex items-center border border-slate-700/60">
              <button
                type="button"
                onClick={() => setActiveTab('segments')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeTab === 'segments'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                গ্রাহক সেগমেন্টেশন
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('compose')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center space-x-1.5 ${
                  activeTab === 'compose'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <span>এসএমএস ক্যাম্পেইন</span>
                {selectedPhones.size > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-amber-400 text-slate-950 font-bold">
                    {selectedPhones.size}
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('history')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeTab === 'history'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                ক্যাম্পেইন হিস্ট্রি
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* প্রধান বডি কন্টেন্ট */}
        {activeTab === 'segments' ? (
          /* ট্যাব ১: আরএফএম সেগমেন্টস ও কাস্টমার তালিকা */
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
            
            {/* সেগমেন্ট সামারি মেট্রিক্স কার্ডসমূহ */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              
              {/* কার্ড ১: চ্যাম্পিয়নস */}
              <button
                type="button"
                onClick={() => handleQuickSelectSegment('champions')}
                className={`p-3.5 rounded-2xl border text-left transition-all ${
                  selectedSegmentTag === 'champions'
                    ? 'bg-amber-50 border-amber-400 ring-2 ring-amber-400/20 shadow-md'
                    : 'bg-white border-slate-200 hover:border-amber-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xl">👑</span>
                  <span className="text-[10px] font-bold text-amber-700 bg-amber-100/80 px-2 py-0.5 rounded-full">VIP</span>
                </div>
                <div className="text-xl font-black text-slate-900 font-mono">
                  {rfmData.segments.champions.length} জন
                </div>
                <span className="text-xs font-bold text-slate-700 block mt-0.5">চ্যাম্পিয়ন (VIP)</span>
                <span className="text-[10px] text-slate-400 block mt-0.5">সবচেয়ে বেশি ও নিয়মিত ক্রেতা</span>
              </button>

              {/* কার্ড ২: বিশ্বস্ত ক্রেতা */}
              <button
                type="button"
                onClick={() => handleQuickSelectSegment('loyal')}
                className={`p-3.5 rounded-2xl border text-left transition-all ${
                  selectedSegmentTag === 'loyal'
                    ? 'bg-indigo-50 border-indigo-400 ring-2 ring-indigo-400/20 shadow-md'
                    : 'bg-white border-slate-200 hover:border-indigo-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xl">💎</span>
                  <span className="text-[10px] font-bold text-indigo-700 bg-indigo-100/80 px-2 py-0.5 rounded-full">Loyal</span>
                </div>
                <div className="text-xl font-black text-slate-900 font-mono">
                  {rfmData.segments.loyal.length} জন
                </div>
                <span className="text-xs font-bold text-slate-700 block mt-0.5">বিশ্বস্ত ক্রেতা</span>
                <span className="text-[10px] text-slate-400 block mt-0.5">পুনঃপুন কেনাকাটা করেন</span>
              </button>

              {/* কার্ড ৩: নতুন গ্রাহক */}
              <button
                type="button"
                onClick={() => handleQuickSelectSegment('new_customers')}
                className={`p-3.5 rounded-2xl border text-left transition-all ${
                  selectedSegmentTag === 'new_customers'
                    ? 'bg-emerald-50 border-emerald-400 ring-2 ring-emerald-400/20 shadow-md'
                    : 'bg-white border-slate-200 hover:border-emerald-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xl">🌱</span>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full">New</span>
                </div>
                <div className="text-xl font-black text-slate-900 font-mono">
                  {rfmData.segments.new_customers.length} জন
                </div>
                <span className="text-xs font-bold text-slate-700 block mt-0.5">নতুন গ্রাহক</span>
                <span className="text-[10px] text-slate-400 block mt-0.5">১ম বার কেনাকাটা করেছেন</span>
              </button>

              {/* কার্ড ৪: ঝুঁকিপূর্ণ / হারিয়ে যাওয়া */}
              <button
                type="button"
                onClick={() => handleQuickSelectSegment('at_risk')}
                className={`p-3.5 rounded-2xl border text-left transition-all ${
                  selectedSegmentTag === 'at_risk'
                    ? 'bg-rose-50 border-rose-400 ring-2 ring-rose-400/20 shadow-md animate-pulse'
                    : 'bg-white border-slate-200 hover:border-rose-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xl">⚠️</span>
                  <span className="text-[10px] font-bold text-rose-700 bg-rose-100/80 px-2 py-0.5 rounded-full">At-Risk</span>
                </div>
                <div className="text-xl font-black text-rose-600 font-mono">
                  {rfmData.segments.at_risk.length} জন
                </div>
                <span className="text-xs font-bold text-slate-700 block mt-0.5">হারানোর ঝুঁকিতে</span>
                <span className="text-[10px] text-rose-500 font-bold block mt-0.5">৬০+ দিন কোনো ক্রয় নেই!</span>
              </button>

              {/* কার্ড ৫: সম্পূর্ণ গ্রাহক */}
              <button
                type="button"
                onClick={() => { setSelectedSegmentTag('all'); setSelectedPhones(new Set()); }}
                className={`p-3.5 rounded-2xl border text-left transition-all ${
                  selectedSegmentTag === 'all'
                    ? 'bg-slate-900 text-white border-slate-900 shadow-md'
                    : 'bg-white border-slate-200 hover:border-slate-400'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xl">👥</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    selectedSegmentTag === 'all' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                  }`}>
                    মোট
                  </span>
                </div>
                <div className={`text-xl font-black font-mono ${selectedSegmentTag === 'all' ? 'text-white' : 'text-slate-900'}`}>
                  {rfmData.totalCustomers} জন
                </div>
                <span className={`text-xs font-bold block mt-0.5 ${selectedSegmentTag === 'all' ? 'text-slate-200' : 'text-slate-700'}`}>
                  সকল গ্রাহক তালিকা
                </span>
                <span className={`text-[10px] block mt-0.5 ${selectedSegmentTag === 'all' ? 'text-slate-300' : 'text-slate-400'}`}>
                  মোট সেলস: {currencySymbol}{Math.round(rfmData.totalRevenue).toLocaleString('en-IN')}
                </span>
              </button>

            </div>

            {/* ফিল্টার ও সিলেকশন অ্যাকশন বার */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-200">
              <div className="flex items-center space-x-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={handleToggleSelectAll}
                  className="px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100 flex items-center space-x-1.5 transition-colors"
                >
                  <CheckSquare className="w-3.5 h-3.5 text-purple-600" />
                  <span>
                    {displayedCustomers.filter(c => c.phone && c.phone.length >= 11).every(c => selectedPhones.has(c.phone)) && displayedCustomers.length > 0
                      ? 'সবগুলো বাতিল করুন'
                      : 'সবাইকে নির্বাচন করুন'}
                  </span>
                </button>

                {selectedPhones.size > 0 && (
                  <span className="text-xs font-bold text-purple-800 bg-purple-100 px-3 py-1 rounded-xl border border-purple-200">
                    নির্বাচিত: {selectedPhones.size} জন
                  </span>
                )}
              </div>

              <div className="flex items-center space-x-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-64">
                  <Search className="w-4 h-4 absolute left-3 top-2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="নাম বা মোবাইল নম্বর..."
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs focus:ring-1 focus:ring-purple-500"
                  />
                </div>

                {selectedPhones.size > 0 && (
                  <button
                    type="button"
                    onClick={() => setActiveTab('compose')}
                    className="px-4 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold flex items-center space-x-1 shadow-sm transition-all"
                  >
                    <span>এসএমএস ড্রাফট করুন</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* গ্রাহক তালিকা টেবিল */}
            <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold">
                    <th className="py-2.5 px-3 w-10 text-center">বাছাই</th>
                    <th className="py-2.5 px-3">গ্রাহকের নাম ও ফোন</th>
                    <th className="py-2.5 px-3 text-center">আরএফএম সেগমেন্ট</th>
                    <th className="py-2.5 px-3 text-center">মোট অর্ডার</th>
                    <th className="py-2.5 px-3 text-right">লাইফটাইম সেলস</th>
                    <th className="py-2.5 px-3 text-right">শেষ ক্রয়</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {displayedCustomers.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="py-8 text-center text-slate-400 text-xs">
                        কোনো গ্রাহক খুঁজে পাওয়া যায়নি।
                      </td>
                    </tr>
                  ) : (
                    displayedCustomers.map((cust) => {
                      const isSelected = selectedPhones.has(cust.phone);
                      const hasValidPhone = cust.phone && cust.phone.length >= 11;

                      return (
                        <tr
                          key={cust.customerId || cust.phone}
                          className={`hover:bg-slate-50/80 transition-colors ${
                            isSelected ? 'bg-purple-50/50' : ''
                          }`}
                        >
                          <td className="py-2 px-3 text-center">
                            <input
                              type="checkbox"
                              disabled={!hasValidPhone}
                              checked={isSelected}
                              onChange={() => handleToggleSinglePhone(cust.phone)}
                              className="rounded text-purple-600 focus:ring-purple-500 w-4 h-4 cursor-pointer disabled:opacity-30"
                            />
                          </td>
                          <td className="py-2 px-3">
                            <span className="font-bold text-slate-900 block">{cust.name}</span>
                            <span className="text-[11px] text-slate-500 font-mono">
                              {cust.phone || 'মোবাইল নেই'}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-center">
                            <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border ${cust.badgeColor}`}>
                              {cust.segmentLabel}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-center font-bold text-slate-700">
                            {cust.totalOrders} বার
                          </td>
                          <td className="py-2 px-3 text-right font-black font-mono text-slate-900">
                            {currencySymbol}{Math.round(cust.totalSpent).toLocaleString('en-IN')}
                          </td>
                          <td className="py-2 px-3 text-right text-slate-600">
                            {cust.daysSinceLastPurchase === 999 ? (
                              <span className="text-slate-400">—</span>
                            ) : (
                              <span>{cust.daysSinceLastPurchase} দিন আগে</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

          </div>
        ) : activeTab === 'compose' ? (
          /* ট্যাব ২: এসএমএস ড্রাফট ও ক্যাম্পেইন প্রেরণ */
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
            
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* বাম কলাম: কম্পোজার ও টেমপ্লেট নির্বাচন */}
              <div className="lg:col-span-7 space-y-4">
                
                {/* ক্যাম্পেইন শিরোনাম */}
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">ক্যাম্পেইনের নাম:</label>
                  <input
                    type="text"
                    value={campaignTitle}
                    onChange={(e) => setCampaignTitle(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold focus:ring-1 focus:ring-purple-500"
                  />
                </div>

                {/* কুইক টেমপ্লেট নির্বাচন বাটনসমূহ */}
                <div>
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                    রেডিমেড প্রমোশনাল টেমপ্লেট বাছুন:
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setCampaignTitle('At-Risk গ্রাহক রি-অ্যাক্টিভেশন');
                        setSmsTemplate('প্রিয় {Name}, পাবনা বস্ত্রালয়ে আপনাকে মিস করছি! আপনার জন্য বিশেষ ১৫% মূল্যছাড় ভাউচার: {VoucherCode}। আজই ভিজিট করুন: {StoreName}।');
                        setVoucherCode('COMEBACK15');
                      }}
                      className="p-2 text-left bg-rose-50 hover:bg-rose-100/80 rounded-xl border border-rose-200 text-xs transition-all"
                    >
                      <strong className="text-rose-900 block font-bold">⚠️ At-Risk অফার (১৫% ছাড়)</strong>
                      <span className="text-[10px] text-rose-700">হারিয়ে যাওয়া ক্রেতা ফিরিয়ে আনতে</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setCampaignTitle('ভিআইপি ক্রেতা রিওয়ার্ড');
                        setSmsTemplate('শ্রদ্ধেয় {Name}, আমাদের সেরা ভিআইপি গ্রাহক হিসেবে আপনার আস্থার জন্য ধন্যবাদ! পরবর্তী অর্ডারে বিশেষ উপহার পেতে ভাউচার: {VoucherCode}। {StoreName}।');
                        setVoucherCode('VIPGIFT');
                      }}
                      className="p-2 text-left bg-amber-50 hover:bg-amber-100/80 rounded-xl border border-amber-200 text-xs transition-all"
                    >
                      <strong className="text-amber-900 block font-bold">👑 ভিআইপি রিওয়ার্ড অফার</strong>
                      <span className="text-[10px] text-amber-700">চ্যাম্পিয়ন ক্রেতাদের কৃতজ্ঞতা বার্তা</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setCampaignTitle('নতুন গ্রাহক ওয়েলকাম');
                        setSmsTemplate('প্রিয় {Name}, {StoreName}-এ আপনার প্রথম কেনাকাটার জন্য ধন্যবাদ! দ্বিতীয় অর্ডারে বিশেষ ১০% ছাড়ের ভাউচার: {VoucherCode}। শুভকামনা!');
                        setVoucherCode('WELCOME10');
                      }}
                      className="p-2 text-left bg-emerald-50 hover:bg-emerald-100/80 rounded-xl border border-emerald-200 text-xs transition-all"
                    >
                      <strong className="text-emerald-900 block font-bold">🌱 নতুন গ্রাহক ওয়েলকাম</strong>
                      <span className="text-[10px] text-emerald-700">দ্বিতীয় কেনাকাটায় উৎসাহিত করতে</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setCampaignTitle('স্টক ক্লিয়ারেন্স মেগা অফার');
                        setSmsTemplate('পাবনা বস্ত্রালয়ে সীমিত সময়ের বিশেষ মেগা ক্লিয়ারেন্স অফার! সকল পোশাকে আকর্ষণীয় মূল্যছাড়। আজই চলে আসুন: {StoreName}।');
                        setVoucherCode('CLEARANCE');
                      }}
                      className="p-2 text-left bg-purple-50 hover:bg-purple-100/80 rounded-xl border border-purple-200 text-xs transition-all"
                    >
                      <strong className="text-purple-900 block font-bold">🔥 মেগা স্টক ক্লিয়ারেন্স</strong>
                      <span className="text-[10px] text-purple-700">অচল স্টক দ্রুত বিক্রির জন্য</span>
                    </button>
                  </div>
                </div>

                {/* ভাউচার কোড ইনপুট */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">কুপন / ভাউচার কোড:</label>
                    <input
                      type="text"
                      placeholder="যেমন: COMEBACK15"
                      value={voucherCode}
                      onChange={(e) => setVoucherCode(e.target.value.toUpperCase())}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold uppercase focus:ring-1 focus:ring-purple-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">নির্বাচিত প্রাপক সংখ্যা:</label>
                    <div className="px-3 py-2 bg-purple-50 border border-purple-200 rounded-xl text-xs font-bold text-purple-900 flex items-center justify-between">
                      <span>মোট প্রাপক:</span>
                      <span className="text-sm font-black font-mono">{selectedPhones.size} জন</span>
                    </div>
                  </div>
                </div>

                {/* মেসেজ টেক্সটেরিয়া */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-700">মেসেজ কন্টেন্ট:</label>
                    <div className="flex items-center space-x-2 text-[10px] text-slate-400">
                      <span>ভেরিয়েবল:</span>
                      <span className="font-mono font-bold text-purple-600 bg-purple-50 px-1 rounded">{'{Name}'}</span>
                      <span className="font-mono font-bold text-purple-600 bg-purple-50 px-1 rounded">{'{StoreName}'}</span>
                      <span className="font-mono font-bold text-purple-600 bg-purple-50 px-1 rounded">{'{VoucherCode}'}</span>
                    </div>
                  </div>
                  <textarea
                    rows={4}
                    value={smsTemplate}
                    onChange={(e) => setSmsTemplate(e.target.value)}
                    className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:bg-white focus:ring-2 focus:ring-purple-500 leading-relaxed"
                  />
                  <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1">
                    <span>
                      ক্যারেক্টার: <strong className="text-slate-800">{charCount}</strong> ({isUnicode ? 'বাংলা / ইউনিকোড' : 'ইংরেজি'})
                    </span>
                    <span className="font-bold text-purple-700">
                      প্রতি কাস্টমার: {smsCount}টি এসএমএস (মোট: {selectedPhones.size * smsCount}টি)
                    </span>
                  </div>
                </div>

              </div>

              {/* ডান কলাম: লাইভ মোবাইল স্ক্রিন প্রিভিউ */}
              <div className="lg:col-span-5 flex flex-col items-center justify-center">
                <div className="w-full max-w-xs bg-slate-900 rounded-[36px] p-3 shadow-2xl border-4 border-slate-700 relative">
                  {/* স্পিকার নচ */}
                  <div className="w-20 h-3 bg-slate-800 rounded-full mx-auto mb-3" />

                  {/* মোবাইল স্ক্রিন */}
                  <div className="bg-slate-100 rounded-[28px] p-4 text-xs min-h-[340px] flex flex-col justify-between">
                    <div>
                      <div className="text-center pb-2 border-b border-slate-200 mb-3">
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">SMS Message</span>
                        <span className="text-xs font-black text-slate-800">{storeSettings?.StoreName || 'Pabna Bostraloy'}</span>
                      </div>

                      {/* মেসেজ বাবল */}
                      <div className="bg-white p-3 rounded-2xl shadow-xs border border-slate-200 text-slate-800 text-xs leading-relaxed relative">
                        {previewMessage}
                        <span className="text-[9px] text-slate-400 block text-right mt-1.5">এখন • SMS</span>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-200 text-[10px] text-center text-slate-400">
                      প্রাপক: <strong>{selectedPhones.size} জন</strong> • গ্রিনওয়েব / বাল্ক এসএমএস
                    </div>
                  </div>
                </div>

                {/* সেন্ড বাটন */}
                <div className="w-full max-w-xs mt-4">
                  <button
                    type="button"
                    onClick={handleDispatchCampaign}
                    disabled={isSending || selectedPhones.size === 0}
                    className="w-full py-3 bg-purple-600 hover:bg-purple-700 active:scale-98 text-white font-black rounded-2xl shadow-lg transition-all flex items-center justify-center space-x-2 text-xs disabled:opacity-50"
                  >
                    <Send className="w-4 h-4" />
                    <span>{isSending ? 'পাঠানো হচ্ছে...' : `${selectedPhones.size} জনকে এসএমএস পাঠান`}</span>
                  </button>
                </div>
              </div>

            </div>

          </div>
        ) : (
          /* ট্যাব ৩: ক্যাম্পেইন হিস্ট্রি */
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
            
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-500">
              পূর্বে প্রেরিত এসএমএস ক্যাম্পেইন রিপোর্ট ({campaignHistory.length}টি)
            </h3>

            {campaignHistory.length === 0 ? (
              <div className="py-12 text-center text-slate-400 space-y-2">
                <History className="w-10 h-10 mx-auto stroke-1 text-slate-300" />
                <p className="text-sm font-bold text-slate-600">কোনো পূর্ববর্তী ক্যাম্পেইন হিস্ট্রি নেই</p>
                <p className="text-xs">নতুন কোনো এসএমএস ক্যাম্পেইন পাঠানো হলে তা এখানে সংরক্ষিত থাকবে।</p>
              </div>
            ) : (
              <div className="space-y-3">
                {campaignHistory.map((camp, idx) => (
                  <div
                    key={camp.CampaignID || idx}
                    className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-xs text-purple-900 bg-purple-50 px-2 py-0.5 rounded-lg border border-purple-200">
                          {camp.Title}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          • {new Date(camp.SentAt).toLocaleString('bn-BD')}
                        </span>
                      </div>
                      <p className="text-xs text-slate-700 bg-slate-50 p-2 rounded-xl border border-slate-100 max-w-xl">
                        "{camp.MessageTemplate}"
                      </p>
                      <div className="text-[11px] text-slate-500">
                        টার্গেট সেগমেন্ট: <strong className="text-slate-800">{camp.TargetSegment}</strong>
                        • প্রেরক: <strong className="text-slate-800">{camp.SentBy}</strong>
                      </div>
                    </div>

                    <div className="text-right sm:border-l sm:pl-4 border-slate-200">
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">মোট প্রাপক</span>
                      <span className="text-lg font-black font-mono text-emerald-600">
                        {camp.RecipientCount} জন
                      </span>
                      <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full font-bold block mt-0.5">
                        সফলভাবে প্রেরিত
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

          </div>
        )}

      </div>
    </div>
  );
}

