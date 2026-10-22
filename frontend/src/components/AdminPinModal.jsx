import React, { useState } from 'react';
import {
  X,
  Lock,
  KeyRound,
  ShieldAlert,
  Check,
  Delete,
  AlertCircle
} from 'lucide-react';
import { playCashChime, playWarningBeep } from '../utils/soundEffects';

/**
 * অ্যাডমিন পিন অথরাইজেশন পপআপ মডাল (Admin PIN Authorization Shield)
 * ক্যাশিয়ার যখন লাভ-ক্ষতি, কেনা দাম বা সিস্টেম সেটিংসে ঢুকতে চেষ্টা করবে তখন
 * মালিকের পিন যাচাই করে সাময়িক এক্সেস প্রদান করে।
 */
export default function AdminPinModal({
  isOpen,
  onClose,
  onSuccess,
  actionTitle = 'অ্যাডমিন অনুমতি প্রয়োজন',
  actionDescription = 'এই সেকশনটি শুধুমাত্র দোকানের মালিক/অ্যাডমিনের জন্য সংরক্ষিত। এগিয়ে যেতে অ্যাডমিন পিন (PIN) দিন।',
  users = [],
  settings = {}
}) {
  const [pinInput, setPinInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  // অ্যাডমিন ব্যবহারকারীদের পিন তালিকা
  const adminUsers = (Array.isArray(users) ? users : []).filter(
    (u) => {
      const r = String(u.Role || u.role || '').toLowerCase();
      return r === 'admin' || r === 'owner' || r === 'মালিক';
    }
  );

  const handleKeyPress = (num) => {
    if (pinInput.length < 6) {
      setPinInput((prev) => prev + String(num));
      setErrorMsg('');
    }
  };

  const handleBackspace = () => {
    setPinInput((prev) => prev.slice(0, -1));
    setErrorMsg('');
  };

  const handleClear = () => {
    setPinInput('');
    setErrorMsg('');
  };

  const handleVerify = (e) => {
    if (e) e.preventDefault();
    if (!pinInput.trim()) {
      setErrorMsg('অনুগ্রহ করে অ্যাডমিন পিন লিখুন');
      playWarningBeep();
      return;
    }

    // ভেরিফাই: ইউজারদের মধ্যে কোনো সক্রিয় অ্যাডমিনের পিন অথবা সেটিংসের পিন অথবা ডিফল্ট ১২৩৪ এর সাথে মিল
    const storePin = String(settings.AdminPIN || settings.adminPin || '').trim();
    const isValidAdmin =
      adminUsers.some((u) => String(u.PIN || u.pin || '').trim() === pinInput.trim()) ||
      (storePin && pinInput.trim() === storePin) ||
      pinInput.trim() === '1234';

    if (isValidAdmin) {
      playCashChime();
      setPinInput('');
      setErrorMsg('');
      if (onSuccess) onSuccess();
      if (onClose) onClose();
    } else {
      setErrorMsg('ভুল অ্যাডমিন পিন! পুনরায় চেষ্টা করুন।');
      playWarningBeep();
      setPinInput('');
    }
  };

  return (
    <div
      className="fixed inset-0 z-[150] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-sm p-6 space-y-5 my-auto text-center relative animate-in zoom-in-95 duration-200">
        
        {/* ক্লোজ বাটন */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 p-1 rounded-xl hover:bg-slate-100 transition-all cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* আইকন ও টাইটেল */}
        <div className="space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 mx-auto flex items-center justify-center shadow-inner">
            <Lock className="w-7 h-7" />
          </div>
          <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
            {actionTitle}
          </h3>
          <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
            {actionDescription}
          </p>
        </div>

        {/* পিন ইনপুট ডিসপ্লে */}
        <div className="space-y-2">
          <div className="flex items-center justify-center space-x-2 py-2">
            {[0, 1, 2, 3].map((idx) => (
              <div
                key={idx}
                className={`w-10 h-12 rounded-xl border-2 flex items-center justify-center text-lg font-mono font-black transition-all ${
                  idx < pinInput.length
                    ? 'border-indigo-600 bg-indigo-50/60 text-indigo-900 shadow-xs scale-105'
                    : 'border-slate-200 bg-slate-50 text-slate-300'
                }`}
              >
                {idx < pinInput.length ? '●' : '—'}
              </div>
            ))}
          </div>

          {errorMsg && (
            <p className="text-xs font-bold text-rose-600 flex items-center justify-center space-x-1 animate-shake">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{errorMsg}</span>
            </p>
          )}
        </div>

        {/* নিউমেরিক কিপ্যাড */}
        <div className="grid grid-cols-3 gap-2 pt-1 max-w-[240px] mx-auto">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <button
              key={num}
              type="button"
              onClick={() => handleKeyPress(num)}
              className="h-12 rounded-2xl bg-slate-100 hover:bg-slate-200 active:bg-indigo-100 active:text-indigo-700 text-slate-800 font-mono font-black text-lg transition-all shadow-2xs active:scale-95 cursor-pointer"
            >
              {num}
            </button>
          ))}
          <button
            type="button"
            onClick={handleClear}
            className="h-12 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs transition-all active:scale-95 cursor-pointer"
          >
            ক্লিয়ার
          </button>
          <button
            type="button"
            onClick={() => handleKeyPress(0)}
            className="h-12 rounded-2xl bg-slate-100 hover:bg-slate-200 active:bg-indigo-100 active:text-indigo-700 text-slate-800 font-mono font-black text-lg transition-all shadow-2xs active:scale-95 cursor-pointer"
          >
            0
          </button>
          <button
            type="button"
            onClick={handleBackspace}
            className="h-12 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-all active:scale-95 cursor-pointer"
            title="মুছুন"
          >
            <Delete className="w-5 h-5" />
          </button>
        </div>

        {/* সাবমিট বোতাম */}
        <button
          type="button"
          onClick={handleVerify}
          className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white rounded-2xl text-xs font-black transition-all flex items-center justify-center space-x-2 shadow-lg shadow-indigo-500/25 cursor-pointer"
        >
          <KeyRound className="w-4 h-4" />
          <span>আনলক করুন</span>
        </button>

        <p className="text-[10px] text-slate-400">
          ডিফল্ট অ্যাডমিন পিন: <span className="font-mono font-bold text-slate-600">1234</span>
        </p>
      </div>
    </div>
  );
}
