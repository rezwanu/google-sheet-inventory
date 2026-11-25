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
  PauseCircle,
  Archive,
  AlertTriangle
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
  onDeleteHeldCart,
  onMoveToAbandonedCart
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
      className="fixed inset-0 z-[100] bg-neutral-900/40 flex items-center justify-center p-3 sm:p-5 overflow-y-auto"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white rounded-lg border border-neutral-200/80 w-full max-w-4xl max-h-[90vh] my-auto flex flex-col overflow-hidden relative">
        
        {/* ================= ১. হেডার বার ================= */}
        <div className="px-6 py-4 bg-[#FAFAFA] border-b border-neutral-200/80 text-[#111111] flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3.5 min-w-0">
            <div className="w-10 h-10 rounded-md bg-amber-50 border border-amber-200/80 flex items-center justify-center text-[#B45309] shrink-0">
              <PauseCircle className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center space-x-2">
                <h2 className="text-base sm:text-lg font-semibold tracking-tight text-[#111111] truncate">
                  হোল্ডকৃত অর্ডার তালিকা (Held Orders)
                </h2>
                <span className="hidden sm:inline-block px-2.5 py-0.5 rounded-md text-[10px] font-medium bg-amber-50 text-[#B45309] border border-amber-200/80 shrink-0">
                  কাউন্টার কিউ মোড
                </span>
              </div>
              <p className="text-xs text-[#525252] mt-0.5 truncate">
                সিরিয়ালের অন্য কাস্টমারকে বিদায় দিয়ে পূর্বের কাস্টমারের অর্ডার এক ক্লিকেই চালু করুন
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] sm:min-h-[36px] sm:min-w-[36px] rounded-md bg-white border border-neutral-200/80 hover:bg-[#F5F5F5] text-[#737373] hover:text-[#111111] flex items-center justify-center transition-colors cursor-pointer shrink-0 ml-3"
            title="বন্ধ করুন"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ================= ২. মেইন কনটেন্ট বডি ================= */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-[#FAFAFA]">
          
          {/* সক্রিয় কার্ট ব্যানার ও দ্রুত নতুন হোল্ড অ্যাকশন */}
          {activeCartItems.length > 0 && (
            <div className="bg-white border border-neutral-200/80 rounded-lg p-3.5 sm:p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="flex items-center space-x-3 min-w-0">
                <div className="w-10 h-10 rounded-md bg-[#0F172A] text-white flex items-center justify-center shrink-0">
                  <ShoppingCart className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-[#111111]">
                      বর্তমানে সক্রিয় কার্ট
                    </span>
                    <span className="text-[10px] font-mono tabular-nums font-medium text-[#111111] bg-[#F5F5F5] border border-neutral-200/80 px-2 py-0.5 rounded-md">
                      {activeCartItems.length} টি আইটেম
                    </span>
                  </div>
                  <p className="text-xs text-[#525252] font-medium mt-0.5">
                    মোট প্রদেয় মূল্য: <span className="text-[#111111] font-mono tabular-nums font-semibold">{currencySymbol}{activeCartSubtotal.toFixed(2)}</span>
                  </p>
                </div>
              </div>

              {/* বর্তমান কার্ট হোল্ড বোতাম */}
              <div className="flex items-center gap-2 shrink-0">
                {!showNewHoldInput ? (
                  <button
                    type="button"
                    onClick={() => setShowNewHoldInput(true)}
                    className="w-full sm:w-auto px-4 py-2 bg-[#0F172A] hover:bg-slate-800 text-white font-medium text-xs rounded-md transition-colors flex items-center justify-center space-x-1.5 cursor-pointer min-h-[44px] sm:min-h-[36px]"
                  >
                    <PauseCircle className="w-4 h-4" />
                    <span>বর্তমান কার্টটি হোল্ড করুন</span>
                  </button>
                ) : (
                  <form onSubmit={handleCreateNewHold} className="flex items-center gap-1.5 w-full sm:w-auto flex-wrap sm:flex-nowrap">
                    <input
                      type="text"
                      value={holdNoteInput}
                      onChange={(e) => setHoldNoteInput(e.target.value)}
                      placeholder="কাস্টমারের নাম বা নোট (যেমন: রহিম ভাই)"
                      autoFocus
                      className="px-3 py-1.5 text-xs border border-neutral-200/80 rounded-md bg-white text-[#111111] focus:outline-none focus:border-[#0F172A] font-medium min-w-[200px] min-h-[44px] sm:min-h-[36px]"
                    />
                    <button
                      type="submit"
                      className="px-3 py-1.5 bg-[#0F172A] hover:bg-slate-800 text-white font-medium text-xs rounded-md transition-colors cursor-pointer shrink-0 min-h-[44px] sm:min-h-[36px]"
                    >
                      হোল্ড নিশ্চিত
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowNewHoldInput(false)}
                      className="px-3 py-1.5 bg-white border border-neutral-200/80 hover:bg-[#F5F5F5] text-[#525252] font-medium text-xs rounded-md cursor-pointer shrink-0 min-h-[44px] sm:min-h-[36px]"
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
            <div className="bg-white border border-dashed border-neutral-200/80 rounded-lg p-10 sm:p-14 text-center my-4 space-y-3">
              <div className="w-14 h-14 rounded-lg bg-amber-50 border border-amber-200/80 text-[#B45309] flex items-center justify-center mx-auto">
                <PauseCircle className="w-7 h-7 stroke-[1.8]" />
              </div>
              <h3 className="text-base font-semibold tracking-tight text-[#111111]">
                বর্তমানে কোনো অর্ডার হোল্ড করা নেই
              </h3>
              <p className="text-xs sm:text-sm text-[#525252] max-w-md mx-auto leading-relaxed">
                কাউন্টারে একাধিক কাস্টমারের লাইন থাকলে এক কাস্টমারের কাপড় পরিমাপ বা পছন্দের ফাঁকে অন্য কাস্টমারকে দ্রুত বিদায় দিতে কার্ট পেজের <strong>'অর্ডার হোল্ড'</strong> বোতাম ব্যবহার করুন।
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-medium text-[#525252] px-1">
                <span className="font-mono tabular-nums">হোল্ডকৃত অর্ডারের তালিকা ({heldCarts.length}টি)</span>
                <span className="text-[11px] text-[#737373]">
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
                  const isOldHold = held.createdAt && (Date.now() - new Date(held.createdAt).getTime()) > 30 * 60 * 1000;

                  return (
                    <div
                      key={held.id || idx}
                      className="bg-white border border-neutral-200/80 hover:border-neutral-300 rounded-lg overflow-hidden transition-colors"
                    >
                      {/* কার্ড হেডার রো */}
                      <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white">
                        <div className="flex items-start sm:items-center space-x-3 min-w-0">
                          <div className="w-9 h-9 rounded-md bg-[#F5F5F5] border border-neutral-200/80 text-[#111111] flex items-center justify-center font-mono tabular-nums font-semibold text-xs shrink-0">
                            #{idx + 1}
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                              <h4 className="text-sm font-semibold tracking-tight text-[#111111] truncate">
                                {held.token || `কাস্টমার #${idx + 1}`}
                              </h4>
                              {held.customerName && held.customerName !== held.token && (
                                <span className="text-[11px] font-medium text-[#525252] bg-[#F5F5F5] border border-neutral-200/80 px-2 py-0.5 rounded-md">
                                  {held.customerName}
                                </span>
                              )}
                              <span className="text-[10px] font-mono tabular-nums text-[#737373] flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                <span>{getRelativeTime(held.createdAt)}</span>
                              </span>
                              {isOldHold && (
                                <span className="text-[10px] font-medium text-[#B45309] bg-amber-50 border border-amber-200/80 px-1.5 py-0.5 rounded-md flex items-center gap-0.5 font-mono tabular-nums">
                                  <AlertTriangle className="w-2.5 h-2.5" />
                                  <span>৩০+ মি. বিলম্ব</span>
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-3 mt-1 text-xs text-[#525252] font-medium">
                              <span>আইটেম: <strong className="text-[#111111] font-mono tabular-nums">{itemsList.length} টি</strong></span>
                              <span>•</span>
                              <span>মোট মূল্য: <strong className="text-[#111111] font-mono tabular-nums font-semibold">{currencySymbol}{Number(cartTotal).toFixed(2)}</strong></span>
                            </div>
                          </div>
                        </div>

                        {/* অ্যাকশন বাটনসমূহ */}
                        <div className="flex flex-wrap items-center gap-2 shrink-0 self-end sm:self-auto">
                          <button
                            type="button"
                            onClick={() => toggleExpand(held.id)}
                            className="px-2.5 py-1.5 text-xs font-medium text-[#525252] hover:text-[#111111] bg-white hover:bg-[#F5F5F5] rounded-md border border-neutral-200/80 transition-colors flex items-center gap-1 cursor-pointer min-h-[44px] sm:min-h-[36px] font-mono tabular-nums"
                            title="আইটেম তালিকা দেখুন"
                          >
                            <span>পণ্য দেখুন ({itemsList.length})</span>
                            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          </button>

                          {onMoveToAbandonedCart && (
                            <button
                              type="button"
                              onClick={() => {
                                if (window.confirm(`আপনি কি '${held.token || 'এই হোল্ড অর্ডারটি'}' অসম্পূর্ণ কার্ট (Abandoned Cart) তালিকায় স্থানান্তর করতে চান?`)) {
                                  onMoveToAbandonedCart(held.id);
                                }
                              }}
                              className="px-2.5 py-1.5 text-xs font-medium text-[#B45309] bg-amber-50 hover:bg-amber-100 rounded-md border border-amber-200/80 transition-colors flex items-center gap-1 cursor-pointer min-h-[44px] sm:min-h-[36px]"
                              title="অসম্পূর্ণ কার্ট (Abandoned Cart) তালিকায় স্থানান্তর করুন"
                            >
                              <Archive className="w-3.5 h-3.5 text-[#B45309]" />
                              <span className="hidden sm:inline">অসম্পূর্ণ কার্টে সরান</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm(`আপনি কি '${held.token || 'এই হোল্ড অর্ডারটি'}' মুছে ফেলতে চান?`)) {
                                if (onDeleteHeldCart) onDeleteHeldCart(held.id);
                              }
                            }}
                            className="p-2 text-[#B91C1C] bg-red-50 hover:bg-red-100 rounded-md border border-red-200/80 transition-colors cursor-pointer min-h-[44px] min-w-[44px] sm:min-h-[36px] sm:min-w-[36px] flex items-center justify-center"
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
                            className="px-4 py-2 bg-[#0F172A] hover:bg-slate-800 text-white text-xs font-medium rounded-md flex items-center space-x-1.5 transition-colors cursor-pointer min-h-[44px] sm:min-h-[36px]"
                            title="এই কাস্টমারের কার্ট চালু করুন"
                          >
                            <Play className="w-3.5 h-3.5 fill-current" />
                            <span>কার্টে চালু করুন</span>
                          </button>
                        </div>
                      </div>

                      {/* বর্ধিত আইটেম তালিকা প্রিভিউ (Expandable Drawer) */}
                      {isExpanded && (
                        <div className="p-3.5 bg-[#FAFAFA] border-t border-neutral-200/80 space-y-2">
                          <div className="text-[11px] font-semibold text-[#525252] uppercase tracking-wider mb-1 flex items-center gap-1">
                            <Receipt className="w-3.5 h-3.5 text-[#0F172A]" />
                            <span>হোল্ডকৃত পণ্যের বিবরণ:</span>
                          </div>

                          <div className="divide-y divide-neutral-200/80 bg-white rounded-md border border-neutral-200/80 overflow-hidden">
                            {itemsList.map((item, iIdx) => {
                              const qtyFormatted = item.unit === 'গজ' 
                                ? formatFabricQuantity(item.quantity, 'গজ') 
                                : `${item.quantity} ${item.unit || 'টি'}`;
                              const itemTotal = (Number(item.sellingPrice) || 0) * (Number(item.quantity) || 0);

                              return (
                                <div key={iIdx} className="p-2.5 flex items-center justify-between text-xs hover:bg-[#FAFAFA] transition-colors">
                                  <div className="flex items-center space-x-2.5 min-w-0">
                                    <div className="w-7 h-7 rounded-md bg-[#F5F5F5] border border-neutral-200/80 flex items-center justify-center font-mono tabular-nums font-medium text-[#525252] shrink-0">
                                      {iIdx + 1}
                                    </div>
                                    <div className="min-w-0">
                                      <p className="font-semibold text-[#111111] truncate">
                                        {item.productName || item.name}
                                      </p>
                                      <p className="text-[10px] text-[#737373] font-mono tabular-nums">
                                        {item.productId} {item.isBargained && <span className="text-[#15803D] font-semibold">• দরদামকৃত</span>}
                                      </p>
                                    </div>
                                  </div>

                                  <div className="text-right shrink-0 pl-2">
                                    <span className="font-mono tabular-nums font-semibold text-[#111111] block">
                                      {qtyFormatted} × {currencySymbol}{Number(item.sellingPrice || 0).toFixed(2)}
                                    </span>
                                    <span className="font-mono tabular-nums text-[11px] font-semibold text-[#525252]">
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
        <div className="px-6 py-3.5 bg-[#FAFAFA] border-t border-neutral-200/80 flex items-center justify-between shrink-0">
          <div className="text-xs font-medium text-[#525252]">
            মোট হোল্ডে সংরক্ষিত: <strong className="text-[#111111] font-mono tabular-nums">{heldCarts.length} টি অর্ডার</strong>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-md border border-neutral-200/80 bg-white hover:bg-[#F5F5F5] text-[#111111] text-xs sm:text-sm font-medium transition-colors cursor-pointer min-h-[44px] sm:min-h-[36px]"
          >
            বন্ধ করুন
          </button>
        </div>

      </div>
    </div>
  );
}

