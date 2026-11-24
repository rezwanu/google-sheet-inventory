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
  const [payee, setPayee] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    if (isOpen) {
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
      className="fixed inset-0 z-[120] bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-150 relative">
        
        {/* হেডার বার */}
        <div className="px-5 py-3.5 bg-gradient-to-r from-slate-900 via-rose-950 to-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-rose-500/20 border border-rose-400/30 flex items-center justify-center text-rose-300">
              <Coins className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-sm font-bold tracking-tight">কাউন্টার মিনি ক্যাশ-আউট ও খরচ</h3>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-rose-500/30 text-rose-200 border border-rose-400/30">
                  Alt + E
                </span>
              </div>
              <p className="text-[11px] text-slate-300">
                ক্যাশ ড্রয়ার থেকে তাৎক্ষণিক খুচরা খরচের জন্য
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* কনটেন্ট বডি */}
        <div className="p-4 sm:p-5 space-y-4">
          
          {feedback && (
            <div
              className={`p-2.5 rounded-xl text-xs font-semibold flex items-center space-x-2 ${
                feedback.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : feedback.type === 'error'
                  ? 'bg-rose-50 text-rose-800 border border-rose-200'
                  : 'bg-indigo-50 text-indigo-800 border border-indigo-200'
              }`}
            >
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              )}
              <span>{feedback.text}</span>
            </div>
          )}

          {/* ১-ক্লিক এক্সপ্রেস প্রিসেটস */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
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
                    className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-rose-50 hover:border-rose-300 text-slate-800 hover:text-rose-900 transition-all text-left flex items-center space-x-2 cursor-pointer active:scale-95 disabled:opacity-50"
                  >
                    <div className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center shrink-0 text-rose-600 shadow-2xs">
                      <IconComp className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-xs font-bold truncate">{p.title}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="relative flex py-1 items-center">
            <div className="grow border-t border-slate-200"></div>
            <span className="shrink mx-3 text-[11px] text-slate-400 font-bold uppercase tracking-wider">অথবা নির্দিষ্ট অঙ্ক লিখুন</span>
            <div className="grow border-t border-slate-200"></div>
          </div>

          {/* ম্যানুয়াল কুইক ফর্ম */}
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  টাকার পরিমাণ *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-400">
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
                    className="w-full pl-8 pr-3 py-2 text-sm font-bold text-rose-700 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ব্যয়ের খাত
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-rose-500 text-slate-800 font-semibold"
                >
                  <option value="Refreshments">আপ্যায়ন ও চা-নাস্তা (Refreshments)</option>
                  <option value="Transport">যাতায়াত ও কুরিয়ার (Transport)</option>
                  <option value="Maintenance">মেরামত ও পরিচ্ছন্নতা (Maintenance)</option>
                  <option value="Packaging">প্যাকেজিং ও ব্যাগ (Packaging)</option>
                  <option value="Utility">বিদ্যুৎ ও ইন্টারনেট (Utility)</option>
                  <option value="Other">অন্যান্য সাধারণ ব্যয় (Other)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  প্রাপক / ব্যক্তি (ঐচ্ছিক)
                </label>
                <input
                  type="text"
                  placeholder="যেমন: রহিম (স্টাফ)"
                  value={payee}
                  onChange={(e) => setPayee(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  বিবরণ / নোট (ঐচ্ছিক)
                </label>
                <input
                  type="text"
                  placeholder="যেমন: চা ও বিস্কুট"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-rose-500"
                />
              </div>
            </div>

            {/* ড্রয়ার নোটিশ */}
            <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-800 flex items-center space-x-2">
              <ArrowDownRight className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span>
                এই খরচটি সরাসরি <strong>দৈনিক ক্যাশ ড্রয়ার (Counter Cash)</strong> থেকে কর্তন হবে।
              </span>
            </div>

            <div className="pt-2 flex items-center justify-end space-x-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                বাতিল (Esc)
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-700 hover:to-pink-700 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer active:scale-95 disabled:opacity-50"
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
