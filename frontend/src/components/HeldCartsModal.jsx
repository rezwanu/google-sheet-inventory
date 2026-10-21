import React, { useState } from 'react';
import {
  X,
  Clock,
  Play,
  Trash2,
  ShoppingCart,
  User,
  Plus,
  Package,
  Layers,
  ChevronDown,
  ChevronUp,
  Receipt,
  PauseCircle
} from 'lucide-react';
import { formatFabricQuantity } from '../utils/fabricUtils';

/**
 * হোল্ডকৃত অর্ডার ব্যবস্থাপনা ও মাল্টি-কাস্টমার কাউন্টার কিউ মডাল
 * (POS Held Orders Management & Rapid Queue Recovery Studio)
 */
export default function HeldCartsModal({
  isOpen,
  onClose,
  heldCarts = [],
  activeCartItems = [],
  currencySymbol = '৳',
  onHoldCurrentCart,
  onResumeHeldCart,
  onDeleteHeldCart
}) {
  const [expandedCartId, setExpandedCartId] = useState(null);
  const [holdNoteInput, setHoldNoteInput] = useState('');
  const [showNewHoldInput, setShowNewHoldInput] = useState(false);

  if (!isOpen) return null;

  // বর্তমান সক্রিয় কার্টের মোট টাকা
  const activeCartSubtotal = (activeCartItems || []).reduce(
    (acc, it) => acc + (Number(it.sellingPrice) || 0) * (Number(it.quantity) || 0),
    0
  );

  const toggleExpand = (id) => {
    setExpandedCartId(expandedCartId === id ? null : id);
  };

  const handleCreateNewHold = (e) => {
    if (e) e.preventDefault();
    if (onHoldCurrentCart) {
      onHoldCurrentCart(holdNoteInput.trim() || undefined);
    }
    setHoldNoteInput('');
    setShowNewHoldInput(false);
  };

  // সময়ের সহজ বিবরণ (relative time in Bengali)
  const getRelativeTime = (isoString) => {
    if (!isoString) return 'অল্পক্ষণ আগে';
    const diffMs = Date.now() - new Date(isoString).getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);

    if (diffMin < 1) return 'এইমাত্র';
    if (diffMin < 60) return `${diffMin} মিনিট আগে`;
    if (diffHour < 24) return `${diffHour} ঘণ্টা আগে`;
    return new Date(isoString).toLocaleDateString('bn-BD');
  };

  return (
    <div
      className="fixed inset-0 z-[100] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] my-auto flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 relative">
        
        {/* ================= ১. আল্ট্রা-মডার্ন ডার্ক হেডার ================= */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between shrink-0 border-b border-slate-800">
          <div className="flex items-center space-x-3.5 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-300 shadow-inner shrink-0">
              <PauseCircle className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center space-x-2">
                <h2 className="text-base sm:text-lg font-black tracking-tight truncate">
                  হোল্ডকৃত অর্ডার তালিকা (Held Orders)
                </h2>
                <span className="hidden sm:inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/30 text-amber-200 border border-amber-400/30 shrink-0">
                  কাউন্টার কিউ মোড
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5 truncate">
                সিরিয়ালের অন্য কাস্টমারকে বিদায় দিয়ে পূর্বের কাস্টমারের অর্ডার এক ক্লিকেই চালু করুন
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition-all cursor-pointer shrink-0 ml-3"
            title="বন্ধ করুন"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ================= ২. মেইন কনটেন্ট বডি ================= */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          
          {/* সক্রিয় কার্ট ব্যানার ও দ্রুত নতুন হোল্ড অ্যাকশন */}
          {activeCartItems.length > 0 && (
            <div className="bg-gradient-to-r from-indigo-50 to-amber-50/60 border border-indigo-200/90 rounded-2xl p-3.5 sm:p-4 shadow-2xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="flex items-center space-x-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                  <ShoppingCart className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-slate-900">
                      বর্তমানে সক্রিয় কার্ট
                    </span>
                    <span className="text-[10px] font-bold text-indigo-700 bg-white border border-indigo-200 px-2 py-0.2 rounded-full">
                      {activeCartItems.length} টি আইটেম
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 font-semibold mt-0.5">
                    মোট প্রদেয় মূল্য: <span className="text-indigo-900 font-black">{currencySymbol}{activeCartSubtotal.toFixed(2)}</span>
                  </p>
                </div>
              </div>

              {/* বর্তমান কার্ট হোল্ড বোতাম */}
              <div className="flex items-center gap-2 shrink-0">
                {!showNewHoldInput ? (
                  <button
                    type="button"
                    onClick={() => setShowNewHoldInput(true)}
                    className="w-full sm:w-auto px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-black text-xs rounded-xl shadow-sm transition-all flex items-center justify-center space-x-1.5 cursor-pointer active:scale-95"
                  >
                    <PauseCircle className="w-4 h-4" />
                    <span>বর্তমান কার্টটি হোল্ড করুন</span>
                  </button>
                ) : (
                  <form onSubmit={handleCreateNewHold} className="flex items-center gap-1.5 w-full sm:w-auto">
                    <input
                      type="text"
                      value={holdNoteInput}
                      onChange={(e) => setHoldNoteInput(e.target.value)}
                      placeholder="কাস্টমারের নাম বা নোট (যেমন: রহিম ভাই)"
                      autoFocus
                      className="px-3 py-1.5 text-xs border border-amber-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 font-bold min-w-[200px]"
                    />
                    <button
                      type="submit"
                      className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl transition-all cursor-pointer shadow-xs shrink-0"
                    >
                      হোল্ড নিশ্চিত
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowNewHoldInput(false)}
                      className="px-2 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs rounded-xl cursor-pointer shrink-0"
                    >
                      বাতিল
                    </button>
                  </form>
                )}
              </div>
            </div>
          )}

          {/* হোল্ডকৃত অর্ডার তালিকা */}
          {heldCarts.length === 0 ? (
            <div className="bg-slate-50 border border-slate-200/80 rounded-3xl p-10 sm:p-14 text-center my-4 space-y-3">
              <div className="w-16 h-16 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto shadow-inner">
                <PauseCircle className="w-8 h-8 stroke-[1.8]" />
              </div>
              <h3 className="text-base sm:text-lg font-black text-slate-900">
                বর্তমানে কোনো অর্ডার হোল্ড করা নেই
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
                কাউন্টারে একাধিক কাস্টমারের লাইন থাকলে এক কাস্টমারের কাপড় পরিমাপ বা পছন্দের ফাঁকে অন্য কাস্টমারকে দ্রুত বিদায় দিতে কার্ট পেজের <strong>'অর্ডার হোল্ড'</strong> বোতাম ব্যবহার করুন।
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-slate-500 px-1">
                <span>হোল্ডকৃত অর্ডারের তালিকা ({heldCarts.length}টি)</span>
                <span className="text-[11px] text-indigo-600 font-semibold">
                  এক ক্লিকেই সক্রিয় কার্টে পুনরুদ্ধার হবে
                </span>
              </div>

              <div className="space-y-3">
                {heldCarts.map((held, idx) => {
                  const isExpanded = expandedCartId === held.id;
                  const itemsList = held.items || [];
                  const cartTotal = held.subTotal || itemsList.reduce(
                    (acc, it) => acc + (Number(it.sellingPrice) || 0) * (Number(it.quantity) || 0),
                    0
                  );

                  return (
                    <div
                      key={held.id || idx}
                      className="bg-white border-2 border-slate-200 hover:border-indigo-300 rounded-2xl overflow-hidden shadow-2xs hover:shadow-md transition-all"
                    >
                      {/* কার্ড হেডার রো */}
                      <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-white via-slate-50/50 to-indigo-50/30">
                        <div className="flex items-start sm:items-center space-x-3 min-w-0">
                          <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center font-black text-sm shrink-0 shadow-sm">
                            #{idx + 1}
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                              <h4 className="text-sm font-black text-slate-900 truncate">
                                {held.token || `কাস্টমার #${idx + 1}`}
                              </h4>
                              {held.customerName && held.customerName !== held.token && (
                                <span className="text-[11px] font-bold text-slate-600 bg-slate-100 px-2 py-0.2 rounded-md">
                                  {held.customerName}
                                </span>
                              )}
                              <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                <span>{getRelativeTime(held.createdAt)}</span>
                              </span>
                            </div>

                            <div className="flex items-center gap-3 mt-1 text-xs text-slate-600 font-semibold">
                              <span>আইটেম: <strong className="text-slate-900">{itemsList.length} টি</strong></span>
                              <span>•</span>
                              <span>মোট মূল্য: <strong className="text-indigo-900 font-black">{currencySymbol}{Number(cartTotal).toFixed(2)}</strong></span>
                            </div>
                          </div>
                        </div>

                        {/* অ্যাকশন বাটনসমূহ */}
                        <div className="flex items-center space-x-2 shrink-0 self-end sm:self-auto">
                          <button
                            type="button"
                            onClick={() => toggleExpand(held.id)}
                            className="px-2.5 py-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl border border-slate-200 transition-all flex items-center gap-1 cursor-pointer"
                            title="আইটেম তালিকা দেখুন"
                          >
                            <span>পণ্য দেখুন ({itemsList.length})</span>
                            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm(`আপনি কি '${held.token || 'এই হোল্ড অর্ডারটি'}' মুছে ফেলতে চান?`)) {
                                if (onDeleteHeldCart) onDeleteHeldCart(held.id);
                              }
                            }}
                            className="p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-xl border border-rose-200 transition-all cursor-pointer"
                            title="মুছে ফেলুন"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              if (onResumeHeldCart) {
                                onResumeHeldCart(held.id);
                              }
                            }}
                            className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-black rounded-xl shadow-md shadow-emerald-600/20 flex items-center space-x-1.5 transition-all cursor-pointer active:scale-95"
                            title="এই কাস্টমারের কার্ট চালু করুন"
                          >
                            <Play className="w-3.5 h-3.5 fill-current" />
                            <span>কার্টে চালু করুন</span>
                          </button>
                        </div>
                      </div>

                      {/* বর্ধিত আইটেম তালিকা প্রিভিউ (Expandable Drawer) */}
                      {isExpanded && (
                        <div className="p-3.5 bg-slate-50 border-t border-slate-200 space-y-2 animate-in fade-in duration-150">
                          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                            <Receipt className="w-3.5 h-3.5 text-indigo-600" />
                            <span>হোল্ডকৃত পণ্যের বিবরণ:</span>
                          </div>

                          <div className="divide-y divide-slate-200/80 bg-white rounded-xl border border-slate-200 overflow-hidden">
                            {itemsList.map((item, iIdx) => {
                              const qtyFormatted = item.unit === 'গজ' 
                                ? formatFabricQuantity(item.quantity, 'গজ') 
                                : `${item.quantity} ${item.unit || 'টি'}`;
                              const itemTotal = (Number(item.sellingPrice) || 0) * (Number(item.quantity) || 0);

                              return (
                                <div key={iIdx} className="p-2.5 flex items-center justify-between text-xs hover:bg-slate-50/80 transition-colors">
                                  <div className="flex items-center space-x-2.5 min-w-0">
                                    <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-500 shrink-0">
                                      {iIdx + 1}
                                    </div>
                                    <div className="min-w-0">
                                      <p className="font-bold text-slate-900 truncate">
                                        {item.productName || item.name}
                                      </p>
                                      <p className="text-[10px] text-slate-500 font-mono">
                                        {item.productId} {item.isBargained && <span className="text-emerald-600 font-bold">• দরদামকৃত</span>}
                                      </p>
                                    </div>
                                  </div>

                                  <div className="text-right shrink-0 pl-2">
                                    <span className="font-black text-slate-800 block">
                                      {qtyFormatted} × {currencySymbol}{Number(item.sellingPrice || 0).toFixed(2)}
                                    </span>
                                    <span className="font-mono text-[11px] font-black text-indigo-700">
                                      {currencySymbol}{itemTotal.toFixed(2)}
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>

        {/* ================= ৩. ফুটার বার ================= */}
        <div className="px-6 py-3.5 bg-slate-100 border-t border-slate-200 flex items-center justify-between shrink-0">
          <div className="text-xs font-bold text-slate-600">
            মোট হোল্ডে সংরক্ষিত: <strong className="text-indigo-900">{heldCarts.length} টি অর্ডার</strong>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs sm:text-sm font-bold transition-all cursor-pointer active:scale-95 shadow-2xs"
          >
            বন্ধ করুন
          </button>
        </div>

      </div>
    </div>
  );
}

