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
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl shadow-2xl border border-slate-200/80 max-w-2xl w-full overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* হেডার ব্যানার */}
        <div className="bg-gradient-to-r from-indigo-700 via-indigo-600 to-violet-700 p-5 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <StoreLogo
              url={settings?.LogoUrl || settings?.logoUrl}
              alt={settings?.StoreName || 'স্টোর'}
              className="w-10 h-10 rounded-2xl object-contain bg-white/95 p-1 border border-white/30 shadow-xs"
              fallbackIcon={ShoppingBag}
              fallbackClassName="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20"
              iconClassName="w-5 h-5 text-amber-300"
            />
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-tight">
                {settings?.StoreName ? `${settings.StoreName} - ` : ''}আমার অর্ডারসমূহ (My Orders)
              </h2>
              <p className="text-xs text-indigo-100/90">
                গ্রাহক: <strong className="text-white">{activeUser ? activeUser.FullName : 'লগইন করা নেই'}</strong>
                {activeUser?.Phone && ` • ${activeUser.Phone}`}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer"
            title="বন্ধ করুন"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* পরিসংখ্যান বার */}
        <div className="bg-indigo-50/60 border-b border-indigo-100 px-5 py-3 flex items-center justify-between text-xs">
          <div className="flex items-center space-x-4">
            <div>
              <span className="text-slate-500 font-medium">মোট অর্ডার: </span>
              <strong className="text-indigo-900 font-extrabold">{customerOrders.length} টি</strong>
            </div>
            <div className="h-3.5 w-px bg-indigo-200" />
            <div>
              <span className="text-slate-500 font-medium">সর্বমোট কেনাকাটা: </span>
              <strong className="text-indigo-900 font-extrabold">{currencySymbol}{totalSpent.toFixed(2)}</strong>
            </div>
          </div>

          {customerOrders.length > 3 && (
            <div className="relative w-44 sm:w-56">
              <input
                type="text"
                placeholder="ইনভয়েস দিয়ে খুঁজুন..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-7 pr-2.5 py-1 text-xs bg-white border border-indigo-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-2 pointer-events-none" />
            </div>
          )}
        </div>

        {/* অর্ডার তালিকা কনটেন্ট */}
        <div className="overflow-y-auto p-4 sm:p-5 flex-1 space-y-3.5">
          {!activeUser ? (
            <div className="py-12 flex flex-col items-center justify-center text-center text-slate-500">
              <div className="w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 mb-3 shadow-xs">
                <LogIn className="w-8 h-8" />
              </div>
              <h4 className="text-base font-bold text-slate-800">অর্ডার হিস্ট্রি দেখতে লগইন করুন</h4>
              <p className="text-xs text-slate-500 mt-1 max-w-sm">
                আপনার পূর্ববর্তী অর্ডারের তালিকা এবং ডিজিটাল ইনভয়েস দেখতে অনুগ্রহ করে আপনার অ্যাকাউন্টে লগইন অথবা নতুন রেজিস্ট্রেশন করুন।
              </p>
              {onOpenAuthModal && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenAuthModal();
                  }}
                  className="mt-5 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white text-xs font-bold transition-all shadow-md flex items-center space-x-2 cursor-pointer"
                >
                  <LogIn className="w-4 h-4" />
                  <span>লগইন / সাইন-আপ করুন</span>
                </button>
              )}
            </div>
          ) : customerOrders.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-center text-slate-400">
              <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-300 mb-3">
                <ShoppingBag className="w-8 h-8 stroke-[1.5]" />
              </div>
              <h4 className="text-base font-bold text-slate-700">আপনি এখনো কোনো অর্ডার করেননি</h4>
              <p className="text-xs text-slate-400 mt-1 max-w-xs">
                আমাদের ক্যাটালগ থেকে সেরা পণ্যগুলো বাছাই করুন এবং এখনই ঘরে বসে অর্ডার করুন!
              </p>
              {onNavigateToCatalog && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onNavigateToCatalog();
                  }}
                  className="mt-4 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-sm flex items-center space-x-1.5 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>পণ্য কেনাকাটা শুরু করুন</span>
                </button>
              )}
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="py-10 text-center text-slate-400 text-xs">
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
                  className="bg-white rounded-2xl border border-slate-200 hover:border-indigo-300 hover:shadow-md transition-all p-4 space-y-3"
                >
                  {/* কার্ড হেডার */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-100">
                    <div className="flex items-center space-x-2">
                      <span className="font-mono text-xs font-black text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-200">
                        {invoiceNo}
                      </span>
                      <span className="text-[11px] text-slate-400 flex items-center space-x-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span>{dateStr}</span>
                      </span>
                    </div>

                    <div className="flex items-center space-x-2">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-600" />
                        সম্পন্ন
                      </span>
                      <button
                        type="button"
                        onClick={() => onViewInvoice && onViewInvoice(order)}
                        className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 border border-slate-200 hover:border-indigo-300 text-[11px] font-bold transition-all flex items-center space-x-1 cursor-pointer"
                        title="মেমো প্রিন্ট বা ডাউনলোড করুন"
                      >
                        <Printer className="w-3 h-3 text-indigo-600" />
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
                        <div key={itemIdx} className="flex items-center justify-between text-xs text-slate-700">
                          <div className="flex items-center space-x-1.5 truncate max-w-[70%]">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                            <span className="truncate">{itemName}</span>
                            <span className="text-slate-400 text-[11px]">× {itemQty}</span>
                          </div>
                          <span className="font-semibold text-slate-900 font-mono">
                            {currencySymbol}{(itemPrice * itemQty).toFixed(2)}
                          </span>
                        </div>
                      );
                    })}
                    {items.length > 3 && (
                      <span className="text-[11px] font-semibold text-indigo-600 block pl-3">
                        + আরও {items.length - 3}টি পণ্য রয়েছে...
                      </span>
                    )}
                  </div>

                  {/* ফুটার: মোট টাকা ও পেমেন্ট মেথড */}
                  <div className="pt-2 border-t border-dashed border-slate-200 flex items-center justify-between text-xs">
                    <span className="text-slate-500 flex items-center space-x-1">
                      <CreditCard className="w-3.5 h-3.5 text-slate-400" />
                      <span>পেমেন্ট মাধ্যম: <strong>{payment}</strong></span>
                    </span>

                    <div className="flex items-baseline space-x-1">
                      <span className="text-slate-500 font-medium">মোট প্রদেয়:</span>
                      <span className="text-sm font-black text-indigo-900 font-mono">
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
        <div className="p-4 border-t border-slate-200 bg-slate-50/80 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold transition-all cursor-pointer"
          >
            বন্ধ করুন
          </button>
        </div>

      </div>
    </div>
  );
}

