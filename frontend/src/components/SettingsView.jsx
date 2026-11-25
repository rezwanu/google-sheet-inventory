import React, { useState, useEffect, useMemo } from 'react';
import {
  Save,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Link,
  HelpCircle,
  Image as ImageIcon,
  ExternalLink
} from 'lucide-react';
import { formatImageUrl, getDriveImageCandidates, DEFAULT_APPS_SCRIPT_URL } from '../services/storage';
import { StatusBadge } from './ui';

/**
 * SettingsView - White-Label Settings View (Utilitarian Minimalism)
 * - ক্লিন ২-কলাম সেটিংস লেআউট: Business Name, Address, Phone, Currency Symbol (৳ / BDT), Receipt Footer
 * - বিদ্যমান Google Sheets API, Loyalty, Courier (Steadfast), ও SMS সেটিংস অক্ষুণ্ণ রাখা হয়েছে
 */
export default function SettingsView({
  settings = {},
  onSaveSettings,
  onTestConnection,
  onClose = null,
}) {
  const [formData, setFormData] = useState({ ...settings });
  const [activeTab, setActiveTab] = useState('general'); // 'general' | 'api' | 'integrations'
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [showApiGuide, setShowApiGuide] = useState(false);

  const rawLogo = formData.LogoUrl || formData.logoUrl || '';
  const candidates = useMemo(() => getDriveImageCandidates(rawLogo), [rawLogo]);
  const [candidateIdx, setCandidateIdx] = useState(0);
  const [previewFailed, setPreviewFailed] = useState(false);

  useEffect(() => {
    const resolvedApi = (settings.apiUrl || DEFAULT_APPS_SCRIPT_URL || '').trim();
    setFormData({
      ...settings,
      apiUrl: resolvedApi,
    });
    setTestResult(null);
  }, [settings]);

  useEffect(() => {
    setCandidateIdx(0);
    setPreviewFailed(false);
  }, [rawLogo]);

  const currentPreviewSrc = candidates[candidateIdx] || '';
  const hasValidPreview = Boolean(currentPreviewSrc && !previewFailed && candidateIdx < candidates.length);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleTest = async () => {
    if (!formData.apiUrl || !formData.apiUrl.trim()) {
      setTestResult({ success: false, message: 'অনুগ্রহ করে Apps Script Web App URL দিন।' });
      return;
    }
    setIsTesting(true);
    setTestResult(null);
    try {
      await onTestConnection(formData.apiUrl);
      setTestResult({ success: true, message: 'সফলভাবে গুগল শিট API-এর সাথে সংযোগ ও ডাটা সিঙ্ক সম্পন্ন হয়েছে!' });
    } catch (err) {
      setTestResult({ success: false, message: `সংযোগ ব্যর্থ: ${err.message}` });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const cleanLogo = (formData.LogoUrl || formData.logoUrl || '').trim();
      const formattedLogo = formatImageUrl(cleanLogo);
      await onSaveSettings({
        ...formData,
        LogoUrl: formattedLogo || cleanLogo,
        logoUrl: formattedLogo || cleanLogo,
      });
      if (onClose) onClose();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-5">
      {/* হেডার */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold font-heading tracking-tight text-[#111111]">
            White-Label Settings
          </h1>
          <p className="text-xs text-[#525252] mt-0.5">
            ব্যবসার পরিচয়, রিসিট ফরম্যাট, কারেন্সি এবং ক্লাউড ইন্টিগ্রেশন কনফিগারেশন
          </p>
        </div>

        <div className="flex items-center gap-1.5 bg-white border border-neutral-200/80 p-1 rounded-md">
          {[
            { id: 'general', label: 'Branding & Receipt' },
            { id: 'api', label: 'Google Sheets API' },
            { id: 'integrations', label: 'Courier, SMS & Loyalty' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`min-h-[34px] px-3 py-1 rounded-sm text-xs font-medium transition-colors cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-[#0F172A] text-white'
                  : 'text-[#525252] hover:text-[#111111] hover:bg-neutral-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* ---------------- ট্যাব ১: ২-কলাম White-Label Branding & Receipt ---------------- */}
        {activeTab === 'general' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* বাম কলাম: Business Branding */}
            <div className="bg-white border border-neutral-200/80 rounded-lg p-5 sm:p-6 space-y-4">
              <div className="pb-3 border-b border-neutral-200/80">
                <h2 className="text-sm font-semibold font-heading tracking-tight text-[#111111]">
                  Business Identity
                </h2>
                <p className="text-xs text-[#525252] mt-0.5">
                  ইনভয়েস এবং নেভিগেশনে ব্যবহৃত দোকানের পরিচিতি
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#111111] mb-1">
                  Business Name <span className="text-[#B91C1C]">*</span>
                </label>
                <input
                  type="text"
                  name="StoreName"
                  required
                  placeholder="যেমন: পাবনা বস্ত্রালয়"
                  value={formData.StoreName || ''}
                  onChange={handleChange}
                  className="w-full min-h-[44px] md:min-h-[38px] px-3 py-2 text-xs bg-white border border-neutral-200/80 rounded-md text-[#111111] focus:outline-none focus:border-[#0F172A]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#111111] mb-1">
                  Address
                </label>
                <input
                  type="text"
                  name="Address"
                  placeholder="দোকানের পূর্ণ ঠিকানা"
                  value={formData.Address || ''}
                  onChange={handleChange}
                  className="w-full min-h-[44px] md:min-h-[38px] px-3 py-2 text-xs bg-white border border-neutral-200/80 rounded-md text-[#111111] focus:outline-none focus:border-[#0F172A]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-medium text-[#111111] mb-1">
                    Phone
                  </label>
                  <input
                    type="text"
                    name="Phone"
                    placeholder="01700-000000"
                    value={formData.Phone || ''}
                    onChange={handleChange}
                    className="w-full min-h-[44px] md:min-h-[38px] px-3 py-2 text-xs font-mono bg-white border border-neutral-200/80 rounded-md text-[#111111] focus:outline-none focus:border-[#0F172A]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#111111] mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    name="Email"
                    placeholder="store@domain.com"
                    value={formData.Email || ''}
                    onChange={handleChange}
                    className="w-full min-h-[44px] md:min-h-[38px] px-3 py-2 text-xs bg-white border border-neutral-200/80 rounded-md text-[#111111] focus:outline-none focus:border-[#0F172A]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#111111] mb-1">
                  Logo Image URL
                </label>
                <input
                  type="url"
                  name="LogoUrl"
                  placeholder="https://..."
                  value={formData.LogoUrl || ''}
                  onChange={handleChange}
                  className="w-full min-h-[44px] md:min-h-[38px] px-3 py-2 text-xs font-mono bg-white border border-neutral-200/80 rounded-md text-[#111111] focus:outline-none focus:border-[#0F172A]"
                />
                {rawLogo && (
                  <div className="mt-2.5 p-2.5 bg-[#FAFAFA] border border-neutral-200/80 rounded-md flex items-center gap-3">
                    <div className="w-10 h-10 rounded-sm bg-white border border-neutral-200 flex items-center justify-center overflow-hidden shrink-0">
                      {hasValidPreview ? (
                        <img
                          src={currentPreviewSrc}
                          alt="Logo Preview"
                          className="w-full h-full object-contain"
                          onError={() => {
                            if (candidateIdx + 1 < candidates.length) setCandidateIdx((p) => p + 1);
                            else setPreviewFailed(true);
                          }}
                        />
                      ) : (
                        <ImageIcon className="w-4 h-4 text-[#737373]" />
                      )}
                    </div>
                    <span className="text-[11px] text-[#525252]">
                      {hasValidPreview ? 'Logo loaded' : 'Verify public access if Drive URL'}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* ডান কলাম: Currency, Tax & Receipt Footer */}
            <div className="bg-white border border-neutral-200/80 rounded-lg p-5 sm:p-6 space-y-4">
              <div className="pb-3 border-b border-neutral-200/80">
                <h2 className="text-sm font-semibold font-heading tracking-tight text-[#111111]">
                  Currency & Receipt Layout
                </h2>
                <p className="text-xs text-[#525252] mt-0.5">
                  মুদ্রা, ভ্যাট এবং রিসিটের ফুটার নোট
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-medium text-[#111111] mb-1">
                    Currency Symbol
                  </label>
                  <input
                    type="text"
                    name="CurrencySymbol"
                    value={formData.CurrencySymbol || '৳'}
                    onChange={handleChange}
                    className="w-full min-h-[44px] md:min-h-[38px] px-3 py-2 text-xs font-mono font-semibold bg-white border border-neutral-200/80 rounded-md text-[#111111] focus:outline-none focus:border-[#0F172A]"
                  />
                  <div className="flex gap-1 mt-1.5">
                    {['৳', 'BDT', '$', '₹'].map((sym) => (
                      <button
                        key={sym}
                        type="button"
                        onClick={() => setFormData((prev) => ({ ...prev, CurrencySymbol: sym }))}
                        className={`px-2 py-0.5 text-[11px] font-mono rounded-sm border cursor-pointer ${
                          formData.CurrencySymbol === sym
                            ? 'bg-[#0F172A] text-white border-[#0F172A]'
                            : 'bg-[#FAFAFA] text-[#525252] border-neutral-200/80'
                        }`}
                      >
                        {sym}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#111111] mb-1">
                    Tax / VAT Rate (%)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    name="TaxRatePercent"
                    value={formData.TaxRatePercent || 0}
                    onChange={handleChange}
                    className="w-full min-h-[44px] md:min-h-[38px] px-3 py-2 text-xs font-mono tabular-nums bg-white border border-neutral-200/80 rounded-md text-[#111111] focus:outline-none focus:border-[#0F172A]"
                  />
                  <div className="flex gap-1 mt-1.5">
                    {[0, 5, 7.5, 10, 15].map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setFormData((prev) => ({ ...prev, TaxRatePercent: r }))}
                        className={`px-2 py-0.5 text-[11px] font-mono tabular-nums rounded-sm border cursor-pointer ${
                          Number(formData.TaxRatePercent) === r
                            ? 'bg-[#0F172A] text-white border-[#0F172A]'
                            : 'bg-[#FAFAFA] text-[#525252] border-neutral-200/80'
                        }`}
                      >
                        {r}%
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#111111] mb-1">
                  Receipt Footer Note
                </label>
                <textarea
                  rows={2}
                  name="ReceiptFooter"
                  placeholder="ধন্যবাদ! বিক্রিত পণ্য ৭ দিনের মধ্যে পরিবর্তনযোগ্য।"
                  value={formData.ReceiptFooter || ''}
                  onChange={handleChange}
                  className="w-full px-3 py-2 text-xs bg-white border border-neutral-200/80 rounded-md text-[#111111] focus:outline-none focus:border-[#0F172A]"
                />
              </div>

              {/* লাইভ থার্মাল প্রিভিউ */}
              <div className="p-4 bg-[#FAFAFA] border border-neutral-200/80 rounded-md">
                <div className="text-[10px] font-mono uppercase tracking-wider text-[#737373] mb-2">
                  Live 80mm Receipt Preview
                </div>
                <div className="bg-white p-3 border border-neutral-200/80 rounded-sm font-mono tabular-nums text-[11px] text-[#525252] max-w-xs mx-auto text-center space-y-1">
                  <div className="font-semibold text-[#111111]">{formData.StoreName || 'ENTERPRISE POS'}</div>
                  <div className="text-[10px]">{formData.Address || 'Shop Address'}</div>
                  <div className="border-b border-dashed border-neutral-300 my-1.5" />
                  <div className="flex justify-between text-[10px]">
                    <span>Sample Item x1</span>
                    <span>{formData.CurrencySymbol || '৳'}1,000.00</span>
                  </div>
                  <div className="flex justify-between text-[10px]">
                    <span>Tax ({formData.TaxRatePercent || 0}%)</span>
                    <span>
                      {formData.CurrencySymbol || '৳'}
                      {((1000 * (Number(formData.TaxRatePercent) || 0)) / 100).toFixed(2)}
                    </span>
                  </div>
                  <div className="border-b border-dashed border-neutral-300 my-1.5" />
                  <div className="text-[10px] font-sans text-[#111111]">
                    {formData.ReceiptFooter || 'ধন্যবাদ! আবার আসবেন।'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ---------------- ট্যাব ২: Google Sheets Cloud API ---------------- */}
        {activeTab === 'api' && (
          <div className="bg-white border border-neutral-200/80 rounded-lg p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-200/80 pb-3">
              <div>
                <h2 className="text-sm font-semibold font-heading text-[#111111]">
                  Google Apps Script Web App URL
                </h2>
                <p className="text-xs text-[#525252] mt-0.5">
                  রিয়েল-টাইম গুগল শিট ডাটাবেস সিঙ্ক কানেকশন
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowApiGuide(!showApiGuide)}
                className="text-xs font-medium text-[#525252] hover:text-[#111111] inline-flex items-center gap-1 cursor-pointer"
              >
                <HelpCircle className="w-3.5 h-3.5" />
                <span>{showApiGuide ? 'Hide Guide' : 'Setup Guide'}</span>
              </button>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="url"
                name="apiUrl"
                placeholder="https://script.google.com/macros/s/.../exec"
                value={formData.apiUrl || ''}
                onChange={handleChange}
                className="flex-1 min-h-[44px] md:min-h-[38px] px-3 py-2 text-xs font-mono bg-white border border-neutral-200/80 rounded-md text-[#111111] focus:outline-none focus:border-[#0F172A]"
              />
              <button
                type="button"
                onClick={handleTest}
                disabled={isTesting}
                className="min-h-[44px] md:min-h-[38px] px-4 py-2 bg-[#0F172A] hover:bg-slate-800 text-white text-xs font-medium rounded-md inline-flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 shrink-0"
              >
                {isTesting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Link className="w-3.5 h-3.5" />}
                <span>{isTesting ? 'Processing...' : 'Test Connection'}</span>
              </button>
            </div>

            <div className="flex items-center justify-between text-xs">
              <StatusBadge variant="success">SSL Encrypted Endpoint</StatusBadge>
              <button
                type="button"
                onClick={() => {
                  setFormData((prev) => ({ ...prev, apiUrl: DEFAULT_APPS_SCRIPT_URL }));
                  setTestResult({ success: true, message: 'ডিফল্ট API URL যুক্ত করা হয়েছে।' });
                }}
                className="text-xs font-medium text-[#0F172A] hover:underline cursor-pointer"
              >
                Use Default Backend URL
              </button>
            </div>

            {testResult && (
              <div
                className={`p-3 rounded-md border text-xs flex items-center gap-2 ${
                  testResult.success
                    ? 'bg-emerald-50 border-emerald-200 text-[#15803D]'
                    : 'bg-red-50 border-red-200 text-[#B91C1C]'
                }`}
              >
                {testResult.success ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                <span>{testResult.message}</span>
              </div>
            )}

            {showApiGuide && (
              <div className="p-4 bg-[#FAFAFA] border border-neutral-200/80 rounded-md text-xs text-[#525252] space-y-1">
                <p className="font-semibold text-[#111111]">Setup Steps:</p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Google Sheet → Extensions → Apps Script</li>
                  <li>Deploy → New deployment → Type: Web App</li>
                  <li>Execute as: Me, Who has access: Anyone</li>
                  <li>Copy Web App URL and paste above.</li>
                </ol>
              </div>
            )}
          </div>
        )}

        {/* ---------------- ট্যাব ৩: Courier, SMS & Loyalty ---------------- */}
        {activeTab === 'integrations' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Loyalty & Storefront */}
            <div className="bg-white border border-neutral-200/80 rounded-lg p-5 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-neutral-200/80">
                <h2 className="text-sm font-semibold font-heading text-[#111111]">Loyalty & Storefront</h2>
                <label className="inline-flex items-center gap-2 text-xs text-[#525252] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.LoyaltyEnabled !== false}
                    onChange={(e) => setFormData((prev) => ({ ...prev, LoyaltyEnabled: e.target.checked }))}
                    className="rounded-xs border-neutral-300"
                  />
                  <span>Loyalty Active</span>
                </label>
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-[11px] font-medium text-[#111111] mb-1">Spend / 1 Pt</label>
                  <input
                    type="number"
                    name="LoyaltyPointsRate"
                    value={formData.LoyaltyPointsRate || 100}
                    onChange={handleChange}
                    className="w-full h-9 px-2.5 text-xs font-mono tabular-nums border border-neutral-200/80 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-[#111111] mb-1">Redeem Value</label>
                  <input
                    type="number"
                    step="0.1"
                    name="LoyaltyRedeemRate"
                    value={formData.LoyaltyRedeemRate !== undefined ? formData.LoyaltyRedeemRate : 1.0}
                    onChange={handleChange}
                    className="w-full h-9 px-2.5 text-xs font-mono tabular-nums border border-neutral-200/80 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-[#111111] mb-1">Min Redeem Pt</label>
                  <input
                    type="number"
                    name="MinRedeemPoints"
                    value={formData.MinRedeemPoints || 10}
                    onChange={handleChange}
                    className="w-full h-9 px-2.5 text-xs font-mono tabular-nums border border-neutral-200/80 rounded-md"
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-neutral-200/80 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-[#111111]">Storefront Announcement Banner</label>
                  <label className="inline-flex items-center gap-1.5 text-xs text-[#525252] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.StorefrontEnabled !== false}
                      onChange={(e) => setFormData((prev) => ({ ...prev, StorefrontEnabled: e.target.checked }))}
                    />
                    <span>Enabled</span>
                  </label>
                </div>
                <input
                  type="text"
                  name="StorefrontBannerText"
                  value={formData.StorefrontBannerText || ''}
                  onChange={handleChange}
                  placeholder="Optional announcement text..."
                  className="w-full min-h-[38px] px-3 py-2 text-xs border border-neutral-200/80 rounded-md"
                />
              </div>
            </div>

            {/* Courier & SMS */}
            <div className="bg-white border border-neutral-200/80 rounded-lg p-5 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-neutral-200/80">
                <h2 className="text-sm font-semibold font-heading text-[#111111]">Steadfast Courier & SMS</h2>
                <a
                  href="https://portal.steadfast.com.bd"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] font-medium text-[#525252] hover:text-[#111111] inline-flex items-center gap-1"
                >
                  <span>Portal</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-[#111111] mb-1">Steadfast API Key</label>
                  <input
                    type="password"
                    name="SteadfastApiKey"
                    value={formData.SteadfastApiKey || ''}
                    onChange={handleChange}
                    className="w-full h-9 px-2.5 text-xs font-mono border border-neutral-200/80 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-[#111111] mb-1">Steadfast Secret Key</label>
                  <input
                    type="password"
                    name="SteadfastSecretKey"
                    value={formData.SteadfastSecretKey || ''}
                    onChange={handleChange}
                    className="w-full h-9 px-2.5 text-xs font-mono border border-neutral-200/80 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-[#111111] mb-1">Inside Dhaka Delivery</label>
                  <input
                    type="number"
                    name="InsideDhakaDelivery"
                    value={formData.InsideDhakaDelivery !== undefined ? formData.InsideDhakaDelivery : '70'}
                    onChange={handleChange}
                    className="w-full h-9 px-2.5 text-xs font-mono tabular-nums border border-neutral-200/80 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-[#111111] mb-1">Outside Dhaka Delivery</label>
                  <input
                    type="number"
                    name="OutsideDhakaDelivery"
                    value={formData.OutsideDhakaDelivery !== undefined ? formData.OutsideDhakaDelivery : '130'}
                    onChange={handleChange}
                    className="w-full h-9 px-2.5 text-xs font-mono tabular-nums border border-neutral-200/80 rounded-md"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-neutral-200/80">
                <div>
                  <label className="block text-[11px] font-medium text-[#111111] mb-1">SMS Provider</label>
                  <select
                    name="SmsProvider"
                    value={formData.SmsProvider || 'Greenweb'}
                    onChange={handleChange}
                    className="w-full h-9 px-2.5 text-xs border border-neutral-200/80 rounded-md bg-white"
                  >
                    <option value="Greenweb">Greenweb</option>
                    <option value="BulkSMSBD">BulkSMSBD</option>
                    <option value="Elitbuzz">Elitbuzz</option>
                    <option value="Custom">Custom</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-[#111111] mb-1">SMS API Key</label>
                  <input
                    type="password"
                    name="SmsApiKey"
                    value={formData.SmsApiKey || ''}
                    onChange={handleChange}
                    className="w-full h-9 px-2.5 text-xs font-mono border border-neutral-200/80 rounded-md"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* অ্যাকশন ফুটার */}
        <div className="flex items-center justify-end gap-2 pt-2">
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] md:min-h-[38px] px-4 py-2 border border-neutral-200/80 bg-white hover:bg-neutral-100 text-xs font-medium text-[#111111] rounded-md cursor-pointer"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={isSaving}
            className="min-h-[44px] md:min-h-[38px] px-5 py-2 bg-[#0F172A] hover:bg-slate-800 text-white text-xs font-medium rounded-md inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isSaving ? 'Processing...' : 'Save Settings'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
