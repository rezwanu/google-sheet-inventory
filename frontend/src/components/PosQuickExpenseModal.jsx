import React, { useState, useEffect } from 'react';
import {
  X,
  Receipt,
  Coffee,
  Truck,
  Package,
  Wrench,
  CheckCircle2,
  AlertCircle,
  Coins,
  ArrowDownRight,
  Zap
} from 'lucide-react';
import { getLocalExpenseCategories } from '../services/storage';

/**
 * পিওএস কাউন্টার মিনি ক্যাশ-আউট ও কুইক খরচ মডাল (POS Mini Cash-Out Studio)
 * কীবোর্ড শর্টকাট (Alt + E) বা কাউন্টার বোতাম থেকে তাৎক্ষণিক খুচরা খরচের জন্য
 */
export default function PosQuickExpenseModal({
  isOpen = false,
  onClose,
  onSaveExpense,
  currencySymbol = '৳',
  activeUser = null
}) {
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Refreshments');
  const [categories, setCategories] = useState(() => getLocalExpenseCategories());
  const [payee, setPayee] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setCategories(getLocalExpenseCategories());
      setAmount('');
      setCategory('Refreshments');
      setPayee('');
      setDescription('');
      setFeedback(null);
      setIsSubmitting(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // ১-ক্লিক এক্সপ্রেস প্রিসেটস
  const QUICK_PRESETS = [
    { title: 'চা-নাস্তা ৫০৳', amount: 50, category: 'Refreshments', icon: Coffee, desc: 'দোকানের চা-নাস্তা খরচ' },
    { title: 'চা-নাস্তা ১০০৳', amount: 100, category: 'Refreshments', icon: Coffee, desc: 'দোকানের চা-নাস্তা খরচ' },
    { title: 'রিকশাভাড়া ৫০৳', amount: 50, category: 'Transport', icon: Truck, desc: 'মালামাল/স্টাফ যাতায়াত' },
    { title: 'কুরিয়ার ১৫০৳', amount: 150, category: 'Transport', icon: Truck, desc: 'পার্সেল বুকিং ফি' },
    { title: 'পরিচ্ছন্নতা ১০০৳', amount: 100, category: 'Maintenance', icon: Wrench, desc: 'দোকান ঝাড়ু/পরিচ্ছন্নতা' },
    { title: 'পলিথিন ব্যাগ ৫০০৳', amount: 500, category: 'Packaging', icon: Package, desc: 'প্যাকেজিং পলিথিন/ব্যাগ' }
  ];

  // প্রিসেট ক্লিক হ্যান্ডলার
  const handlePresetClick = async (preset) => {
    setIsSubmitting(true);
    setFeedback({ type: 'info', text: `${preset.title} সংরক্ষণ হচ্ছে...` });

    try {
      const payload = {
        ExpenseID: `EXP-QCK-${Date.now().toString().slice(-6)}`,
        Date: new Date().toISOString().split('T')[0],
        Category: preset.category,
        Amount: preset.amount,
        PaymentMethod: 'Cash',
        Payee: 'কাউন্টার ক্যাশ-আউট',
        Description: preset.desc,
        CreatedBy: activeUser?.FullName || activeUser?.UserName || 'Cashier',
        isQuickPreset: true,
        sourceType: 'POS_QUICK_MODAL'
      };

      if (typeof onSaveExpense === 'function') {
        await onSaveExpense(payload);
      }

      setFeedback({ type: 'success', text: `✓ ${preset.title} ক্যাশ ড্রয়ার থেকে কর্তন সফল!` });
      setTimeout(() => {
        if (onClose) onClose();
      }, 700);
    } catch (err) {
      setFeedback({ type: 'error', text: `ব্যর্থ: ${err.message}` });
      setIsSubmitting(false);
    }
  };

  // ফর্ম সাবমিট হ্যান্ডলার
  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) {
      setFeedback({ type: 'error', text: 'অনুগ্রহ করে খরচের সঠিক পরিমাণ লিখুন।' });
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        ExpenseID: `EXP-QCK-${Date.now().toString().slice(-6)}`,
        Date: new Date().toISOString().split('T')[0],
        Category: category,
        Amount: numAmount,
        PaymentMethod: 'Cash',
        Payee: payee.trim() || 'কাউন্টার ক্যাশ-আউট',
        Description: description.trim() || `${category} বাবদ ক্যাশ-আউট`,
        CreatedBy: activeUser?.FullName || activeUser?.UserName || 'Cashier',
        isQuickPreset: false,
        sourceType: 'POS_QUICK_MODAL'
      };

      if (typeof onSaveExpense === 'function') {
        await onSaveExpense(payload);
      }

      setFeedback({ type: 'success', text: `✓ ${currencySymbol}${numAmount} খরচ ক্যাশ ড্রয়ার থেকে সমন্বিত হয়েছে!` });
      setTimeout(() => {
        if (onClose) onClose();
      }, 700);
    } catch (err) {
      setFeedback({ type: 'error', text: `ব্যর্থ: ${err.message}` });
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[120] bg-neutral-900/40 flex items-center justify-center p-3"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white rounded-lg border border-neutral-200/80 w-full max-w-lg overflow-hidden relative">
        
        {/* হেডার বার */}
        <div className="px-5 py-3.5 bg-[#FAFAFA] border-b border-neutral-200/80 text-[#111111] flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-md bg-[#F5F5F5] border border-neutral-200/80 flex items-center justify-center text-[#0F172A]">
              <Coins className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-sm font-semibold tracking-tight text-[#111111]">কাউন্টার মিনি ক্যাশ-আউট ও খরচ</h3>
                <span className="px-1.5 py-0.5 rounded-md text-[10px] font-mono tabular-nums bg-[#F5F5F5] text-[#525252] border border-neutral-200/80">
                  Alt + E
                </span>
              </div>
              <p className="text-[11px] text-[#525252]">
                ক্যাশ ড্রয়ার থেকে তাৎক্ষণিক খুচরা খরচের জন্য
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] sm:min-h-[36px] sm:min-w-[36px] rounded-md bg-white border border-neutral-200/80 hover:bg-[#F5F5F5] text-[#737373] hover:text-[#111111] flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* কনটেন্ট বডি */}
        <div className="p-4 sm:p-5 space-y-4">
          
          {feedback && (
            <div
              className={`p-2.5 rounded-md text-xs font-medium flex items-center space-x-2 border ${
                feedback.type === 'success'
                  ? 'bg-emerald-50 text-[#15803D] border-emerald-200/80'
                  : feedback.type === 'error'
                  ? 'bg-red-50 text-[#B91C1C] border-red-200/80'
                  : 'bg-[#F5F5F5] text-[#111111] border-neutral-200/80'
              }`}
            >
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-[#15803D]" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 text-[#B91C1C]" />
              )}
              <span>{feedback.text}</span>
            </div>
          )}

          {/* ১-ক্লিক এক্সপ্রেস প্রিসেটস */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold text-[#111111] flex items-center gap-1">
                <Zap className="w-3.5 h-3.5 text-[#B45309]" />
                <span>১-ক্লিক এক্সপ্রেস ক্যাশ-আউট (৩ সেকেন্ডে সম্পন্ন):</span>
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {QUICK_PRESETS.map((p, idx) => {
                const IconComp = p.icon;
                return (
                  <button
                    key={idx}
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => handlePresetClick(p)}
                    className="p-2.5 rounded-md border border-neutral-200/80 bg-[#FAFAFA] hover:bg-[#0F172A] hover:border-[#0F172A] text-[#111111] hover:text-white transition-colors text-left flex items-center space-x-2 cursor-pointer disabled:opacity-50 min-h-[44px] sm:min-h-[36px] group"
                  >
                    <div className="w-7 h-7 rounded-md bg-white border border-neutral-200/80 flex items-center justify-center shrink-0 text-[#525252] group-hover:text-[#111111]">
                      <IconComp className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-xs font-medium font-mono tabular-nums truncate">{p.title}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="relative flex py-1 items-center">
            <div className="grow border-t border-neutral-200/80"></div>
            <span className="shrink mx-3 text-[11px] text-[#737373] font-medium uppercase tracking-wider">অথবা নির্দিষ্ট অঙ্ক লিখুন</span>
            <div className="grow border-t border-neutral-200/80"></div>
          </div>

          {/* ম্যানুয়াল কুইক ফর্ম */}
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#111111] mb-1">
                  টাকার পরিমাণ *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono font-semibold text-[#737373]">
                    {currencySymbol}
                  </span>
                  <input
                    type="number"
                    min="1"
                    step="any"
                    required
                    autoFocus
                    placeholder="যেমন: ১২০"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 text-sm font-mono tabular-nums font-semibold text-[#B91C1C] bg-[#FAFAFA] border border-neutral-200/80 rounded-md focus:bg-white focus:outline-none focus:border-[#0F172A] min-h-[44px] sm:min-h-[36px]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#111111] mb-1">
                  ব্যয়ের খাত
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-[#FAFAFA] border border-neutral-200/80 rounded-md focus:bg-white focus:outline-none focus:border-[#0F172A] text-[#111111] font-medium min-h-[44px] sm:min-h-[36px]"
                >
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-[#525252] mb-1">
                  প্রাপক / ব্যক্তি (ঐচ্ছিক)
                </label>
                <input
                  type="text"
                  placeholder="যেমন: রহিম (স্টাফ)"
                  value={payee}
                  onChange={(e) => setPayee(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-[#FAFAFA] border border-neutral-200/80 rounded-md focus:bg-white focus:outline-none focus:border-[#0F172A] text-[#111111] min-h-[44px] sm:min-h-[36px]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-[#525252] mb-1">
                  বিবরণ / নোট (ঐচ্ছিক)
                </label>
                <input
                  type="text"
                  placeholder="যেমন: চা ও বিস্কুট"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-[#FAFAFA] border border-neutral-200/80 rounded-md focus:bg-white focus:outline-none focus:border-[#0F172A] text-[#111111] min-h-[44px] sm:min-h-[36px]"
                />
              </div>
            </div>

            {/* ড্রয়ার নোটিশ */}
            <div className="p-2.5 rounded-md bg-amber-50 border border-amber-200/80 text-[11px] text-[#B45309] flex items-center space-x-2">
              <ArrowDownRight className="w-3.5 h-3.5 text-[#B45309] shrink-0" />
              <span>
                এই খরচটি সরাসরি <strong>দৈনিক ক্যাশ ড্রয়ার (Counter Cash)</strong> থেকে কর্তন হবে।
              </span>
            </div>

            <div className="pt-2 flex items-center justify-end space-x-2 border-t border-neutral-200/80">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-2 text-xs font-medium text-[#525252] bg-white border border-neutral-200/80 hover:bg-[#F5F5F5] rounded-md transition-colors cursor-pointer min-h-[44px] sm:min-h-[36px]"
              >
                বাতিল (Esc)
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 bg-[#0F172A] hover:bg-slate-800 text-white font-medium text-xs rounded-md transition-colors cursor-pointer disabled:opacity-50 min-h-[44px] sm:min-h-[36px]"
              >
                {isSubmitting ? 'সংরক্ষণ হচ্ছে...' : 'ক্যাশ-আউট নিশ্চিত করুন (Enter)'}
              </button>
            </div>
          </form>

        </div>
      </div>
    </div>
  );
}
