import React from 'react';
import { X, Keyboard, Sparkles, Check, ShoppingCart, PauseCircle, Search, Camera, Receipt, CreditCard, Scissors } from 'lucide-react';

/**
 * প্রফেশনাল ক্যাশিয়ার কিবোর্ড শর্টকাট গাইড মডাল (Keyboard Shortcuts Cheat Sheet)
 */
export default function KeyboardShortcutsModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  const SHORTCUT_GROUPS = [
    {
      title: '🛒 বিক্রয় ও ক্যাটালগ (Billing & Catalog)',
      items: [
        { key: 'F1', description: 'পণ্য দ্রুত অনুসন্ধান / সার্চ বক্সে ফোকাস', icon: Search },
        { key: 'F4', description: 'ক্যামেরা ও বারকোড স্ক্যানার চালু করুন', icon: Camera },
        { key: 'F7', description: 'টেইলারিং ও সেলাই অর্ডার স্টুডিও', icon: Scissors },
        { key: 'F8', description: 'ডিসকাউন্ট বা কুপন কোড বক্সে ফোকাস করুন', icon: Sparkles },
        { key: 'F9', description: 'সরাসরি চূড়ান্ত চেকআউট ও ক্যাশ পেমেন্টে যান', icon: CreditCard },
      ]
    },
    {
      title: '⏸ কাউন্টার কিউ ও অর্ডার হোল্ড (Queue & Hold)',
      items: [
        { key: 'F2', description: 'বর্তমান কাস্টমারের কার্ট হোল্ড করুন (পরের কাস্টমারের জন্য)', icon: PauseCircle },
        { key: 'F3', description: 'হোল্ডকৃত অর্ডার তালিকা ও রিকল ড্রয়ার খুলুন', icon: ShoppingCart },
      ]
    },
    {
      title: '🧾 নেভিগেশন ও সাধারণ (General & Invoices)',
      items: [
        { key: 'F10', description: 'ইনভয়েস অনুসন্ধান ও মেমো লুকআপ মডাল', icon: Receipt },
        { key: 'Shift + ?', description: 'কিবোর্ড শর্টকাট সহায়িকা গাইড খুলুন', icon: Keyboard },
        { key: 'Esc', description: 'যেকোনো খোলা মডাল বা পপআপ বন্ধ করুন', icon: X },
      ]
    }
  ];

  return (
    <div
      className="fixed inset-0 z-[110] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[90vh] my-auto flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 relative">
        
        {/* হেডার */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between shrink-0 border-b border-slate-800">
          <div className="flex items-center space-x-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300 shadow-inner shrink-0">
              <Keyboard className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base sm:text-lg font-black tracking-tight">
                  ক্যাশ কাউন্টার কিবোর্ড শর্টকাট
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
                  Pro Cashier Mode
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                মাউস ছাড়া শুধুমাত্র কিবোর্ডের বোতাম চেপে সুপারফাস্ট গতিতে বিলিং করুন
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition-all cursor-pointer"
            title="বন্ধ করুন"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* কনটেন্ট বডি */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5">
          {SHORTCUT_GROUPS.map((group, gIdx) => (
            <div key={gIdx} className="space-y-2.5">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-500">
                {group.title}
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {group.items.map((item, iIdx) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={iIdx}
                      className="p-3 bg-slate-50 border border-slate-200/90 rounded-2xl flex items-center justify-between gap-2 shadow-2xs hover:bg-indigo-50/40 hover:border-indigo-200 transition-all"
                    >
                      <div className="flex items-center space-x-2.5 min-w-0">
                        <div className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-600 shrink-0">
                          <Icon className="w-3.5 h-3.5 text-indigo-600" />
                        </div>
                        <span className="text-xs font-bold text-slate-800 truncate" title={item.description}>
                          {item.description}
                        </span>
                      </div>
                      <kbd className="px-2.5 py-1 bg-white border border-slate-300 rounded-xl text-slate-900 font-mono font-black text-xs shadow-xs shrink-0 tracking-tight">
                        {item.key}
                      </kbd>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {/* প্রো-টিপ বক্স */}
          <div className="p-3.5 bg-gradient-to-r from-amber-50 to-indigo-50 border border-amber-200 rounded-2xl flex items-center gap-2.5 text-xs font-semibold text-slate-800">
            <span className="text-base shrink-0">💡</span>
            <span>
              <strong>টিপস:</strong> যখন কোনো ইনপুট বক্সে লেখালেখি করছেন না, তখন যেকোনো স্ক্রিন থেকেই এই শর্টকাটগুলো তাৎক্ষণিকভাবে কাজ করবে।
            </span>
          </div>
        </div>

        {/* ফুটার */}
        <div className="px-6 py-3.5 bg-slate-100 border-t border-slate-200 flex items-center justify-between shrink-0">
          <span className="text-xs text-slate-500 font-medium">
            শর্টকাট খুলতে যেকোনো সময় চাপুন: <kbd className="px-1.5 py-0.5 bg-white border border-slate-300 rounded font-mono font-bold text-[10px]">Shift + ?</kbd>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 text-xs font-bold transition-all cursor-pointer active:scale-95 shadow-2xs"
          >
            বুঝেছি
          </button>
        </div>

      </div>
    </div>
  );
}

