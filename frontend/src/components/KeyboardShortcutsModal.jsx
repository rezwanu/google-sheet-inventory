import React from 'react';
import { X, Keyboard, Sparkles, Check, ShoppingCart, PauseCircle, Search, Camera, Receipt, CreditCard, Scissors, Calculator, Info } from 'lucide-react';

/**
 * প্রফেশনাল ক্যাশিয়ার কিবোর্ড শর্টকাট গাইড মডাল (Keyboard Shortcuts Cheat Sheet)
 */
export default function KeyboardShortcutsModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  const SHORTCUT_GROUPS = [
    {
      title: 'বিক্রয় ও ক্যাটালগ (Billing & Catalog)',
      items: [
        { key: 'F1', description: 'পণ্য দ্রুত অনুসন্ধান / সার্চ বক্সে ফোকাস', icon: Search },
        { key: 'F4', description: 'ক্যামেরা ও বারকোড স্ক্যানার চালু করুন', icon: Camera },
        { key: 'F7', description: 'টেইলারিং ও সেলাই অর্ডার স্টুডিও', icon: Scissors },
        { key: 'F8', description: 'ডিসকাউন্ট বা কুপন কোড বক্সে ফোকাস করুন', icon: Sparkles },
        { key: 'F9', description: 'সরাসরি চূড়ান্ত চেকআউট ও ক্যাশ পেমেন্টে যান', icon: CreditCard },
      ]
    },
    {
      title: 'কাউন্টার কিউ ও অর্ডার হোল্ড (Queue & Hold)',
      items: [
        { key: 'F2', description: 'বর্তমান কাস্টমারের কার্ট হোল্ড করুন (পরের কাস্টমারের জন্য)', icon: PauseCircle },
        { key: 'F3', description: 'হোল্ডকৃত অর্ডার তালিকা ও রিকল ড্রয়ার খুলুন', icon: ShoppingCart },
      ]
    },
    {
      title: 'নেভিগেশন ও সাধারণ (General & Invoices)',
      items: [
        { key: 'Alt + C / F6', description: 'কাটা কাপড় গজ-গিরা ক্যালকুলেটর চালু করুন', icon: Scissors },
        { key: 'Alt + E / F5', description: 'কাউন্টার কুইক খরচ ও মিনি ক্যাশ-আউট পপআপ', icon: Receipt },
        { key: 'F10', description: 'ইনভয়েস অনুসন্ধান ও মেমো লুকআপ মডাল', icon: Receipt },
        { key: 'Shift + ?', description: 'কিবোর্ড শর্টকাট সহায়িকা গাইড খুলুন', icon: Keyboard },
        { key: 'Esc', description: 'যেকোনো খোলা মডাল বা পপআপ বন্ধ করুন', icon: X },
      ]
    }
  ];

  return (
    <div
      className="fixed inset-0 z-[110] bg-neutral-900/40 flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white rounded-lg border border-neutral-200/80 w-full max-w-2xl max-h-[90vh] my-auto flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 relative">
        
        {/* হেডার */}
        <div className="px-6 py-4 bg-[#FAFAFA] border-b border-neutral-200/80 text-[#111111] flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3 min-w-0">
            <div className="w-10 h-10 rounded-lg bg-[#0F172A] text-white flex items-center justify-center shrink-0">
              <Keyboard className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base sm:text-lg font-semibold tracking-tight text-[#111111]">
                  ক্যাশ কাউন্টার কিবোর্ড শর্টকাট
                </h3>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-[#F5F5F5] text-[#525252] border border-neutral-200/80">
                  Pro Cashier Mode
                </span>
              </div>
              <p className="text-xs text-[#525252] mt-0.5">
                মাউস ছাড়া শুধুমাত্র কিবোর্ডের বোতাম চেপে সুপারফাস্ট গতিতে বিলিং করুন
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] sm:min-h-[36px] min-w-[44px] sm:min-w-[36px] rounded-md bg-white border border-neutral-200/80 hover:bg-[#F5F5F5] text-[#525252] hover:text-[#111111] flex items-center justify-center transition-colors cursor-pointer"
            title="বন্ধ করুন"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* কনটেন্ট বডি */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 bg-white">
          {SHORTCUT_GROUPS.map((group, gIdx) => (
            <div key={gIdx} className="space-y-2.5">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-[#525252]">
                {group.title}
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {group.items.map((item, iIdx) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={iIdx}
                      className="p-3 bg-[#FAFAFA] border border-neutral-200/80 rounded-lg flex items-center justify-between gap-2 hover:bg-[#F5F5F5] transition-colors"
                    >
                      <div className="flex items-center space-x-2.5 min-w-0">
                        <div className="w-7 h-7 rounded-md bg-white border border-neutral-200/80 flex items-center justify-center text-[#0F172A] shrink-0">
                          <Icon className="w-3.5 h-3.5 text-[#0F172A]" />
                        </div>
                        <span className="text-xs font-semibold text-[#111111] truncate" title={item.description}>
                          {item.description}
                        </span>
                      </div>
                      <kbd className="px-2.5 py-1 bg-white border border-neutral-200/80 rounded-md text-[#111111] font-mono tabular-nums font-semibold text-xs shrink-0 tracking-tight">
                        {item.key}
                      </kbd>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {/* প্রো-টিপ বক্স */}
          <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2.5 text-xs font-medium text-[#111111]">
            <Info className="w-4 h-4 text-[#B45309] shrink-0" />
            <span>
              <strong>টিপস:</strong> যখন কোনো ইনপুট বক্সে লেখালেখি করছেন না, তখন যেকোনো স্ক্রিন থেকেই এই শর্টকাটগুলো তাৎক্ষণিকভাবে কাজ করবে।
            </span>
          </div>
        </div>

        {/* ফুটার */}
        <div className="px-6 py-3.5 bg-[#FAFAFA] border-t border-neutral-200/80 flex items-center justify-between shrink-0">
          <span className="text-xs text-[#525252] font-medium">
            শর্টকাট খুলতে যেকোনো সময় চাপুন: <kbd className="px-1.5 py-0.5 bg-white border border-neutral-200/80 rounded-md font-mono tabular-nums font-semibold text-[10px] text-[#111111]">Shift + ?</kbd>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] sm:min-h-[36px] px-5 py-2 rounded-md bg-[#0F172A] hover:bg-slate-800 text-white text-xs font-semibold transition-colors cursor-pointer"
          >
            বুঝেছি
          </button>
        </div>

      </div>
    </div>
  );
}
