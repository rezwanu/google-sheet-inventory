import React, { useState, useMemo } from 'react';
import { X, History, Search, Receipt, Calendar, CreditCard, Printer, Eye, RotateCcw } from 'lucide-react';
import { normalizeSale } from '../services/storage';

export default function SalesHistoryModal({
  isOpen,
  onClose,
  salesHistory = [],
  currencySymbol = '৳',
  onReprintInvoice,
  onViewInvoiceDetails,
  onInitiateReturn
}) {
  const [searchTerm, setSearchTerm] = useState('');

  const normalizedSales = useMemo(() => {
    return (Array.isArray(salesHistory) ? salesHistory : [])
      .map(normalizeSale)
      .filter(Boolean);
  }, [salesHistory]);

  if (!isOpen) return null;

  const filteredSales = normalizedSales.filter((sale) => {
    const term = searchTerm.toLowerCase();
    return (
      (sale.invoiceNo && String(sale.invoiceNo).toLowerCase().includes(term)) ||
      (sale.customerName && String(sale.customerName).toLowerCase().includes(term)) ||
      (sale.customerPhone && String(sale.customerPhone).toLowerCase().includes(term)) ||
      (sale.paymentMethod && String(sale.paymentMethod).toLowerCase().includes(term))
    );
  });

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-neutral-900/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg border border-neutral-200/80 max-w-2xl w-full overflow-hidden flex flex-col max-h-[85vh]">
        
        {/* মডাল হেডার */}
        <div className="px-6 py-4 border-b border-neutral-200/80 flex items-center justify-between bg-[#FAFAFA]">
          <div className="flex items-center space-x-2">
            <History className="w-5 h-5 text-[#0F172A]" />
            <h3 className="text-base font-semibold tracking-tight text-[#111111]">
              সাম্প্রতিক বিক্রয় হিস্ট্রি ও রিসিট রি-প্রিন্ট
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-[#737373] hover:text-[#111111] p-1.5 rounded-md hover:bg-[#F5F5F5] border border-transparent hover:border-neutral-200/80 transition-colors min-h-[44px] min-w-[44px] sm:min-h-[36px] sm:min-w-[36px] flex items-center justify-center cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* সার্চ বার */}
        <div className="p-4 border-b border-neutral-200/80 bg-white">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#737373]" />
            <input
              type="text"
              placeholder="ইনভয়েস নম্বর বা ক্রেতার নাম খুঁজুন..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-neutral-200/80 rounded-md text-xs bg-[#F5F5F5] text-[#111111] placeholder-[#737373] focus:bg-white focus:outline-none focus:border-[#0F172A] min-h-[44px] sm:min-h-[36px]"
            />
          </div>
        </div>

        {/* হিস্ট্রি তালিকা */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5 bg-[#FAFAFA]">
          {filteredSales.length === 0 ? (
            <div className="h-40 flex flex-col items-center justify-center text-[#737373] text-xs bg-white rounded-lg border border-dashed border-neutral-200/80">
              <Receipt className="w-10 h-10 mb-2 stroke-1 text-neutral-400" />
              <span>কোনো বিক্রয় রেকর্ড পাওয়া যায়নি</span>
            </div>
          ) : (
            filteredSales.map((sale, idx) => (
              <div
                key={sale.saleId || idx}
                className="p-3.5 bg-white border border-neutral-200/80 rounded-lg hover:border-neutral-300 transition-colors flex flex-col space-y-2"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center space-x-2">
                    <span className="font-mono tabular-nums font-semibold text-xs text-[#111111] bg-[#F5F5F5] px-2 py-0.5 rounded-md border border-neutral-200/80">
                      {sale.invoiceNo || 'INV-LOCAL'}
                    </span>
                    <span className="text-xs font-semibold text-[#111111]">
                      {sale.customerName || 'Walk-in Customer'}
                    </span>
                  </div>
                  
                  <div className="flex items-center space-x-1.5">
                    <span className="text-sm font-semibold font-mono tabular-nums text-[#111111] mr-1">
                      {currencySymbol}{Number(sale.grandTotal).toFixed(2)}
                    </span>
                    
                    {/* ইনভয়েস বিস্তারিত বাটন */}
                    {onViewInvoiceDetails && (
                      <button
                        onClick={() => onViewInvoiceDetails(sale)}
                        title="ইনভয়েসের পূর্ণ বিবরণ দেখুন"
                        className="px-2.5 py-1.5 bg-[#F5F5F5] hover:bg-neutral-200/70 text-[#111111] border border-neutral-200/80 rounded-md text-xs font-medium flex items-center space-x-1 transition-colors min-h-[44px] sm:min-h-[36px] cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">বিস্তারিত</span>
                      </button>
                    )}

                    {/* ইনভয়েস রি-প্রিন্ট বাটন */}
                    <button
                      onClick={() => onReprintInvoice(sale)}
                      title="ইনভয়েস দেখুন বা রি-প্রিন্ট করুন"
                      className="px-2.5 py-1.5 bg-white hover:bg-[#F5F5F5] text-[#111111] border border-neutral-200/80 hover:border-neutral-300 rounded-md text-xs font-medium flex items-center space-x-1 transition-colors min-h-[44px] sm:min-h-[36px] cursor-pointer"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">প্রিন্ট</span>
                    </button>

                    {/* GAP 5: সরাসরি রিটার্ন শুরু করার ১-ক্লিক বাটন */}
                    {onInitiateReturn && (
                      <button
                        onClick={() => onInitiateReturn(sale)}
                        title="এই বিক্রয়ের জন্য রিটার্ন প্রসেস শুরু করুন"
                        className="px-2.5 py-1.5 bg-red-50 hover:bg-red-100 text-[#B91C1C] border border-red-200/80 rounded-md text-xs font-medium flex items-center space-x-1 transition-colors min-h-[44px] sm:min-h-[36px] cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">রিটার্ন</span>
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] text-[#525252] pt-1.5 border-t border-neutral-200/80">
                  <div className="flex items-center space-x-3">
                    <span className="flex items-center font-mono tabular-nums">
                      <Calendar className="w-3 h-3 mr-1 text-[#737373]" />
                      {new Date(sale.timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                    </span>
                    <span className="flex items-center">
                      <CreditCard className="w-3 h-3 mr-1 text-[#737373]" />
                      {sale.paymentMethod || 'Cash'}
                    </span>
                  </div>
                  <span className="text-[10px] bg-emerald-50 text-[#15803D] border border-emerald-200/80 font-medium px-2 py-0.5 rounded-md font-mono tabular-nums">
                    COMPLETED
                  </span>
                </div>

                {sale.items && sale.items.length > 0 && (
                  <div className="text-[11px] text-[#525252] bg-[#F5F5F5] p-2 rounded-md border border-neutral-200/80 line-clamp-2">
                    {sale.items.map((i) => `${i.productName} (x${i.quantity})`).join(', ')}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* ফুটার */}
        <div className="p-3 bg-[#FAFAFA] border-t border-neutral-200/80 text-right">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-[#0F172A] text-white text-xs font-medium rounded-md hover:bg-slate-800 transition-colors min-h-[44px] sm:min-h-[36px] cursor-pointer"
          >
            বন্ধ করুন
          </button>
        </div>

      </div>
    </div>
  );
}
