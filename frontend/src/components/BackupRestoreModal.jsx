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
  exportTailoringExcelCSV
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
            : 'bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden my-auto animate-in zoom-in-95 duration-200'
        }
      >
        {/* ================= হেডার ================= */}
        <div className="bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 text-white p-4 sm:p-5 flex items-center justify-between border-b border-teal-900/40">
          <div className="flex items-center space-x-3">
            <div className="w-11 h-11 rounded-2xl bg-teal-500/20 border border-teal-400/30 flex items-center justify-center text-teal-400 shadow-inner">
              <Database className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg sm:text-xl font-black tracking-tight text-white">
                  সম্পূর্ণ ডাটা ব্যাকআপ ও রিস্টোর হাব
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-500/30 text-teal-300 border border-teal-400/40 uppercase">
                  Data Vault
                </span>
              </div>
              <p className="text-xs text-teal-200/80 mt-0.5">
                ১-ক্লিকে সম্পূর্ণ দোকানের ডাটা ব্যাকআপ, এক্সেল এক্সপোর্ট এবং যেকোনো মুহূর্তে ডাটা রিস্টোর
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-all cursor-pointer"
            title="বন্ধ করুন"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ================= মূল কনটেন্ট ================= */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50/60 space-y-6">
          
          {/* ডাটাবেস সারাংশ স্ট্রিপ */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-slate-500 uppercase">পণ্য ক্যাটালগ</span>
                <h3 className="text-xl font-black text-slate-900 mt-0.5">{products.length}টি</h3>
              </div>
              <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Layers className="w-4 h-4" />
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-slate-500 uppercase">বিক্রয় ইনভয়েস</span>
                <h3 className="text-xl font-black text-slate-900 mt-0.5">{salesHistory.length}টি</h3>
              </div>
              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <ShoppingBag className="w-4 h-4" />
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-slate-500 uppercase">গ্রাহক ডাটাবেস</span>
                <h3 className="text-xl font-black text-slate-900 mt-0.5">{customers.length}জন</h3>
              </div>
              <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-slate-500 uppercase">টেইলারিং অর্ডার</span>
                <h3 className="text-xl font-black text-slate-900 mt-0.5">{tailoringOrders.length}টি</h3>
              </div>
              <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <Scissors className="w-4 h-4" />
              </div>
            </div>
          </div>

          {/* স্ট্যাটাস নোটিশ */}
          {statusMessage && (
            <div
              className={`p-4 rounded-2xl border text-xs font-bold flex items-center space-x-2 animate-in fade-in ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                  : 'bg-rose-50 text-rose-800 border-rose-300'
              }`}
            >
              {statusMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span>{statusMessage.text}</span>
            </div>
          )}

          {/* ১. সম্পূর্ণ ডাটা ব্যাকআপ ডাউনলোড সেকশন */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-5">
            <div className="space-y-1.5 text-center sm:text-left">
              <div className="flex items-center justify-center sm:justify-start space-x-2">
                <span className="w-7 h-7 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center font-black text-xs">
                  ১
                </span>
                <h3 className="text-base font-black text-slate-900">
                  সম্পূর্ণ ডাটাবেস ব্যাকআপ ডাউনলোড (JSON Snapshot)
                </h3>
              </div>
              <p className="text-xs text-slate-500 max-w-lg">
                এক ক্লিকে সম্পূর্ণ দোকানের ডাটা (পণ্য, কেনা দাম, সেলস, কাস্টমার, বাকি খাতা, খরচের খাতা, টেইলারিং ও মাপজোখ) একটি নিরাপদ ফাইলে সংরক্ষণ করুন।
              </p>
            </div>

            <button
              onClick={handleDownloadFullBackup}
              disabled={isProcessing}
              className="px-6 py-3.5 bg-teal-600 hover:bg-teal-700 active:scale-98 text-white rounded-2xl font-black text-xs transition-all flex items-center space-x-2 shadow-lg shadow-teal-600/25 shrink-0 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>১-ক্লিক ব্যাকআপ ডাউনলোড</span>
            </button>
          </div>

          {/* ২. ব্যাকআপ ফাইল থেকে রিস্টোর সেকশন */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
              <span className="w-7 h-7 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-black text-xs">
                ২
              </span>
              <h3 className="text-base font-black text-slate-900">
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
                className="w-full sm:w-auto px-5 py-3 border-2 border-dashed border-slate-300 hover:border-indigo-500 rounded-2xl text-xs font-bold text-slate-700 hover:text-indigo-600 transition-all flex items-center justify-center space-x-2 cursor-pointer bg-slate-50"
              >
                <Upload className="w-4 h-4 text-slate-500" />
                <span>{restoreFile ? restoreFile.name : 'কম্পিউটার থেকে ব্যাকআপ ফাইল নির্বাচন করুন...'}</span>
              </button>

              {parsedPreview && (
                <div className="flex-1 bg-slate-50 p-3 rounded-2xl border border-slate-200 text-xs space-y-1">
                  <p className="font-bold text-slate-800">
                    ফাইলের দোকান: <span className="text-indigo-700">{parsedPreview.storeName || 'Pabna Bostraloy'}</span>
                  </p>
                  <p className="text-[11px] text-slate-500">
                    ব্যাকআপের তারিখ: {new Date(parsedPreview.exportedAt).toLocaleString('bn-BD')}
                  </p>
                  <p className="text-[11px] text-emerald-700 font-bold">
                    উপলব্ধ সংগ্রহ: {Object.keys(parsedPreview.collections || {}).length}টি ডাটা টেবিল
                  </p>
                </div>
              )}

              {parsedPreview && (
                <button
                  type="button"
                  onClick={handleConfirmRestore}
                  disabled={isProcessing}
                  className="w-full sm:w-auto px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-2xl font-black text-xs shadow-md transition-all flex items-center justify-center space-x-2 shrink-0 cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>রিস্টোর নিশ্চিত করুন</span>
                </button>
              )}
            </div>
          </div>

          {/* ৩. এক্সেল ও CSV এক্সপোর্ট হাব */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
              <span className="w-7 h-7 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-black text-xs">
                ৩
              </span>
              <h3 className="text-base font-black text-slate-900">
                মাইক্রোসফট এক্সেল ও CSV এক্সপোর্ট হাব (Excel Friendly)
              </h3>
            </div>

            <p className="text-xs text-slate-500">
              দোকানের হিসাব বা অডিটের জন্য আলাদা আলাদা এক্সেল শিট ডাউনলোড করুন (UTF-8 বাংলা সাপোর্ট সহ):
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => {
                  exportProductsExcelCSV(products);
                  playCashChime();
                }}
                className="p-4 bg-slate-50 hover:bg-indigo-50/60 border border-slate-200 hover:border-indigo-300 rounded-2xl text-left transition-all group cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <FileSpreadsheet className="w-5 h-5 text-emerald-600 group-hover:scale-110 transition-transform" />
                  <span className="text-[10px] font-bold text-slate-400 font-mono">{products.length} Items</span>
                </div>
                <h4 className="font-black text-xs text-slate-900 mt-2">পণ্য ক্যাটালগ (.csv)</h4>
                <p className="text-[10px] text-slate-500 mt-0.5">কেনা দাম, বিক্রয় মূল্য ও লাইভ স্টক</p>
              </button>

              <button
                type="button"
                onClick={() => {
                  exportSalesExcelCSV(salesHistory);
                  playCashChime();
                }}
                className="p-4 bg-slate-50 hover:bg-indigo-50/60 border border-slate-200 hover:border-indigo-300 rounded-2xl text-left transition-all group cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <FileSpreadsheet className="w-5 h-5 text-indigo-600 group-hover:scale-110 transition-transform" />
                  <span className="text-[10px] font-bold text-slate-400 font-mono">{salesHistory.length} Invoices</span>
                </div>
                <h4 className="font-black text-xs text-slate-900 mt-2">বিক্রয় ও মেমো হিস্ট্রি (.csv)</h4>
                <p className="text-[10px] text-slate-500 mt-0.5">ইনভয়েস, কাস্টমার, মোট বিল ও পেমেন্ট</p>
              </button>

              <button
                type="button"
                onClick={() => {
                  exportTailoringExcelCSV(tailoringOrders);
                  playCashChime();
                }}
                className="p-4 bg-slate-50 hover:bg-indigo-50/60 border border-slate-200 hover:border-indigo-300 rounded-2xl text-left transition-all group cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <FileSpreadsheet className="w-5 h-5 text-purple-600 group-hover:scale-110 transition-transform" />
                  <span className="text-[10px] font-bold text-slate-400 font-mono">{tailoringOrders.length} Orders</span>
                </div>
                <h4 className="font-black text-xs text-slate-900 mt-2">টেইলারিং অর্ডার রেজিস্টার (.csv)</h4>
                <p className="text-[10px] text-slate-500 mt-0.5">পোশাক, মাপ, মজুরি ও ডেলিভারি রিপোর্ট</p>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

