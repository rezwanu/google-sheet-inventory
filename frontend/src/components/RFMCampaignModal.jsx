import React, { useState, useMemo } from 'react';
import {
  X,
  Send,
  Sparkles,
  Search,
  CheckSquare,
  History,
  ArrowRight,
  Crown,
  Award,
  UserPlus,
  AlertTriangle,
  Users,
  Flame
} from 'lucide-react';
import { calculateRFMSegmentation, getLocalCampaigns, saveCampaignLocally } from '../services/storage';

export default function RFMCampaignModal({
  isOpen,
  onClose,
  embedded = false,
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

  if (!isOpen && !embedded) return null;

  return (
    <div className={embedded ? "w-full flex-1 flex flex-col min-h-0 bg-transparent animate-in fade-in duration-200" : "fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-neutral-900/40 overflow-y-auto"}>
      <div className={embedded ? "relative w-full bg-white rounded-lg border border-neutral-200/80 overflow-hidden flex flex-col flex-1 min-h-[calc(100vh-6.5rem)]" : "relative w-full max-w-6xl bg-white rounded-lg border border-neutral-200/80 overflow-hidden my-auto flex flex-col max-h-[92vh]"}>
        
        {/* মডাল হেডার */}
        <div className="px-4 sm:px-6 py-4 bg-[#FAFAFA] border-b border-neutral-200/80 text-[#111111] flex flex-col lg:flex-row lg:items-center justify-between gap-3 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-md bg-white border border-neutral-200/80 flex items-center justify-center text-[#0F172A] shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base sm:text-lg font-semibold tracking-tight text-[#111111]">RFM গ্রাহক সেগমেন্টেশন ও রি-টার্গেটিং ক্যাম্পেইন</h2>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-[#F5F5F5] text-[#525252] border border-neutral-200/80">
                  Phase 8 AI Suite
                </span>
              </div>
              <p className="text-xs text-[#525252] mt-0.5">
                গ্রাহকদের আচরণ ও কেনাকাটার ভিত্তিতে সেগমেন্টেশন এবং ১-ক্লিকে টার্গেটেড এসএমএস অফার প্রেরণ
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between sm:justify-end space-x-2">
            {/* ট্যাব নেভিগেশন */}
            <div className="bg-[#F5F5F5] p-1 rounded-md flex items-center border border-neutral-200/80 overflow-x-auto">
              <button
                type="button"
                onClick={() => setActiveTab('segments')}
                className={`min-h-[44px] sm:min-h-[36px] px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap cursor-pointer border ${
                  activeTab === 'segments'
                    ? 'border-[#0F172A] bg-[#0F172A] text-white'
                    : 'border-transparent text-[#525252] hover:text-[#111111]'
                }`}
              >
                গ্রাহক সেগমেন্টেশন
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('compose')}
                className={`min-h-[44px] sm:min-h-[36px] px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center space-x-1.5 whitespace-nowrap cursor-pointer border ${
                  activeTab === 'compose'
                    ? 'border-[#0F172A] bg-[#0F172A] text-white'
                    : 'border-transparent text-[#525252] hover:text-[#111111]'
                }`}
              >
                <span>এসএমএস ক্যাম্পেইন</span>
                {selectedPhones.size > 0 && (
                  <span className="px-1.5 py-0.5 rounded-md text-[10px] bg-amber-50 text-[#B45309] border border-amber-200/80 font-mono tabular-nums font-semibold">
                    {selectedPhones.size}
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('history')}
                className={`min-h-[44px] sm:min-h-[36px] px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap cursor-pointer border ${
                  activeTab === 'history'
                    ? 'border-[#0F172A] bg-[#0F172A] text-white'
                    : 'border-transparent text-[#525252] hover:text-[#111111]'
                }`}
              >
                ক্যাম্পেইন হিস্ট্রি
              </button>
            </div>

            <button
              onClick={onClose}
              className={`min-h-[44px] sm:min-h-[36px] rounded-md transition-colors cursor-pointer flex items-center space-x-1 shrink-0 ${
                embedded
                  ? 'px-3 py-1.5 bg-white hover:bg-[#F5F5F5] text-[#111111] font-medium text-xs border border-neutral-200/80'
                  : 'min-w-[44px] sm:min-w-[36px] p-2 text-[#525252] hover:text-[#111111] hover:bg-neutral-200/60 justify-center'
              }`}
              title={embedded ? "সেলস ক্যাটালগে ফিরে যান" : "বন্ধ করুন"}
            >
              {embedded ? (
                <>
                  <span className="text-sm font-medium">←</span>
                  <span className="hidden sm:inline">ক্যাটালগে ফিরুন</span>
                </>
              ) : (
                <X className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>

        {/* প্রধান বডি কন্টেন্ট */}
        {activeTab === 'segments' ? (
          /* ট্যাব ১: আরএফএম সেগমেন্টস ও কাস্টমার তালিকা */
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 bg-[#FAFAFA]">
            
            {/* সেগমেন্ট সামারি মেট্রিক্স কার্ডসমূহ */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              
              {/* কার্ড ১: চ্যাম্পিয়নস */}
              <button
                type="button"
                onClick={() => handleQuickSelectSegment('champions')}
                className={`p-3.5 rounded-lg border text-left transition-colors cursor-pointer ${
                  selectedSegmentTag === 'champions'
                    ? 'bg-amber-50/70 border-[#0F172A] ring-1 ring-[#0F172A]'
                    : 'bg-white border-neutral-200/80 hover:border-neutral-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <Crown className="w-5 h-5 text-[#B45309]" />
                  <span className="text-[10px] font-medium text-[#B45309] bg-amber-50 border border-amber-200/80 px-2 py-0.5 rounded-md">VIP</span>
                </div>
                <div className="text-xl font-semibold text-[#111111] font-mono tabular-nums">
                  {rfmData.segments.champions.length} জন
                </div>
                <span className="text-xs font-semibold text-[#111111] block mt-0.5">চ্যাম্পিয়ন (VIP)</span>
                <span className="text-[10px] text-[#737373] block mt-0.5">সবচেয়ে বেশি ও নিয়মিত ক্রেতা</span>
              </button>

              {/* কার্ড ২: বিশ্বস্ত ক্রেতা */}
              <button
                type="button"
                onClick={() => handleQuickSelectSegment('loyal')}
                className={`p-3.5 rounded-lg border text-left transition-colors cursor-pointer ${
                  selectedSegmentTag === 'loyal'
                    ? 'bg-[#F5F5F5] border-[#0F172A] ring-1 ring-[#0F172A]'
                    : 'bg-white border-neutral-200/80 hover:border-neutral-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <Award className="w-5 h-5 text-[#0F172A]" />
                  <span className="text-[10px] font-medium text-[#525252] bg-[#F5F5F5] border border-neutral-200/80 px-2 py-0.5 rounded-md">Loyal</span>
                </div>
                <div className="text-xl font-semibold text-[#111111] font-mono tabular-nums">
                  {rfmData.segments.loyal.length} জন
                </div>
                <span className="text-xs font-semibold text-[#111111] block mt-0.5">বিশ্বস্ত ক্রেতা</span>
                <span className="text-[10px] text-[#737373] block mt-0.5">পুনঃপুন কেনাকাটা করেন</span>
              </button>

              {/* কার্ড ৩: নতুন গ্রাহক */}
              <button
                type="button"
                onClick={() => handleQuickSelectSegment('new_customers')}
                className={`p-3.5 rounded-lg border text-left transition-colors cursor-pointer ${
                  selectedSegmentTag === 'new_customers'
                    ? 'bg-emerald-50/70 border-[#0F172A] ring-1 ring-[#0F172A]'
                    : 'bg-white border-neutral-200/80 hover:border-neutral-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <UserPlus className="w-5 h-5 text-[#15803D]" />
                  <span className="text-[10px] font-medium text-[#15803D] bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 rounded-md">New</span>
                </div>
                <div className="text-xl font-semibold text-[#111111] font-mono tabular-nums">
                  {rfmData.segments.new_customers.length} জন
                </div>
                <span className="text-xs font-semibold text-[#111111] block mt-0.5">নতুন গ্রাহক</span>
                <span className="text-[10px] text-[#737373] block mt-0.5">১ম বার কেনাকাটা করেছেন</span>
              </button>

              {/* কার্ড ৪: ঝুঁকিপূর্ণ / হারিয়ে যাওয়া */}
              <button
                type="button"
                onClick={() => handleQuickSelectSegment('at_risk')}
                className={`p-3.5 rounded-lg border text-left transition-colors cursor-pointer ${
                  selectedSegmentTag === 'at_risk'
                    ? 'bg-red-50/70 border-[#0F172A] ring-1 ring-[#0F172A]'
                    : 'bg-white border-neutral-200/80 hover:border-neutral-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <AlertTriangle className="w-5 h-5 text-[#B91C1C]" />
                  <span className="text-[10px] font-medium text-[#B91C1C] bg-red-50 border border-red-200/80 px-2 py-0.5 rounded-md">At-Risk</span>
                </div>
                <div className="text-xl font-semibold text-[#B91C1C] font-mono tabular-nums">
                  {rfmData.segments.at_risk.length} জন
                </div>
                <span className="text-xs font-semibold text-[#111111] block mt-0.5">হারানোর ঝুঁকিতে</span>
                <span className="text-[10px] text-[#B91C1C] font-medium block mt-0.5">৬০+ দিন কোনো ক্রয় নেই!</span>
              </button>

              {/* কার্ড ৫: সম্পূর্ণ গ্রাহক */}
              <button
                type="button"
                onClick={() => { setSelectedSegmentTag('all'); setSelectedPhones(new Set()); }}
                className={`p-3.5 rounded-lg border text-left transition-colors cursor-pointer ${
                  selectedSegmentTag === 'all'
                    ? 'bg-[#0F172A] text-white border-[#0F172A]'
                    : 'bg-white border-neutral-200/80 hover:border-neutral-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <Users className={`w-5 h-5 ${selectedSegmentTag === 'all' ? 'text-white' : 'text-[#0F172A]'}`} />
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-md border ${
                    selectedSegmentTag === 'all' ? 'bg-white/15 text-white border-white/20' : 'bg-[#F5F5F5] text-[#525252] border-neutral-200/80'
                  }`}>
                    মোট
                  </span>
                </div>
                <div className={`text-xl font-semibold font-mono tabular-nums ${selectedSegmentTag === 'all' ? 'text-white' : 'text-[#111111]'}`}>
                  {rfmData.totalCustomers} জন
                </div>
                <span className={`text-xs font-semibold block mt-0.5 ${selectedSegmentTag === 'all' ? 'text-slate-200' : 'text-[#111111]'}`}>
                  সকল গ্রাহক তালিকা
                </span>
                <span className={`text-[10px] font-mono tabular-nums block mt-0.5 ${selectedSegmentTag === 'all' ? 'text-slate-300' : 'text-[#737373]'}`}>
                  মোট সেলস: {currencySymbol}{Math.round(rfmData.totalRevenue).toLocaleString('en-IN')}
                </span>
              </button>

            </div>

            {/* ফিল্টার ও সিলেকশন অ্যাকশন বার */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-lg border border-neutral-200/80">
              <div className="flex items-center space-x-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={handleToggleSelectAll}
                  className="min-h-[44px] sm:min-h-[36px] px-3 py-1.5 bg-white border border-neutral-200/80 rounded-md text-xs font-medium text-[#111111] hover:bg-[#F5F5F5] flex items-center space-x-1.5 transition-colors cursor-pointer"
                >
                  <CheckSquare className="w-3.5 h-3.5 text-[#0F172A]" />
                  <span>
                    {displayedCustomers.filter(c => c.phone && c.phone.length >= 11).every(c => selectedPhones.has(c.phone)) && displayedCustomers.length > 0
                      ? 'সবগুলো বাতিল করুন'
                      : 'সবাইকে নির্বাচন করুন'}
                  </span>
                </button>

                {selectedPhones.size > 0 && (
                  <span className="text-xs font-medium text-[#111111] bg-[#F5F5F5] px-3 py-1.5 rounded-md border border-neutral-200/80 font-mono tabular-nums">
                    নির্বাচিত: {selectedPhones.size} জন
                  </span>
                )}
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-64">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#737373]" />
                  <input
                    type="text"
                    placeholder="নাম বা মোবাইল নম্বর..."
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    className="w-full min-h-[44px] sm:min-h-[36px] pl-9 pr-3 py-1.5 bg-[#FAFAFA] border border-neutral-200/80 rounded-md text-xs text-[#111111] focus:outline-none focus:bg-white focus:border-[#0F172A] focus:ring-1 focus:ring-[#0F172A]"
                  />
                </div>

                {selectedPhones.size > 0 && (
                  <button
                    type="button"
                    onClick={() => setActiveTab('compose')}
                    className="min-h-[44px] sm:min-h-[36px] px-4 py-1.5 bg-[#0F172A] hover:bg-slate-800 text-white rounded-md text-xs font-medium flex items-center justify-center space-x-1.5 transition-colors cursor-pointer"
                  >
                    <span>এসএমএস ড্রাফট করুন</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* গ্রাহক তালিকা টেবিল */}
            <div className="border border-neutral-200/80 rounded-lg overflow-hidden bg-white">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="bg-[#F5F5F5] border-b border-neutral-200/80 text-[#525252] font-medium">
                      <th className="py-2.5 px-3 w-10 text-center">বাছাই</th>
                      <th className="py-2.5 px-3">গ্রাহকের নাম ও ফোন</th>
                      <th className="py-2.5 px-3 text-center">আরএফএম সেগমেন্ট</th>
                      <th className="py-2.5 px-3 text-center">মোট অর্ডার</th>
                      <th className="py-2.5 px-3 text-right">লাইফটাইম সেলস</th>
                      <th className="py-2.5 px-3 text-right">শেষ ক্রয়</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200/80">
                    {displayedCustomers.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="py-8 text-center text-[#737373] text-xs">
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
                            className={`hover:bg-[#FAFAFA] transition-colors ${
                              isSelected ? 'bg-slate-100/70' : ''
                            }`}
                          >
                            <td className="py-2.5 px-3 text-center">
                              <input
                                type="checkbox"
                                disabled={!hasValidPhone}
                                checked={isSelected}
                                onChange={() => handleToggleSinglePhone(cust.phone)}
                                className="rounded accent-[#0F172A] w-4 h-4 cursor-pointer disabled:opacity-30"
                              />
                            </td>
                            <td className="py-2.5 px-3">
                              <span className="font-semibold text-[#111111] block">{cust.name}</span>
                              <span className="text-[11px] text-[#525252] font-mono tabular-nums">
                                {cust.phone || 'মোবাইল নেই'}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <span className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-medium border ${cust.badgeColor}`}>
                                {cust.segmentLabel}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-center font-medium font-mono tabular-nums text-[#111111]">
                              {cust.totalOrders} বার
                            </td>
                            <td className="py-2.5 px-3 text-right font-semibold font-mono tabular-nums text-[#111111]">
                              {currencySymbol}{Math.round(cust.totalSpent).toLocaleString('en-IN')}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono tabular-nums text-[#525252]">
                              {cust.daysSinceLastPurchase === 999 ? (
                                <span className="text-[#737373]">—</span>
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

          </div>
        ) : activeTab === 'compose' ? (
          /* ট্যাব ২: এসএমএস ড্রাফট ও ক্যাম্পেইন প্রেরণ */
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 bg-[#FAFAFA]">
            
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* বাম কলাম: কম্পোজার ও টেমপ্লেট নির্বাচন */}
              <div className="lg:col-span-7 space-y-4 bg-white p-4 sm:p-5 rounded-lg border border-neutral-200/80">
                
                {/* ক্যাম্পেইন শিরোনাম */}
                <div>
                  <label className="text-xs font-medium text-[#525252] block mb-1">ক্যাম্পেইনের নাম:</label>
                  <input
                    type="text"
                    value={campaignTitle}
                    onChange={(e) => setCampaignTitle(e.target.value)}
                    className="w-full min-h-[44px] sm:min-h-[36px] px-3 py-2 bg-[#FAFAFA] border border-neutral-200/80 rounded-md text-xs font-medium text-[#111111] focus:outline-none focus:bg-white focus:border-[#0F172A] focus:ring-1 focus:ring-[#0F172A]"
                  />
                </div>

                {/* কুইক টেমপ্লেট নির্বাচন বাটনসমূহ */}
                <div>
                  <span className="text-xs font-medium text-[#525252] uppercase tracking-wider block mb-1.5">
                    রেডিমেড প্রমোশনাল টেমপ্লেট বাছুন:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setCampaignTitle('At-Risk গ্রাহক রি-অ্যাক্টিভেশন');
                        setSmsTemplate('প্রিয় {Name}, পাবনা বস্ত্রালয়ে আপনাকে মিস করছি! আপনার জন্য বিশেষ ১৫% মূল্যছাড় ভাউচার: {VoucherCode}। আজই ভিজিট করুন: {StoreName}।');
                        setVoucherCode('COMEBACK15');
                      }}
                      className="min-h-[44px] p-2.5 text-left bg-red-50 hover:bg-red-100/80 rounded-md border border-red-200/80 text-xs transition-colors cursor-pointer"
                    >
                      <strong className="text-[#B91C1C] flex items-center gap-1.5 font-semibold">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                        <span>At-Risk অফার (১৫% ছাড়)</span>
                      </strong>
                      <span className="text-[10px] text-[#B91C1C] block mt-0.5">হারিয়ে যাওয়া ক্রেতা ফিরিয়ে আনতে</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setCampaignTitle('ভিআইপি ক্রেতা রিওয়ার্ড');
                        setSmsTemplate('শ্রদ্ধেয় {Name}, আমাদের সেরা ভিআইপি গ্রাহক হিসেবে আপনার আস্থার জন্য ধন্যবাদ! পরবর্তী অর্ডারে বিশেষ উপহার পেতে ভাউচার: {VoucherCode}। {StoreName}।');
                        setVoucherCode('VIPGIFT');
                      }}
                      className="min-h-[44px] p-2.5 text-left bg-amber-50 hover:bg-amber-100/80 rounded-md border border-amber-200/80 text-xs transition-colors cursor-pointer"
                    >
                      <strong className="text-[#B45309] flex items-center gap-1.5 font-semibold">
                        <Crown className="w-3.5 h-3.5 shrink-0" />
                        <span>ভিআইপি রিওয়ার্ড অফার</span>
                      </strong>
                      <span className="text-[10px] text-[#B45309] block mt-0.5">চ্যাম্পিয়ন ক্রেতাদের কৃতজ্ঞতা বার্তা</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setCampaignTitle('নতুন গ্রাহক ওয়েলকাম');
                        setSmsTemplate('প্রিয় {Name}, {StoreName}-এ আপনার প্রথম কেনাকাটার জন্য ধন্যবাদ! দ্বিতীয় অর্ডারে বিশেষ ১০% ছাড়ের ভাউচার: {VoucherCode}। শুভকামনা!');
                        setVoucherCode('WELCOME10');
                      }}
                      className="min-h-[44px] p-2.5 text-left bg-emerald-50 hover:bg-emerald-100/80 rounded-md border border-emerald-200/80 text-xs transition-colors cursor-pointer"
                    >
                      <strong className="text-[#15803D] flex items-center gap-1.5 font-semibold">
                        <UserPlus className="w-3.5 h-3.5 shrink-0" />
                        <span>নতুন গ্রাহক ওয়েলকাম</span>
                      </strong>
                      <span className="text-[10px] text-[#15803D] block mt-0.5">দ্বিতীয় কেনাকাটায় উৎসাহিত করতে</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setCampaignTitle('স্টক ক্লিয়ারেন্স মেগা অফার');
                        setSmsTemplate('পাবনা বস্ত্রালয়ে সীমিত সময়ের বিশেষ মেগা ক্লিয়ারেন্স অফার! সকল পোশাকে আকর্ষণীয় মূল্যছাড়। আজই চলে আসুন: {StoreName}।');
                        setVoucherCode('CLEARANCE');
                      }}
                      className="min-h-[44px] p-2.5 text-left bg-[#F5F5F5] hover:bg-neutral-200/70 rounded-md border border-neutral-200/80 text-xs transition-colors cursor-pointer"
                    >
                      <strong className="text-[#111111] flex items-center gap-1.5 font-semibold">
                        <Flame className="w-3.5 h-3.5 shrink-0" />
                        <span>মেগা স্টক ক্লিয়ারেন্স</span>
                      </strong>
                      <span className="text-[10px] text-[#525252] block mt-0.5">অচল স্টক দ্রুত বিক্রির জন্য</span>
                    </button>
                  </div>
                </div>

                {/* ভাউচার কোড ইনপুট */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-[#525252] block mb-1">কুপন / ভাউচার কোড:</label>
                    <input
                      type="text"
                      placeholder="যেমন: COMEBACK15"
                      value={voucherCode}
                      onChange={(e) => setVoucherCode(e.target.value.toUpperCase())}
                      className="w-full min-h-[44px] sm:min-h-[36px] px-3 py-2 bg-[#FAFAFA] border border-neutral-200/80 rounded-md text-xs font-mono font-semibold uppercase text-[#111111] focus:outline-none focus:bg-white focus:border-[#0F172A] focus:ring-1 focus:ring-[#0F172A]"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-[#525252] block mb-1">নির্বাচিত প্রাপক সংখ্যা:</label>
                    <div className="min-h-[44px] sm:min-h-[36px] px-3 py-2 bg-[#F5F5F5] border border-neutral-200/80 rounded-md text-xs font-medium text-[#111111] flex items-center justify-between">
                      <span>মোট প্রাপক:</span>
                      <span className="text-sm font-semibold font-mono tabular-nums">{selectedPhones.size} জন</span>
                    </div>
                  </div>
                </div>

                {/* মেসেজ টেক্সটেরিয়া */}
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                    <label className="text-xs font-medium text-[#525252]">মেসেজ কন্টেন্ট:</label>
                    <div className="flex items-center space-x-1.5 text-[10px] text-[#737373]">
                      <span>ভেরিয়েবল:</span>
                      <span className="font-mono font-medium text-[#0F172A] bg-[#F5F5F5] border border-neutral-200/80 px-1.5 py-0.5 rounded-md">{'{Name}'}</span>
                      <span className="font-mono font-medium text-[#0F172A] bg-[#F5F5F5] border border-neutral-200/80 px-1.5 py-0.5 rounded-md">{'{StoreName}'}</span>
                      <span className="font-mono font-medium text-[#0F172A] bg-[#F5F5F5] border border-neutral-200/80 px-1.5 py-0.5 rounded-md">{'{VoucherCode}'}</span>
                    </div>
                  </div>
                  <textarea
                    rows={4}
                    value={smsTemplate}
                    onChange={(e) => setSmsTemplate(e.target.value)}
                    className="w-full p-3 bg-[#FAFAFA] border border-neutral-200/80 rounded-md text-xs text-[#111111] focus:outline-none focus:bg-white focus:border-[#0F172A] focus:ring-1 focus:ring-[#0F172A] leading-relaxed"
                  />
                  <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#525252] mt-1.5">
                    <span>
                      ক্যারেক্টার: <strong className="text-[#111111] font-mono tabular-nums">{charCount}</strong> ({isUnicode ? 'বাংলা / ইউনিকোড' : 'ইংরেজি'})
                    </span>
                    <span className="font-medium text-[#111111] font-mono tabular-nums">
                      প্রতি কাস্টমার: {smsCount}টি এসএমএস (মোট: {selectedPhones.size * smsCount}টি)
                    </span>
                  </div>
                </div>

              </div>

              {/* ডান কলাম: লাইভ মোবাইল স্ক্রিন প্রিভিউ */}
              <div className="lg:col-span-5 flex flex-col items-center justify-center">
                <div className="w-full max-w-xs bg-[#0F172A] rounded-lg p-3 border border-slate-800 relative">
                  {/* স্পিকার নচ */}
                  <div className="w-16 h-1.5 bg-slate-700 rounded-full mx-auto mb-3" />

                  {/* মোবাইল স্ক্রিন */}
                  <div className="bg-[#F5F5F5] rounded-md p-4 text-xs min-h-[320px] flex flex-col justify-between">
                    <div>
                      <div className="text-center pb-2 border-b border-neutral-200/80 mb-3">
                        <span className="text-[10px] text-[#737373] font-medium uppercase tracking-wider block">SMS Message</span>
                        <span className="text-xs font-semibold text-[#111111]">{storeSettings?.StoreName || 'Pabna Bostraloy'}</span>
                      </div>

                      {/* মেসেজ বাবল */}
                      <div className="bg-white p-3 rounded-lg border border-neutral-200/80 text-[#111111] text-xs leading-relaxed relative">
                        {previewMessage}
                        <span className="text-[9px] text-[#737373] block text-right mt-1.5">এখন • SMS</span>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-neutral-200/80 text-[10px] text-center text-[#525252]">
                      প্রাপক: <strong className="font-mono tabular-nums text-[#111111]">{selectedPhones.size} জন</strong> • গ্রিনওয়েব / বাল্ক এসএমএস
                    </div>
                  </div>
                </div>

                {/* সেন্ড বাটন */}
                <div className="w-full max-w-xs mt-4">
                  <button
                    type="button"
                    onClick={handleDispatchCampaign}
                    disabled={isSending || selectedPhones.size === 0}
                    className="w-full min-h-[44px] py-2.5 bg-[#0F172A] hover:bg-slate-800 text-white font-medium rounded-md transition-colors flex items-center justify-center space-x-2 text-xs disabled:opacity-50 cursor-pointer"
                  >
                    <Send className="w-4 h-4" />
                    <span>{isSending ? 'পাঠানো হচ্ছে...' : <><span className="font-mono tabular-nums">{selectedPhones.size}</span> জনকে এসএমএস পাঠান</>}</span>
                  </button>
                </div>
              </div>

            </div>

          </div>
        ) : (
          /* ট্যাব ৩: ক্যাম্পেইন হিস্ট্রি */
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-[#FAFAFA]">
            
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#525252]">
              পূর্বে প্রেরিত এসএমএস ক্যাম্পেইন রিপোর্ট (<span className="font-mono tabular-nums">{campaignHistory.length}</span>টি)
            </h3>

            {campaignHistory.length === 0 ? (
              <div className="py-12 text-center text-[#737373] space-y-2 bg-white rounded-lg border border-neutral-200/80">
                <History className="w-10 h-10 mx-auto stroke-1 text-[#737373]" />
                <p className="text-sm font-semibold text-[#111111]">কোনো পূর্ববর্তী ক্যাম্পেইন হিস্ট্রি নেই</p>
                <p className="text-xs text-[#525252]">নতুন কোনো এসএমএস ক্যাম্পেইন পাঠানো হলে তা এখানে সংরক্ষিত থাকবে।</p>
              </div>
            ) : (
              <div className="space-y-3">
                {campaignHistory.map((camp, idx) => (
                  <div
                    key={camp.CampaignID || idx}
                    className="p-4 bg-white rounded-lg border border-neutral-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-xs text-[#111111] bg-[#F5F5F5] px-2 py-0.5 rounded-md border border-neutral-200/80">
                          {camp.Title}
                        </span>
                        <span className="text-[10px] text-[#737373] font-mono tabular-nums">
                          • {new Date(camp.SentAt).toLocaleString('bn-BD')}
                        </span>
                      </div>
                      <p className="text-xs text-[#111111] bg-[#FAFAFA] p-2.5 rounded-md border border-neutral-200/80 max-w-xl">
                        "{camp.MessageTemplate}"
                      </p>
                      <div className="text-[11px] text-[#525252]">
                        টার্গেট সেগমেন্ট: <strong className="text-[#111111] font-medium">{camp.TargetSegment}</strong>
                        {' '}• প্রেরক: <strong className="text-[#111111] font-medium">{camp.SentBy}</strong>
                      </div>
                    </div>

                    <div className="text-left sm:text-right sm:border-l sm:pl-4 border-neutral-200/80 shrink-0">
                      <span className="text-[10px] text-[#737373] uppercase font-medium block">মোট প্রাপক</span>
                      <span className="text-lg font-semibold font-mono tabular-nums text-[#15803D]">
                        {camp.RecipientCount} জন
                      </span>
                      <span className="text-[10px] text-[#15803D] bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 rounded-md font-medium inline-block mt-0.5">
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
