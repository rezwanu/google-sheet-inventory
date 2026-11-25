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
      className="fixed inset-0 z-[150] bg-neutral-900/40 flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white rounded-lg border border-neutral-200/80 w-full max-w-sm p-6 space-y-5 my-auto text-center relative animate-in zoom-in-95 duration-200">
        
        {/* ক্লোজ বাটন */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 min-h-[44px] sm:min-h-[36px] min-w-[44px] sm:min-w-[36px] text-[#737373] hover:text-[#111111] p-1.5 rounded-md hover:bg-[#F5F5F5] transition-colors flex items-center justify-center cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* আইকন ও টাইটেল */}
        <div className="space-y-2">
          <div className="w-12 h-12 rounded-lg bg-amber-50 border border-amber-200 text-[#B45309] mx-auto flex items-center justify-center">
            <Lock className="w-6 h-6" />
          </div>
          <h3 className="text-base sm:text-lg font-semibold text-[#111111] tracking-tight">
            {actionTitle}
          </h3>
          <p className="text-xs text-[#525252] max-w-xs mx-auto leading-relaxed">
            {actionDescription}
          </p>
        </div>

        {/* পিন ইনপুট ডিসপ্লে */}
        <div className="space-y-2">
          <div className="flex items-center justify-center space-x-2 py-2">
            {[0, 1, 2, 3].map((idx) => (
              <div
                key={idx}
                className={`w-10 h-12 rounded-md border flex items-center justify-center text-lg font-mono tabular-nums font-semibold transition-colors ${
                  idx < pinInput.length
                    ? 'border-[#0F172A] bg-[#F5F5F5] text-[#111111]'
                    : 'border-neutral-200/80 bg-[#FAFAFA] text-neutral-300'
                }`}
              >
                {idx < pinInput.length ? '●' : '—'}
              </div>
            ))}
          </div>

          {errorMsg && (
            <p className="text-xs font-semibold text-[#B91C1C] flex items-center justify-center space-x-1 animate-shake">
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
              className="min-h-[44px] h-12 rounded-md bg-[#F5F5F5] hover:bg-neutral-200/70 active:bg-[#0F172A] active:text-white border border-neutral-200/80 text-[#111111] font-mono tabular-nums font-semibold text-lg transition-colors cursor-pointer"
            >
              {num}
            </button>
          ))}
          <button
            type="button"
            onClick={handleClear}
            className="min-h-[44px] h-12 rounded-md bg-[#F5F5F5] hover:bg-neutral-200/70 border border-neutral-200/80 text-[#525252] font-semibold text-xs transition-colors cursor-pointer"
          >
            ক্লিয়ার
          </button>
          <button
            type="button"
            onClick={() => handleKeyPress(0)}
            className="min-h-[44px] h-12 rounded-md bg-[#F5F5F5] hover:bg-neutral-200/70 active:bg-[#0F172A] active:text-white border border-neutral-200/80 text-[#111111] font-mono tabular-nums font-semibold text-lg transition-colors cursor-pointer"
          >
            0
          </button>
          <button
            type="button"
            onClick={handleBackspace}
            className="min-h-[44px] h-12 rounded-md bg-[#F5F5F5] hover:bg-neutral-200/70 border border-neutral-200/80 text-[#525252] flex items-center justify-center transition-colors cursor-pointer"
            title="মুছুন"
          >
            <Delete className="w-5 h-5" />
          </button>
        </div>

        {/* সাবমিট বোতাম */}
        <button
          type="button"
          onClick={handleVerify}
          className="w-full min-h-[44px] sm:min-h-[36px] py-2.5 bg-[#0F172A] hover:bg-slate-800 text-white rounded-md text-xs font-semibold transition-colors flex items-center justify-center space-x-2 cursor-pointer"
        >
          <KeyRound className="w-4 h-4" />
          <span>আনলক করুন</span>
        </button>

        <p className="text-[10px] text-[#737373]">
          ডিফল্ট অ্যাডমিন পিন: <span className="font-mono tabular-nums font-semibold text-[#525252]">1234</span>
        </p>
      </div>
    </div>
  );
}
