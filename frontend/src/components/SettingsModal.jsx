import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  Settings, 
  Link, 
  Check, 
  RefreshCw, 
  AlertCircle, 
  Save, 
  Info,
  Globe,
  Building,
  Receipt,
  DollarSign,
  Percent,
  Sparkles,
  ShieldCheck,
  Eye,
  HelpCircle,
  CheckCircle2,
  Image,
  Phone,
  Mail,
  MapPin,
  ExternalLink,
  Truck,
  MessageSquare,
  Send,
  Smartphone,
  Key
} from 'lucide-react';
import { formatImageUrl, getDriveImageCandidates, DEFAULT_APPS_SCRIPT_URL } from '../services/storage';

export default function SettingsModal({
  isOpen,
  onClose,
  settings = {},
  onSaveSettings,
  onTestConnection
}) {
  const [formData, setFormData] = useState({ ...settings });
  const [activeTab, setActiveTab] = useState('api'); // 'api' | 'branding' | 'billing'
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [showApiGuide, setShowApiGuide] = useState(false);

  const rawLogo = formData.LogoUrl || formData.logoUrl || '';
  const candidates = useMemo(() => getDriveImageCandidates(rawLogo), [rawLogo]);
  const [candidateIdx, setCandidateIdx] = useState(0);
  const [previewFailed, setPreviewFailed] = useState(false);

  // মডাল ওপেন হলে সর্বশেষ সেটিংস ডাটা দিয়ে ফর্ম সিঙ্ক করা
  useEffect(() => {
    if (isOpen) {
      const resolvedApi = (settings.apiUrl || DEFAULT_APPS_SCRIPT_URL || '').trim();
      setFormData({
        ...settings,
        apiUrl: resolvedApi
      });
      setTestResult(null);
      setActiveTab('api');
    }
  }, [isOpen, settings]);

  useEffect(() => {
    setCandidateIdx(0);
    setPreviewFailed(false);
  }, [rawLogo]);

  const handlePreviewError = () => {
    if (candidateIdx + 1 < candidates.length) {
      setCandidateIdx((prev) => prev + 1);
    } else {
      setPreviewFailed(true);
    }
  };

  const currentPreviewSrc = candidates[candidateIdx] || '';
  const hasValidPreview = Boolean(currentPreviewSrc && !previewFailed && candidateIdx < candidates.length);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleTest = async () => {
    if (!formData.apiUrl || !formData.apiUrl.trim()) {
      setTestResult({ success: false, message: 'অনুগ্রহ করে প্রথমে Apps Script Web App URL দিন।' });
      return;
    }
    setIsTesting(true);
    setTestResult(null);
    try {
      await onTestConnection(formData.apiUrl);
      setTestResult({ success: true, message: 'সফলভাবে গুগল শিট API-এর সাথে সংযোগ স্থাপিত ও ডাটা সিঙ্ক হয়েছে!' });
    } catch (err) {
      setTestResult({ success: false, message: `সংযোগ ব্যর্থ: ${err.message}` });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const cleanLogo = (formData.LogoUrl || formData.logoUrl || '').trim();
    const formattedLogo = formatImageUrl(cleanLogo);
    onSaveSettings({
      ...formData,
      LogoUrl: formattedLogo || cleanLogo,
      logoUrl: formattedLogo || cleanLogo,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200/90 max-w-2xl w-full overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-150 relative">
        
        {/* ================= ১. শীর্ষ প্রিমিয়াম হেডার বার ================= */}
        <div className="p-4 sm:p-5 border-b border-slate-200 bg-gradient-to-r from-slate-50 via-white to-indigo-50/40 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3.5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-700 text-white flex items-center justify-center shadow-lg shadow-indigo-600/25 shrink-0">
              <Settings className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                  সিস্টেম ও API কনফিগারেশন
                </h2>
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700 border border-indigo-200">
                  Settings Hub
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                গুগল শিট ক্লাউড ডেটাবেস সংযোগ, স্টোর ব্র্যান্ডিং, ভ্যাট ও ইনভয়েস রিসিট কনফিগারেশন
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            title="বন্ধ করুন"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ================= ২. ইন্টারেক্টিভ ট্যাব বার (SaaS Tabs) ================= */}
        <div className="px-4 sm:px-6 pt-3 bg-slate-50/80 border-b border-slate-200 shrink-0">
          <div className="flex items-center space-x-2 overflow-x-auto no-scrollbar">
            {[
              { id: 'api', label: 'ক্লাউড ও API সংযোগ', icon: <Globe className="w-4 h-4" /> },
              { id: 'branding', label: 'স্টোর ব্র্যান্ডিং', icon: <Building className="w-4 h-4" /> },
              { id: 'billing', label: 'মুদ্রা ও কর', icon: <Receipt className="w-4 h-4" /> },
              { id: 'loyalty', label: 'লয়ালটি ও স্টোরফ্রন্ট', icon: <Sparkles className="w-4 h-4" /> },
              { id: 'courier', label: 'কুরিয়ার ইন্টিগ্রেশন (Steadfast)', icon: <Truck className="w-4 h-4" /> },
              { id: 'sms', label: 'SMS ও WhatsApp নোটিফিকেশন', icon: <MessageSquare className="w-4 h-4" /> },
            ].map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-3.5 py-2.5 rounded-t-2xl text-xs font-bold transition-all flex items-center space-x-2 cursor-pointer border-t border-x relative ${
                    isActive
                      ? 'bg-white text-indigo-600 border-slate-200 shadow-xs -mb-px z-10'
                      : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                  }`}
                >
                  <span className={isActive ? 'text-indigo-600' : 'text-slate-400'}>{tab.icon}</span>
                  <span className="whitespace-nowrap">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ================= ৩. মূল ফর্ম বডি ================= */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 min-h-0 bg-white">
          
          {/* ---------------- ট্যাব ১: ক্লাউড ও API সংযোগ ---------------- */}
          {activeTab === 'api' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              
              {/* API URL ইনপুট কার্ড */}
              <div className="p-4 sm:p-5 bg-gradient-to-br from-indigo-50/80 via-white to-violet-50/50 border border-indigo-200 rounded-2xl space-y-3 shadow-xs">
                <div className="flex items-center justify-between">
                  <label className="text-xs sm:text-sm font-black text-indigo-950 flex items-center gap-1.5">
                    <Globe className="w-4 h-4 text-indigo-600" />
                    <span>গুগল অ্যাপস স্ক্রিপ্ট Web App URL</span>
                    <span className="text-rose-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowApiGuide(!showApiGuide)}
                    className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
                  >
                    <HelpCircle className="w-3.5 h-3.5" />
                    <span>{showApiGuide ? 'গাইড বন্ধ করুন' : 'কীভাবে লিংক পাবেন?'}</span>
                  </button>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">
                  গুগল শিট থেকে আপনার <code className="bg-indigo-100/70 text-indigo-900 px-1.5 py-0.5 rounded font-mono text-[11px]">Apps Script</code> ডেপ্লয় করার পর প্রাপ্ত Web App URL লিংকটি নিচে পেস্ট করুন:
                </p>

                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="url"
                    name="apiUrl"
                    placeholder="https://script.google.com/macros/s/.../exec"
                    value={formData.apiUrl || ''}
                    onChange={handleChange}
                    className="flex-1 px-3.5 py-2.5 border border-indigo-200 rounded-xl text-xs bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono font-medium shadow-2xs"
                  />
                  <button
                    type="button"
                    onClick={handleTest}
                    disabled={isTesting}
                    className="px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white text-xs font-black rounded-xl flex items-center justify-center space-x-1.5 disabled:opacity-50 transition-all shadow-xs active:scale-95 cursor-pointer shrink-0"
                  >
                    {isTesting ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Link className="w-3.5 h-3.5" />
                    )}
                    <span>{isTesting ? 'সংযোগ পরীক্ষা হচ্ছে...' : 'কানেকশন টেস্ট'}</span>
                  </button>
                </div>

                {/* ডিফল্ট URL হেল্পার রো */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px]">
                  <span className="text-slate-500 flex items-center gap-1 font-medium">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>ক্লাউড গুগল শিট ডেটাবেস সক্রিয়</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setFormData((prev) => ({ ...prev, apiUrl: DEFAULT_APPS_SCRIPT_URL }));
                      setTestResult({ success: true, message: 'অফিসিয়াল লাইভ ব্যাকএন্ড URL পূরণ করা হয়েছে। এখন "কানেকশন টেস্ট" বা নিচে "সেটিংস সংরক্ষণ" বাটনে ক্লিক করুন।' });
                    }}
                    className="text-indigo-600 hover:text-indigo-800 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                    <span>ডিফল্ট লাইভ URL পূরণ করুন</span>
                  </button>
                </div>

                {/* টেস্ট রেজাল্ট নোটিফিকেশন */}
                {testResult && (
                  <div
                    className={`p-3 rounded-xl text-xs font-semibold flex items-center space-x-2 animate-in fade-in ${
                      testResult.success
                        ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                        : 'bg-rose-50 border border-rose-200 text-rose-800'
                    }`}
                  >
                    {testResult.success ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    )}
                    <span>{testResult.message}</span>
                  </div>
                )}
              </div>

              {/* সহায়তা ও ইনস্টলেশন গাইড বক্স */}
              {showApiGuide && (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2 text-xs text-slate-700 animate-in fade-in">
                  <h5 className="font-black text-slate-900 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    <span>সহজ ধাপে গুগল শিট Web App URL সেটআপ:</span>
                  </h5>
                  <ol className="list-decimal list-inside space-y-1 text-slate-600 leading-relaxed pl-1">
                    <li>গুগল শিট খুলুন ও মেনু থেকে <b>Extensions → Apps Script</b> এ যান।</li>
                    <li>স্ক্রিপ্ট এডিটরে কোড পেস্ট করে <b>Deploy → New deployment</b> এ ক্লিক করুন।</li>
                    <li>Select type হিসেবে <b>Web app</b> নির্বাচন করুন।</li>
                    <li><b>Execute as:</b> &ldquo;Me&rdquo; এবং <b>Who has access:</b> &ldquo;Anyone&rdquo; নির্বাচন করে ডেপ্লয় করুন।</li>
                    <li>প্রাপ্ত <b>Web App URL</b> কপি করে উপরের বক্সে পেস্ট করুন এবং &ldquo;কানেকশন টেস্ট&rdquo; করুন।</li>
                  </ol>
                </div>
              )}

              {/* সংযোগ স্থিতি ওভারভিউ */}
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-center justify-between text-xs">
                <div className="flex items-center space-x-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span className="font-semibold text-slate-700">ক্লাউড সিঙ্ক নিরাপত্তা:</span>
                  <span className="text-slate-500">SSL এনক্রিপ্টেড গুগল ক্লাউড সংযোগ</span>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                  HTTPS সুরক্ষিত
                </span>
              </div>

            </div>
          )}

          {/* ---------------- ট্যাব ২: স্টোর প্রোফাইল ও ব্র্যান্ডিং ---------------- */}
          {activeTab === 'branding' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* স্টোর নাম */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    দোকান বা প্রতিষ্ঠানের নাম (Store Name) <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Building className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      name="StoreName"
                      required
                      placeholder="যেমন: আরিয়ান ফ্যাশন মার্ট"
                      value={formData.StoreName || ''}
                      onChange={handleChange}
                      className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 focus:bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-slate-800"
                    />
                  </div>
                </div>

                {/* লোগো লিংক */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700">
                      লোগো লিংক (Logo Image URL)
                    </label>
                    <span className="text-[10px] text-slate-400">ড্রাইভ/ওয়েব সমর্থিত</span>
                  </div>
                  <div className="relative flex items-center gap-2">
                    <div className="relative flex-1">
                      <Image className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                      <input
                        type="url"
                        name="LogoUrl"
                        value={formData.LogoUrl || ''}
                        onChange={handleChange}
                        placeholder="https://... বা গুগল ড্রাইভ ইমেজ লিংক"
                        className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 focus:bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-slate-800"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* লোগো লাইভ প্রিভিউ কার্ড */}
              {rawLogo && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex items-center space-x-3.5">
                  <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 p-1 flex items-center justify-center overflow-hidden shrink-0 shadow-2xs">
                    {hasValidPreview ? (
                      <img
                        src={currentPreviewSrc}
                        alt="Logo Preview"
                        className="w-full h-full object-contain"
                        onError={handlePreviewError}
                      />
                    ) : (
                      <Image className="w-5 h-5 text-slate-300" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1 text-xs">
                    <div className="font-bold text-slate-800 truncate">
                      {formData.StoreName || 'স্টোর লোগো প্রিভিউ'}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {hasValidPreview
                        ? 'লোগো সফলভাবে লোড হয়েছে এবং রিসিটে প্রদর্শিত হবে।'
                        : 'ছবি লোড হতে সমস্যা হলে গুগল ড্রাইভে ফাইলটির জেনারেল এক্সেস "Anyone with the link" নিশ্চিত করুন।'}
                    </p>
                  </div>
                </div>
              )}

              {/* ঠিকানা, মোবাইল ও ইমেইল */}
              <div className="space-y-3 pt-1">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    পূর্ণ ঠিকানা (Shop Address)
                  </label>
                  <div className="relative">
                    <MapPin className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      name="Address"
                      placeholder="যেমন: শপ #১২, লেভেল ৩, ধানমন্ডি প্লাজা, ঢাকা"
                      value={formData.Address || ''}
                      onChange={handleChange}
                      className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 focus:bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-slate-800"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      মোবাইল নম্বর (Phone Number)
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                      <input
                        type="text"
                        name="Phone"
                        placeholder="যেমন: 01700-000000"
                        value={formData.Phone || ''}
                        onChange={handleChange}
                        className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 focus:bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-slate-800"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      ইমেইল ঠিকানা (Email Address)
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                      <input
                        type="email"
                        name="Email"
                        placeholder="যেমন: contact@store.com"
                        value={formData.Email || ''}
                        onChange={handleChange}
                        className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 focus:bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-slate-800"
                      />
                    </div>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* ---------------- ট্যাব ৩: মুদ্রা, কর ও রিসিট মেমো ---------------- */}
          {activeTab === 'billing' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              
              {/* মুদ্রা ও ট্যাক্স গ্রিড */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* মুদ্রা প্রতীক */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    মুদ্রার প্রতীক (Currency Symbol)
                  </label>
                  <div className="relative">
                    <DollarSign className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      name="CurrencySymbol"
                      value={formData.CurrencySymbol || '৳'}
                      onChange={handleChange}
                      className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 focus:bg-white border border-slate-300 rounded-xl font-black text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  {/* মুদ্রা প্রিসেটস */}
                  <div className="flex items-center gap-1.5 mt-1.5">
                    {['৳', '$', '₹', '€', '£'].map((sym) => (
                      <button
                        key={sym}
                        type="button"
                        onClick={() => setFormData({ ...formData, CurrencySymbol: sym })}
                        className={`px-2 py-0.5 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                          formData.CurrencySymbol === sym
                            ? 'bg-indigo-600 text-white border-indigo-600'
                            : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                        }`}
                      >
                        {sym}
                      </button>
                    ))}
                  </div>
                </div>

                {/* ভ্যাট / ট্যাক্স হার */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    ভ্যাট ও করের শতকরা হার (%)
                  </label>
                  <div className="relative">
                    <Percent className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      name="TaxRatePercent"
                      value={formData.TaxRatePercent || 0}
                      onChange={handleChange}
                      className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 focus:bg-white border border-slate-300 rounded-xl font-black text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  {/* ট্যাক্স প্রিসেটস */}
                  <div className="flex items-center gap-1.5 mt-1.5">
                    {[0, 5, 7.5, 10, 15].map((rate) => (
                      <button
                        key={rate}
                        type="button"
                        onClick={() => setFormData({ ...formData, TaxRatePercent: rate })}
                        className={`px-2 py-0.5 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                          Number(formData.TaxRatePercent) === rate
                            ? 'bg-indigo-600 text-white border-indigo-600'
                            : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                        }`}
                      >
                        {rate}%
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* ইনভয়েসের ফুটার বার্তা */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  রিসিটের নিচের সমাপনী বার্তা (Receipt Footer Message)
                </label>
                <input
                  type="text"
                  name="ReceiptFooter"
                  placeholder="যেমন: ধন্যবাদ! পণ্য ক্রয়ের জন্য আপনাকে স্বাগতম। আবার আসবেন।"
                  value={formData.ReceiptFooter || ''}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2 text-xs bg-slate-50 focus:bg-white border border-slate-300 rounded-xl font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* লাইভ ডিজিটাল থার্মাল রিসিট মেমো প্রিভিউ */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-indigo-500" />
                  রিসিট লাইভ প্রিভিউ (Thermal Receipt Sample)
                </span>

                <div className="bg-white p-3.5 rounded-xl border border-slate-200 text-center font-mono text-[11px] text-slate-600 max-w-sm mx-auto shadow-2xs space-y-1">
                  <p className="font-black text-slate-900 text-xs">{formData.StoreName || 'স্টোরের নাম'}</p>
                  <p className="text-[10px] text-slate-400">{formData.Address || 'ঠিকানা'}</p>
                  <div className="border-b border-dashed border-slate-300 my-1.5" />
                  <div className="flex justify-between text-[10px]">
                    <span>নমুনা পণ্য x১</span>
                    <span>{formData.CurrencySymbol || '৳'}১০০.০০</span>
                  </div>
                  <div className="flex justify-between text-[10px]">
                    <span>ভ্যাট ({formData.TaxRatePercent || 0}%)</span>
                    <span>{formData.CurrencySymbol || '৳'}{((100 * (Number(formData.TaxRatePercent) || 0)) / 100).toFixed(2)}</span>
                  </div>
                  <div className="border-b border-dashed border-slate-300 my-1.5" />
                  <p className="text-[10px] font-sans font-bold text-slate-500 pt-0.5">
                    {formData.ReceiptFooter || 'ধন্যবাদ! আবার আসবেন।'}
                  </p>
                </div>
              </div>

            </div>
          )}

          {/* ---------------- ট্যাব: লয়ালটি রিওয়ার্ড ও ডিজিটাল স্টোরফ্রন্ট ---------------- */}
          {activeTab === 'loyalty' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              
              {/* লয়ালটি প্রোগ্রাম কনফিগারেশন */}
              <div className="p-4 sm:p-5 bg-gradient-to-br from-purple-50/80 via-white to-indigo-50/50 border border-purple-200 rounded-2xl space-y-4 shadow-xs">
                <div className="flex items-center justify-between pb-3 border-b border-purple-100">
                  <div className="flex items-center space-x-2.5">
                    <div className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center font-bold">
                      🪙
                    </div>
                    <div>
                      <h4 className="text-xs sm:text-sm font-black text-purple-950">
                        লয়ালটি ও ক্যাশব্যাক রিওয়ার্ড ইঞ্জিন
                      </h4>
                      <p className="text-[11px] text-purple-700">
                        গ্রাহকদের প্রতিটি কেনাকাটায় স্বয়ংক্রিয় পয়েন্ট প্রদান ও পরবর্তী কেনাকাটায় পয়েন্ট ভাঙিয়ে ছাড়
                      </p>
                    </div>
                  </div>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <span className="text-xs font-bold text-slate-700">প্রোগ্রাম চালু:</span>
                    <input
                      type="checkbox"
                      name="LoyaltyEnabled"
                      checked={formData.LoyaltyEnabled !== false}
                      onChange={(e) => setFormData((prev) => ({ ...prev, LoyaltyEnabled: e.target.checked }))}
                      className="w-5 h-5 text-purple-600 rounded-md focus:ring-purple-500 cursor-pointer"
                    />
                  </label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* কত টাকায় ১ পয়েন্ট */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      পয়েন্ট অর্জনের হার (টাকা):
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-bold">{formData.CurrencySymbol || '৳'}</span>
                      <input
                        type="number"
                        min="1"
                        name="LoyaltyPointsRate"
                        value={formData.LoyaltyPointsRate || 100}
                        onChange={handleChange}
                        className="w-full pl-8 pr-3 py-2 text-xs bg-white border border-slate-300 rounded-xl font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                    <span className="text-[10px] text-slate-500 mt-0.5 block">যেমন: প্রতি ১০০ টাকায় ১ পয়েন্ট</span>
                  </div>

                  {/* ১ পয়েন্টের রিডেম্পশন মূল্য */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      প্রতি পয়েন্টের ছাড় মূল্য (টাকা):
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-bold">{formData.CurrencySymbol || '৳'}</span>
                      <input
                        type="number"
                        min="0.1"
                        step="0.1"
                        name="LoyaltyRedeemRate"
                        value={formData.LoyaltyRedeemRate !== undefined ? formData.LoyaltyRedeemRate : 1.0}
                        onChange={handleChange}
                        className="w-full pl-8 pr-3 py-2 text-xs bg-white border border-slate-300 rounded-xl font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                    <span className="text-[10px] text-slate-500 mt-0.5 block">যেমন: ১ পয়েন্ট = ১.০০ টাকা ছাড়</span>
                  </div>

                  {/* ন্যূনতম রিডেম্পশন পয়েন্ট */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      ভাঙানোর জন্য ন্যূনতম পয়েন্ট:
                    </label>
                    <input
                      type="number"
                      min="1"
                      name="MinRedeemPoints"
                      value={formData.MinRedeemPoints || 10}
                      onChange={handleChange}
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                    <span className="text-[10px] text-slate-500 mt-0.5 block">কমপক্ষে ১০ পয়েন্ট জমলে ভাঙানো যাবে</span>
                  </div>
                </div>
              </div>

              {/* ডিজিটাল স্টোরফ্রন্ট ব্যানার ও ডিসপ্লে কনফিগারেশন */}
              <div className="p-4 sm:p-5 bg-gradient-to-br from-amber-50/80 via-white to-orange-50/50 border border-amber-200 rounded-2xl space-y-4 shadow-xs">
                <div className="flex items-center justify-between pb-3 border-b border-amber-100">
                  <div className="flex items-center space-x-2.5">
                    <div className="w-8 h-8 rounded-xl bg-amber-600 text-white flex items-center justify-center font-bold">
                      🛍️
                    </div>
                    <div>
                      <h4 className="text-xs sm:text-sm font-black text-amber-950">
                        পাবলিক ডিজিটাল স্টোরফ্রন্ট (Customer Mini Web)
                      </h4>
                      <p className="text-[11px] text-amber-700">
                        ক্রেতাদের জন্য সাধারণ অনলাইন ক্যাটালগ ও চেকআউট ভিউ
                      </p>
                    </div>
                  </div>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <span className="text-xs font-bold text-slate-700">স্টোরফ্রন্ট সক্রিয়:</span>
                    <input
                      type="checkbox"
                      name="StorefrontEnabled"
                      checked={formData.StorefrontEnabled !== false}
                      onChange={(e) => setFormData((prev) => ({ ...prev, StorefrontEnabled: e.target.checked }))}
                      className="w-5 h-5 text-amber-600 rounded-md focus:ring-amber-500 cursor-pointer"
                    />
                  </label>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    অনলাইন স্টোর ঘোষণার ব্যানার বার্তা (Storefront Announcement Banner):
                  </label>
                  <textarea
                    rows={2}
                    name="StorefrontBannerText"
                    placeholder="আমাদের অনলাইন স্টোরে আপনাকে স্বাগতম! সারাদেশে ক্যাশ অন ডেলিভারি সুবিধা।"
                    value={formData.StorefrontBannerText || ''}
                    onChange={handleChange}
                    className="w-full px-3.5 py-2 text-xs bg-white border border-slate-300 rounded-xl font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500 leading-relaxed"
                  />
                  <span className="text-[10px] text-slate-500 mt-0.5 block">
                    স্টোরের উপরে চলমান আকর্ষণীয় নোটিশ বা প্রমোশনাল ঘোষণা প্রদর্শন করবে
                  </span>
                </div>
              </div>

            </div>
          )}

          {/* ---------------- ট্যাব ৫: কুরিয়ার API কনফিগারেশন ---------------- */}
          {activeTab === 'courier' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              
              {/* কুরিয়ার হেডার ব্যানার */}
              <div className="p-4 bg-gradient-to-br from-emerald-50 via-white to-teal-50 border border-emerald-200 rounded-2xl flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/20">
                    <Truck className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-emerald-950">Steadfast Courier অটোমেশন</h3>
                    <p className="text-xs text-emerald-700">১-ক্লিকে বাল্ক পার্সেল বুকিং এবং স্বয়ংক্রিয় ট্র্যাকিং কোড সিঙ্ক</p>
                  </div>
                </div>
                <a
                  href="https://portal.steadfast.com.bd"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 bg-white border border-emerald-300 hover:bg-emerald-50 text-emerald-800 text-xs font-bold rounded-xl flex items-center gap-1 shadow-2xs"
                >
                  <span>Steadfast পোর্টাল</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>

              {/* Steadfast API Key ও Secret Key ইনপুট */}
              <div className="p-4 bg-slate-50/70 border border-slate-200 rounded-2xl space-y-3.5">
                <span className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                  <Key className="w-4 h-4 text-emerald-600" />
                  Steadfast API ক্রেডেনশিয়ালস
                </span>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Steadfast API Key <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="password"
                    name="SteadfastApiKey"
                    placeholder="আপনার Steadfast একাউন্টের API Key পেস্ট করুন"
                    value={formData.SteadfastApiKey || ''}
                    onChange={handleChange}
                    className="w-full px-3.5 py-2.5 text-xs bg-white border border-slate-300 rounded-xl font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Steadfast Secret Key <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="password"
                    name="SteadfastSecretKey"
                    placeholder="আপনার Steadfast Secret Key পেস্ট করুন"
                    value={formData.SteadfastSecretKey || ''}
                    onChange={handleChange}
                    className="w-full px-3.5 py-2.5 text-xs bg-white border border-slate-300 rounded-xl font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    💡 Steadfast পোর্টাল থেকে <span className="font-bold">Settings &gt; API Information</span> এ গিয়ে আপনার Key ও Secret কপি করে এখানে দিন।
                  </p>
                </div>
              </div>

              {/* ডিফল্ট ডেলিভারি চার্জ */}
              <div className="p-4 bg-slate-50/70 border border-slate-200 rounded-2xl space-y-3">
                <span className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                  <Truck className="w-4 h-4 text-indigo-600" />
                  ডিফল্ট ডেলিভারি চার্জ কনফিগারেশন
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      ঢাকার ভিতরে ডেলিভারি চার্জ ({formData.CurrencySymbol || '৳'})
                    </label>
                    <input
                      type="number"
                      name="InsideDhakaDelivery"
                      placeholder="70"
                      value={formData.InsideDhakaDelivery !== undefined ? formData.InsideDhakaDelivery : '70'}
                      onChange={handleChange}
                      className="w-full px-3.5 py-2 text-xs bg-white border border-slate-300 rounded-xl font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      ঢাকার বাইরে ডেলিভারি চার্জ ({formData.CurrencySymbol || '৳'})
                    </label>
                    <input
                      type="number"
                      name="OutsideDhakaDelivery"
                      placeholder="130"
                      value={formData.OutsideDhakaDelivery !== undefined ? formData.OutsideDhakaDelivery : '130'}
                      onChange={handleChange}
                      className="w-full px-3.5 py-2 text-xs bg-white border border-slate-300 rounded-xl font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* ---------------- ট্যাব ৫: SMS ও WhatsApp নোটিফিকেশন ---------------- */}
          {activeTab === 'sms' && (
            <div className="space-y-4 animate-in fade-in duration-150">
              
              {/* এসএমএস হেডার ব্যানার */}
              <div className="p-4 bg-gradient-to-br from-violet-50 via-white to-purple-50 border border-violet-200 rounded-2xl flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-violet-600 text-white flex items-center justify-center shadow-md shadow-violet-600/20">
                    <MessageSquare className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-violet-950">স্বয়ংক্রিয় SMS ও WhatsApp ইঞ্জিন</h3>
                    <p className="text-xs text-violet-700">অর্ডার কনফার্মেশন, কুরিয়ার বুকিং ও ট্র্যাকিং মেসেজ অটোমেশন</p>
                  </div>
                </div>
                <div className="px-2.5 py-1 bg-violet-100 text-violet-800 text-[11px] font-black rounded-lg">
                  বাংলা সাপোর্টেড
                </div>
              </div>

              {/* গেটওয়ে কনফিগারেশন */}
              <div className="p-4 bg-slate-50/70 border border-slate-200 rounded-2xl space-y-3.5">
                <span className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                  <Send className="w-4 h-4 text-violet-600" />
                  SMS গেটওয়ে প্রোভাইডার সেটিংস
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      SMS প্রোভাইডার নির্বাচন করুন
                    </label>
                    <select
                      name="SmsProvider"
                      value={formData.SmsProvider || 'Greenweb'}
                      onChange={handleChange}
                      className="w-full px-3.5 py-2.5 text-xs bg-white border border-slate-300 rounded-xl font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-500"
                    >
                      <option value="Greenweb">Greenweb SMS Gateway (বাংলাদেশ)</option>
                      <option value="BulkSMSBD">BulkSMSBD.net (বাংলাদেশ)</option>
                      <option value="Elitbuzz">Elitbuzz Technologies</option>
                      <option value="Custom">Custom REST SMS Gateway</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Sender ID / মাস্কিং নাম (ঐচ্ছিক)
                    </label>
                    <input
                      type="text"
                      name="SmsSenderId"
                      placeholder="যেমন: PabnaBostra বা অনুমোদিত আইডি"
                      value={formData.SmsSenderId || ''}
                      onChange={handleChange}
                      className="w-full px-3.5 py-2.5 text-xs bg-white border border-slate-300 rounded-xl font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    SMS Gateway API Key / Token <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="password"
                    name="SmsApiKey"
                    placeholder="আপনার SMS প্রোভাইডারের API Token বা Key দিন"
                    value={formData.SmsApiKey || ''}
                    onChange={handleChange}
                    className="w-full px-3.5 py-2.5 text-xs bg-white border border-slate-300 rounded-xl font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                </div>
              </div>

              {/* WhatsApp সক্রিয়করণ টগল */}
              <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-2xl flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center">
                    <Smartphone className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-emerald-950">১-ক্লিক WhatsApp মেসেজ সক্রিয় রাখুন</h4>
                    <p className="text-[11px] text-emerald-700">অর্ডার লিস্ট থেকে সরাসরি কাস্টমারের হোয়াটসঅ্যাপে ট্র্যাকিং মেসেজ পাঠানো যাবে</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  name="WhatsappEnabled"
                  checked={formData.WhatsappEnabled !== false}
                  onChange={(e) => setFormData((prev) => ({ ...prev, WhatsappEnabled: e.target.checked }))}
                  className="w-5 h-5 text-emerald-600 rounded-md focus:ring-emerald-500 cursor-pointer"
                />
              </div>

              {/* কাস্টমাইজড মেসেজ টেমপ্লেট */}
              <div className="p-4 bg-slate-50/70 border border-slate-200 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-slate-800">
                    মেসেজ টেমপ্লেট ও ভেরিয়েবলসমূহ
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">
                    ট্যাগস: {'{customerName}'}, {'{orderNumber}'}, {'{courierName}'}, {'{trackingId}'}, {'{dueAmount}'}
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    ১. অর্ডার কনফার্মেশন বার্তা (Order Confirmation SMS)
                  </label>
                  <textarea
                    rows={2}
                    name="SmsTemplateOrder"
                    placeholder="প্রিয় {customerName}, আপনার অর্ডার #{orderNumber} সফলভাবে গ্রহণ করা হয়েছে। মোট বিল: {totalAmount}। ধন্যবাদ, {storeName}।"
                    value={formData.SmsTemplateOrder || ''}
                    onChange={handleChange}
                    className="w-full px-3.5 py-2 text-xs bg-white border border-slate-300 rounded-xl font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-500 leading-relaxed"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    ২. কুরিয়ার বুকিং ও ট্র্যাকিং বার্তা (Courier Dispatch SMS)
                  </label>
                  <textarea
                    rows={2}
                    name="SmsTemplateCourier"
                    placeholder="প্রিয় {customerName}, আপনার পার্সেলটি {courierName}-এ পাঠানো হয়েছে। ট্র্যাকিং কোড: {trackingId}। বকেয়া টাকা: {dueAmount}। সাথে থাকুন, {storeName}।"
                    value={formData.SmsTemplateCourier || ''}
                    onChange={handleChange}
                    className="w-full px-3.5 py-2 text-xs bg-white border border-slate-300 rounded-xl font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-500 leading-relaxed"
                  />
                </div>
              </div>

            </div>
          )}

          {/* ================= ৪. অ্যাকশন বাটনসমূহ ================= */}
          <div className="pt-3 border-t border-slate-200 flex justify-end space-x-2 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 text-slate-700 text-xs font-bold rounded-xl hover:bg-slate-100 transition-colors cursor-pointer active:scale-95"
            >
              বাতিল
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white text-xs font-black rounded-xl shadow-md shadow-indigo-600/25 transition-all flex items-center space-x-1.5 cursor-pointer active:scale-95"
            >
              <Save className="w-4 h-4" />
              <span>সেটিংস সংরক্ষণ করুন</span>
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
