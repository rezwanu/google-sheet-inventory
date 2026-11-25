import React, { useState, useMemo } from 'react';
import {
  X,
  ShoppingBag,
  CreditCard,
  CheckCircle2,
  Search,
  Sparkles,
  Clock,
  Printer,
  LogIn
} from 'lucide-react';
import { extractAndNormalizeItems } from '../services/storage';
import StoreLogo from './StoreLogo';

export default function CustomerOrdersModal({
  isOpen,
  onClose,
  activeUser,
  salesHistory = [],
  currencySymbol = '৳',
  settings = {},
  onViewInvoice,
  onNavigateToCatalog,
  onOpenAuthModal,
}) {
  const [searchQuery, setSearchQuery] = useState('');

  // বর্তমান গ্রাহকের অর্ডারগুলো বের করা
  const customerOrders = useMemo(() => {
    if (!activeUser) return [];
    const phone = String(activeUser.Phone || '').trim().toLowerCase();
    const email = String(activeUser.Email || '').trim().toLowerCase();
    const name = String(activeUser.FullName || '').trim().toLowerCase();

    return salesHistory.filter((sale) => {
      if (!sale) return false;
      const salePhone = String(sale.CustomerPhone || sale.customerPhone || '').trim().toLowerCase();
      const saleEmail = String(sale.CustomerEmail || sale.customerEmail || '').trim().toLowerCase();
      const saleName = String(sale.CustomerName || sale.customerName || '').trim().toLowerCase();

      if (phone && salePhone && salePhone === phone) return true;
      if (email && saleEmail && saleEmail === email) return true;
      if (name && saleName && saleName === name) return true;
      return false;
    });
  }, [salesHistory, activeUser]);

  // সার্চ কুয়েরি অনুযায়ী ফিল্টার
  const filteredOrders = useMemo(() => {
    if (!searchQuery.trim()) return customerOrders;
    const q = searchQuery.trim().toLowerCase();
    return customerOrders.filter((sale) => {
      const inv = String(sale.InvoiceNo || sale.invoiceNo || '').toLowerCase();
      const date = String(sale.Timestamp || sale.timestamp || '').toLowerCase();
      return inv.includes(q) || date.includes(q);
    });
  }, [customerOrders, searchQuery]);

  // মোট খরচ এবং অর্ডারের পরিসংখ্যান
  const totalSpent = useMemo(() => {
    return customerOrders.reduce((sum, order) => {
      const g = Number(order.GrandTotal !== undefined ? order.GrandTotal : (order.grandTotal || 0));
      return sum + g;
    }, 0);
  }, [customerOrders]);

  const formatDate = (isoString) => {
    if (!isoString) return 'অজানা সময়';
    try {
      return new Date(isoString).toLocaleString('bn-BD', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-neutral-900/40 flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg border border-neutral-200/80 max-w-2xl w-full overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* হেডার ব্যানার */}
        <div className="bg-[#FAFAFA] border-b border-neutral-200/80 p-4 sm:p-5 text-[#111111] flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <StoreLogo
              url={settings?.LogoUrl || settings?.logoUrl}
              alt={settings?.StoreName || 'স্টোর'}
              className="w-10 h-10 rounded-md object-contain bg-white p-1 border border-neutral-200/80 shrink-0"
              fallbackIcon={ShoppingBag}
              fallbackClassName="w-10 h-10 rounded-md bg-white flex items-center justify-center border border-neutral-200/80 shrink-0"
              iconClassName="w-5 h-5 text-[#0F172A]"
            />
            <div>
              <h2 className="text-base sm:text-lg font-semibold tracking-tight text-[#111111]">
                {settings?.StoreName ? `${settings.StoreName} - ` : ''}আমার অর্ডারসমূহ (My Orders)
              </h2>
              <p className="text-xs text-[#525252] mt-0.5">
                গ্রাহক: <strong className="text-[#111111] font-medium">{activeUser ? activeUser.FullName : 'লগইন করা নেই'}</strong>
                {activeUser?.Phone && <span className="font-mono tabular-nums"> • {activeUser.Phone}</span>}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="min-h-[44px] sm:min-h-[36px] min-w-[44px] sm:min-w-[36px] p-2 rounded-md hover:bg-neutral-200/60 text-[#525252] hover:text-[#111111] transition-colors cursor-pointer flex items-center justify-center"
            title="বন্ধ করুন"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* পরিসংখ্যান বার */}
        <div className="bg-[#F5F5F5] border-b border-neutral-200/80 px-5 py-3 flex flex-wrap items-center justify-between gap-2 text-xs shrink-0">
          <div className="flex items-center space-x-4">
            <div>
              <span className="text-[#525252] font-medium">মোট অর্ডার: </span>
              <strong className="text-[#111111] font-semibold font-mono tabular-nums">{customerOrders.length} টি</strong>
            </div>
            <div className="h-3.5 w-px bg-neutral-300" />
            <div>
              <span className="text-[#525252] font-medium">সর্বমোট কেনাকাটা: </span>
              <strong className="text-[#111111] font-semibold font-mono tabular-nums">{currencySymbol}{totalSpent.toFixed(2)}</strong>
            </div>
          </div>

          {customerOrders.length > 3 && (
            <div className="relative w-full sm:w-56">
              <input
                type="text"
                placeholder="ইনভয়েস দিয়ে খুঁজুন..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full min-h-[44px] sm:min-h-[36px] pl-8 pr-2.5 py-1.5 text-xs bg-white border border-neutral-200/80 rounded-md focus:outline-none focus:border-[#0F172A] focus:ring-1 focus:ring-[#0F172A] text-[#111111]"
              />
              <Search className="w-3.5 h-3.5 text-[#737373] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          )}
        </div>

        {/* অর্ডার তালিকা কনটেন্ট */}
        <div className="overflow-y-auto p-4 sm:p-5 flex-1 space-y-3.5 bg-[#FAFAFA]">
          {!activeUser ? (
            <div className="py-12 flex flex-col items-center justify-center text-center text-[#525252]">
              <div className="w-14 h-14 rounded-lg bg-[#F5F5F5] border border-neutral-200/80 flex items-center justify-center text-[#0F172A] mb-3">
                <LogIn className="w-7 h-7" />
              </div>
              <h4 className="text-base font-semibold tracking-tight text-[#111111]">অর্ডার হিস্ট্রি দেখতে লগইন করুন</h4>
              <p className="text-xs text-[#525252] mt-1 max-w-sm">
                আপনার পূর্ববর্তী অর্ডারের তালিকা এবং ডিজিটাল ইনভয়েস দেখতে অনুগ্রহ করে আপনার অ্যাকাউন্টে লগইন অথবা নতুন রেজিস্ট্রেশন করুন।
              </p>
              {onOpenAuthModal && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenAuthModal();
                  }}
                  className="mt-5 min-h-[44px] sm:min-h-[36px] px-5 py-2 rounded-md bg-[#0F172A] hover:bg-slate-800 text-white text-xs font-medium transition-colors flex items-center space-x-2 cursor-pointer"
                >
                  <LogIn className="w-4 h-4" />
                  <span>লগইন / সাইন-আপ করুন</span>
                </button>
              )}
            </div>
          ) : customerOrders.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-center text-[#737373]">
              <div className="w-14 h-14 rounded-lg bg-[#F5F5F5] border border-neutral-200/80 flex items-center justify-center text-[#737373] mb-3">
                <ShoppingBag className="w-7 h-7 stroke-[1.5]" />
              </div>
              <h4 className="text-base font-semibold tracking-tight text-[#111111]">আপনি এখনো কোনো অর্ডার করেননি</h4>
              <p className="text-xs text-[#525252] mt-1 max-w-xs">
                আমাদের ক্যাটালগ থেকে সেরা পণ্যগুলো বাছাই করুন এবং এখনই ঘরে বসে অর্ডার করুন!
              </p>
              {onNavigateToCatalog && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onNavigateToCatalog();
                  }}
                  className="mt-4 min-h-[44px] sm:min-h-[36px] px-4 py-2 rounded-md bg-[#0F172A] hover:bg-slate-800 text-white text-xs font-medium transition-colors flex items-center space-x-1.5 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>পণ্য কেনাকাটা শুরু করুন</span>
                </button>
              )}
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="py-10 text-center text-[#737373] text-xs">
              "{searchQuery}" দিয়ে কোনো ইনভয়েস পাওয়া যায়নি।
            </div>
          ) : (
            filteredOrders.map((order, idx) => {
              const invoiceNo = String(order.InvoiceNo || order.invoiceNo || `ORD-${idx + 1}`);
              const grandTotal = Number(order.GrandTotal !== undefined ? order.GrandTotal : (order.grandTotal || 0));
              const items = extractAndNormalizeItems(order);
              const dateStr = formatDate(order.Timestamp || order.timestamp);
              const payment = order.PaymentMethod || order.paymentMethod || 'Cash';

              return (
                <div
                  key={invoiceNo + idx}
                  className="bg-white rounded-lg border border-neutral-200/80 hover:border-neutral-300 transition-colors p-4 space-y-3"
                >
                  {/* কার্ড হেডার */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-neutral-200/80">
                    <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                      <span className="font-mono tabular-nums text-xs font-semibold text-[#111111] bg-[#F5F5F5] px-2.5 py-1 rounded-md border border-neutral-200/80">
                        {invoiceNo}
                      </span>
                      <span className="text-[11px] text-[#737373] font-mono tabular-nums flex items-center space-x-1">
                        <Clock className="w-3 h-3 text-[#737373]" />
                        <span>{dateStr}</span>
                      </span>
                    </div>

                    <div className="flex items-center space-x-2">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium bg-emerald-50 text-[#15803D] border border-emerald-200/80">
                        <CheckCircle2 className="w-3 h-3 mr-1 text-[#15803D]" />
                        সম্পন্ন
                      </span>
                      <button
                        type="button"
                        onClick={() => onViewInvoice && onViewInvoice(order)}
                        className="min-h-[44px] sm:min-h-[36px] px-2.5 py-1 rounded-md bg-white hover:bg-[#F5F5F5] text-[#111111] border border-neutral-200/80 text-[11px] font-medium transition-colors flex items-center space-x-1 cursor-pointer"
                        title="মেমো প্রিন্ট বা ডাউনলোড করুন"
                      >
                        <Printer className="w-3.5 h-3.5 text-[#525252]" />
                        <span>রিসিট দেখুন</span>
                      </button>
                    </div>
                  </div>

                  {/* পণ্য আইটেম সারাংশ */}
                  <div className="space-y-1.5">
                    {items.slice(0, 3).map((item, itemIdx) => {
                      const itemName = item.ProductName || item.productName || 'পণ্য';
                      const itemQty = Number(item.Quantity || item.quantity || 1);
                      const itemPrice = Number(item.SellingPrice || item.sellingPrice || 0);
                      return (
                        <div key={itemIdx} className="flex items-center justify-between text-xs text-[#525252]">
                          <div className="flex items-center space-x-1.5 truncate max-w-[70%]">
                            <span className="w-1.5 h-1.5 rounded-full bg-neutral-300 shrink-0" />
                            <span className="truncate text-[#111111]">{itemName}</span>
                            <span className="text-[#737373] text-[11px] font-mono tabular-nums">× {itemQty}</span>
                          </div>
                          <span className="font-semibold text-[#111111] font-mono tabular-nums">
                            {currencySymbol}{(itemPrice * itemQty).toFixed(2)}
                          </span>
                        </div>
                      );
                    })}
                    {items.length > 3 && (
                      <span className="text-[11px] font-medium text-[#525252] block pl-3 font-mono tabular-nums">
                        + আরও {items.length - 3}টি পণ্য রয়েছে...
                      </span>
                    )}
                  </div>

                  {/* ফুটার: মোট টাকা ও পেমেন্ট মেথড */}
                  <div className="pt-2 border-t border-dashed border-neutral-200/80 flex items-center justify-between text-xs">
                    <span className="text-[#525252] flex items-center space-x-1">
                      <CreditCard className="w-3.5 h-3.5 text-[#737373]" />
                      <span>পেমেন্ট মাধ্যম: <strong className="text-[#111111] font-medium">{payment}</strong></span>
                    </span>

                    <div className="flex items-baseline space-x-1">
                      <span className="text-[#525252] font-medium">মোট প্রদেয়:</span>
                      <span className="text-sm font-semibold text-[#111111] font-mono tabular-nums">
                        {currencySymbol}{grandTotal.toFixed(2)}
                      </span>
                    </div>
                  </div>

                </div>
              );
            })
          )}
        </div>

        {/* ফুটার বাটন */}
        <div className="p-4 border-t border-neutral-200/80 bg-[#FAFAFA] flex items-center justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] sm:min-h-[36px] px-4 py-2 rounded-md border border-neutral-200/80 bg-white hover:bg-[#F5F5F5] text-[#111111] text-xs font-medium transition-colors cursor-pointer"
          >
            বন্ধ করুন
          </button>
        </div>

      </div>
    </div>
  );
}
