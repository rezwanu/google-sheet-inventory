import React, { useState, useRef } from 'react';
import {
  X,
  HardDrive,
  Download,
  Upload,
  Database,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  ShieldCheck,
  Calendar,
  Layers,
  ShoppingBag,
  Users,
  Scissors
} from 'lucide-react';
import {
  exportDatabaseBackupJSON,
  restoreDatabaseFromJSON,
  exportProductsExcelCSV,
  exportSalesExcelCSV,
  exportTailoringExcelCSV,
  exportCustomersExcelCSV
} from '../services/storage';
import { playCashChime, playWarningBeep } from '../utils/soundEffects';

export default function BackupRestoreModal({
  isOpen,
  onClose,
  embedded = false,
  products = [],
  salesHistory = [],
  customers = [],
  tailoringOrders = [],
  storeSettings = {},
  onRestoreComplete
}) {
  const [restoreFile, setRestoreFile] = useState(null);
  const [parsedPreview, setParsedPreview] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const storeName = storeSettings.StoreName || 'Pabna Bostraloy';

  // সম্পূর্ণ ব্যাকআপ ডাউনলোড হ্যান্ডলার
  const handleDownloadFullBackup = () => {
    setIsProcessing(true);
    try {
      const success = exportDatabaseBackupJSON(storeName);
      if (success) {
        playCashChime();
        setStatusMessage({
          type: 'success',
          text: 'সম্পূর্ণ দোকানের ডাটা ব্যাকআপ ফাইল (.json) সফলভাবে ডাউনলোড হয়েছে!'
        });
      } else {
        throw new Error('ব্যাকআপ ফাইল তৈরি করতে সমস্যা হয়েছে');
      }
    } catch (err) {
      playWarningBeep();
      setStatusMessage({ type: 'error', text: err.message });
    } finally {
      setIsProcessing(false);
    }
  };

  // ফাইল ড্রপ / সিলেক্ট হ্যান্ডলার
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.json')) {
      alert('অনুগ্রহ করে একটি বৈধ .json ব্যাকআপ ফাইল নির্বাচন করুন!');
      return;
    }

    setRestoreFile(file);
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target.result);
        if (json && json.collections) {
          setParsedPreview(json);
          setStatusMessage(null);
        } else {
          alert('অবৈধ ব্যাকআপ ফাইল! এটি এই সফটওয়্যারের ব্যাকআপ ফাইল নয়।');
          setRestoreFile(null);
          setParsedPreview(null);
        }
      } catch (err) {
        alert('ফাইলটি পড়া সম্ভব হয়নি। সঠিক JSON ব্যাকআপ ফাইল দিন।');
        setRestoreFile(null);
        setParsedPreview(null);
      }
    };
    reader.readAsText(file);
  };

  // ব্যাকআপ রিস্টোর নিশ্চিতকরণ
  const handleConfirmRestore = () => {
    if (!parsedPreview) return;

    if (
      !confirm(
        'সতর্কবার্তা: ব্যাকআপ ফাইলটি রিস্টোর করলে বর্তমান লোকাল ডাটাবেস প্রতিস্থাপিত হবে! আপনি কি নিশ্চিতভাবে রিস্টোর সম্পন্ন করতে চান?'
      )
    ) {
      return;
    }

    setIsProcessing(true);
    try {
      const res = restoreDatabaseFromJSON(parsedPreview);
      if (res.success) {
        playCashChime();
        alert('ডাটাবেস সফলভাবে রিস্টোর সম্পন্ন হয়েছে! নতুন ডাটা লোড করার জন্য সিস্টেম রিলোড হচ্ছে...');
        if (onRestoreComplete) onRestoreComplete();
        window.location.reload();
      } else {
        throw new Error(res.error || 'রিস্টোর ব্যর্থ হয়েছে');
      }
    } catch (err) {
      playWarningBeep();
      setStatusMessage({ type: 'error', text: `রিস্টোরে সমস্যা: ${err.message}` });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div
      className={
        embedded
          ? 'w-full h-full flex flex-col bg-[#FAFAFA]'
          : 'fixed inset-0 z-50 bg-neutral-900/40 flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-in fade-in duration-200'
      }
      role="dialog"
      aria-modal="true"
    >
      <div
        className={
          embedded
            ? 'w-full h-full flex flex-col bg-white rounded-lg border border-neutral-200/80 overflow-hidden'
            : 'bg-white rounded-lg border border-neutral-200/80 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden my-auto animate-in zoom-in-95 duration-200'
        }
      >
        {/* ================= হেডার ================= */}
        <div className="bg-[#FAFAFA] text-[#111111] p-4 sm:p-5 flex items-center justify-between border-b border-neutral-200/80">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-[#0F172A] flex items-center justify-center text-white shrink-0">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg sm:text-xl font-semibold tracking-tight text-[#111111]">
                  সম্পূর্ণ ডাটা ব্যাকআপ ও রিস্টোর হাব
                </h2>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-[#F5F5F5] text-[#525252] border border-neutral-200/80 uppercase">
                  Data Vault
                </span>
              </div>
              <p className="text-xs text-[#525252] mt-0.5">
                ১-ক্লিকে সম্পূর্ণ দোকানের ডাটা ব্যাকআপ, এক্সেল এক্সপোর্ট এবং যেকোনো মুহূর্তে ডাটা রিস্টোর
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] sm:min-h-[36px] min-w-[44px] sm:min-w-[36px] p-2 rounded-md text-[#737373] hover:text-[#111111] hover:bg-[#F5F5F5] transition-colors flex items-center justify-center cursor-pointer"
            title="বন্ধ করুন"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ================= মূল কনটেন্ট ================= */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-[#FAFAFA] space-y-6">
          
          {/* ডাটাবেস সারাংশ স্ট্রিপ */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-white p-4 rounded-lg border border-neutral-200/80 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-semibold text-[#525252] uppercase">পণ্য ক্যাটালগ</span>
                <h3 className="text-xl font-semibold font-mono tabular-nums text-[#111111] mt-0.5">{products.length}টি</h3>
              </div>
              <div className="w-9 h-9 rounded-md bg-[#F5F5F5] border border-neutral-200/80 text-[#0F172A] flex items-center justify-center">
                <Layers className="w-4 h-4" />
              </div>
            </div>

            <div className="bg-white p-4 rounded-lg border border-neutral-200/80 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-semibold text-[#525252] uppercase">বিক্রয় ইনভয়েস</span>
                <h3 className="text-xl font-semibold font-mono tabular-nums text-[#111111] mt-0.5">{salesHistory.length}টি</h3>
              </div>
              <div className="w-9 h-9 rounded-md bg-emerald-50 border border-emerald-200 text-[#15803D] flex items-center justify-center">
                <ShoppingBag className="w-4 h-4" />
              </div>
            </div>

            <div className="bg-white p-4 rounded-lg border border-neutral-200/80 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-semibold text-[#525252] uppercase">গ্রাহক ডাটাবেস</span>
                <h3 className="text-xl font-semibold font-mono tabular-nums text-[#111111] mt-0.5">{customers.length}জন</h3>
              </div>
              <div className="w-9 h-9 rounded-md bg-[#F5F5F5] border border-neutral-200/80 text-[#0F172A] flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
            </div>

            <div className="bg-white p-4 rounded-lg border border-neutral-200/80 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-semibold text-[#525252] uppercase">টেইলারিং অর্ডার</span>
                <h3 className="text-xl font-semibold font-mono tabular-nums text-[#111111] mt-0.5">{tailoringOrders.length}টি</h3>
              </div>
              <div className="w-9 h-9 rounded-md bg-amber-50 border border-amber-200 text-[#B45309] flex items-center justify-center">
                <Scissors className="w-4 h-4" />
              </div>
            </div>
          </div>

          {/* স্ট্যাটাস নোটিশ */}
          {statusMessage && (
            <div
              className={`p-4 rounded-lg border text-xs font-semibold flex items-center space-x-2 animate-in fade-in ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-50 text-[#15803D] border-emerald-200'
                  : 'bg-red-50 text-[#B91C1C] border-red-200'
              }`}
            >
              {statusMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-[#15803D] shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-[#B91C1C] shrink-0" />
              )}
              <span>{statusMessage.text}</span>
            </div>
          )}

          {/* ১. সম্পূর্ণ ডাটা ব্যাকআপ ডাউনলোড সেকশন */}
          <div className="bg-white p-6 rounded-lg border border-neutral-200/80 flex flex-col sm:flex-row items-center justify-between gap-5">
            <div className="space-y-1.5 text-center sm:text-left">
              <div className="flex items-center justify-center sm:justify-start space-x-2">
                <span className="w-7 h-7 rounded-md bg-[#F5F5F5] border border-neutral-200/80 text-[#111111] flex items-center justify-center font-mono tabular-nums font-semibold text-xs">
                  ১
                </span>
                <h3 className="text-base font-semibold tracking-tight text-[#111111]">
                  সম্পূর্ণ ডাটাবেস ব্যাকআপ ডাউনলোড (JSON Snapshot)
                </h3>
              </div>
              <p className="text-xs text-[#525252] max-w-lg">
                এক ক্লিকে সম্পূর্ণ দোকানের ডাটা (পণ্য, কেনা দাম, সেলস, কাস্টমার, বাকি খাতা, খরচের খাতা, টেইলারিং ও মাপজোখ) একটি নিরাপদ ফাইলে সংরক্ষণ করুন।
              </p>
            </div>

            <button
              type="button"
              onClick={handleDownloadFullBackup}
              disabled={isProcessing}
              className="min-h-[44px] sm:min-h-[36px] px-6 py-2.5 bg-[#0F172A] hover:bg-slate-800 text-white rounded-md font-semibold text-xs transition-colors flex items-center space-x-2 shrink-0 cursor-pointer disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span>১-ক্লিক ব্যাকআপ ডাউনলোড</span>
            </button>
          </div>

          {/* ২. ব্যাকআপ ফাইল থেকে রিস্টোর সেকশন */}
          <div className="bg-white p-6 rounded-lg border border-neutral-200/80 space-y-4">
            <div className="flex items-center space-x-2 border-b border-neutral-200/80 pb-3">
              <span className="w-7 h-7 rounded-md bg-amber-50 border border-amber-200 text-[#B45309] flex items-center justify-center font-mono tabular-nums font-semibold text-xs">
                ২
              </span>
              <h3 className="text-base font-semibold tracking-tight text-[#111111]">
                ব্যাকআপ ফাইল থেকে ডাটা রিস্টোর (Restore from JSON)
              </h3>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-4">
              <input
                type="file"
                ref={fileInputRef}
                accept=".json"
                onChange={handleFileChange}
                className="hidden"
              />

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="min-h-[44px] sm:min-h-[36px] w-full sm:w-auto px-5 py-2.5 border border-dashed border-neutral-300 hover:border-[#0F172A] rounded-md text-xs font-semibold text-[#525252] hover:text-[#111111] transition-colors flex items-center justify-center space-x-2 cursor-pointer bg-[#FAFAFA]"
              >
                <Upload className="w-4 h-4 text-[#525252]" />
                <span>{restoreFile ? restoreFile.name : 'কম্পিউটার থেকে ব্যাকআপ ফাইল নির্বাচন করুন...'}</span>
              </button>

              {parsedPreview && (
                <div className="flex-1 bg-[#F5F5F5] p-3 rounded-lg border border-neutral-200/80 text-xs space-y-1">
                  <p className="font-semibold text-[#111111]">
                    ফাইলের দোকান: <span className="text-[#0F172A]">{parsedPreview.storeName || 'Pabna Bostraloy'}</span>
                  </p>
                  <p className="text-[11px] text-[#525252] font-mono tabular-nums">
                    ব্যাকআপের তারিখ: {new Date(parsedPreview.exportedAt).toLocaleString('bn-BD')}
                  </p>
                  <p className="text-[11px] text-[#15803D] font-semibold font-mono tabular-nums">
                    উপলব্ধ সংগ্রহ: {Object.keys(parsedPreview.collections || {}).length}টি ডাটা টেবিল
                  </p>
                </div>
              )}

              {parsedPreview && (
                <button
                  type="button"
                  onClick={handleConfirmRestore}
                  disabled={isProcessing}
                  className="min-h-[44px] sm:min-h-[36px] w-full sm:w-auto px-6 py-2.5 bg-[#B45309] hover:bg-amber-800 text-white rounded-md font-semibold text-xs transition-colors flex items-center justify-center space-x-2 shrink-0 cursor-pointer disabled:opacity-50"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>রিস্টোর নিশ্চিত করুন</span>
                </button>
              )}
            </div>
          </div>

          {/* ৩. এক্সেল ও CSV এক্সপোর্ট হাব */}
          <div className="bg-white p-6 rounded-lg border border-neutral-200/80 space-y-4">
            <div className="flex items-center space-x-2 border-b border-neutral-200/80 pb-3">
              <span className="w-7 h-7 rounded-md bg-[#F5F5F5] border border-neutral-200/80 text-[#111111] flex items-center justify-center font-mono tabular-nums font-semibold text-xs">
                ৩
              </span>
              <h3 className="text-base font-semibold tracking-tight text-[#111111]">
                মাইক্রোসফট এক্সেল ও CSV এক্সপোর্ট হাব (Excel Friendly)
              </h3>
            </div>

            <p className="text-xs text-[#525252]">
              দোকানের হিসাব বা অডিটের জন্য আলাদা আলাদা এক্সেল শিট ডাউনলোড করুন (UTF-8 বাংলা সাপোর্ট সহ):
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <button
                type="button"
                onClick={() => {
                  exportProductsExcelCSV(products);
                  playCashChime();
                }}
                className="min-h-[44px] p-4 bg-[#FAFAFA] hover:bg-[#F5F5F5] border border-neutral-200/80 hover:border-neutral-300 rounded-lg text-left transition-colors group cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <FileSpreadsheet className="w-5 h-5 text-[#15803D]" />
                  <span className="text-[10px] font-semibold text-[#737373] font-mono tabular-nums">{products.length} Items</span>
                </div>
                <h4 className="font-semibold text-xs text-[#111111] mt-2">পণ্য ক্যাটালগ (.csv)</h4>
                <p className="text-[10px] text-[#525252] mt-0.5">কেনা দাম, বিক্রয় মূল্য ও লাইভ স্টক</p>
              </button>

              <button
                type="button"
                onClick={() => {
                  exportSalesExcelCSV(salesHistory);
                  playCashChime();
                }}
                className="min-h-[44px] p-4 bg-[#FAFAFA] hover:bg-[#F5F5F5] border border-neutral-200/80 hover:border-neutral-300 rounded-lg text-left transition-colors group cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <FileSpreadsheet className="w-5 h-5 text-[#0F172A]" />
                  <span className="text-[10px] font-semibold text-[#737373] font-mono tabular-nums">{salesHistory.length} Invoices</span>
                </div>
                <h4 className="font-semibold text-xs text-[#111111] mt-2">বিক্রয় ও মেমো হিস্ট্রি (.csv)</h4>
                <p className="text-[10px] text-[#525252] mt-0.5">ইনভয়েস, কাস্টমার, মোট বিল ও পেমেন্ট</p>
              </button>

              <button
                type="button"
                onClick={() => {
                  exportTailoringExcelCSV(tailoringOrders);
                  playCashChime();
                }}
                className="min-h-[44px] p-4 bg-[#FAFAFA] hover:bg-[#F5F5F5] border border-neutral-200/80 hover:border-neutral-300 rounded-lg text-left transition-colors group cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <FileSpreadsheet className="w-5 h-5 text-[#525252]" />
                  <span className="text-[10px] font-semibold text-[#737373] font-mono tabular-nums">{tailoringOrders.length} Orders</span>
                </div>
                <h4 className="font-semibold text-xs text-[#111111] mt-2">টেইলারিং রেজিস্টার (.csv)</h4>
                <p className="text-[10px] text-[#525252] mt-0.5">পোশাক, মাপ, মজুরি ও ডেলিভারি রিপোর্ট</p>
              </button>

              <button
                type="button"
                onClick={() => {
                  exportCustomersExcelCSV(customers);
                  playCashChime();
                }}
                className="min-h-[44px] p-4 bg-[#FAFAFA] hover:bg-[#F5F5F5] border border-neutral-200/80 hover:border-neutral-300 rounded-lg text-left transition-colors group cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <FileSpreadsheet className="w-5 h-5 text-[#B45309]" />
                  <span className="text-[10px] font-semibold text-[#737373] font-mono tabular-nums">{customers.length} Customers</span>
                </div>
                <h4 className="font-semibold text-xs text-[#111111] mt-2">গ্রাহক ও বাকি লেজার (.csv)</h4>
                <p className="text-[10px] text-[#525252] mt-0.5">ক্রেতার নাম, মোবাইল ও বকেয়া খাতা</p>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
