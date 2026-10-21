import React, { useState, useMemo } from 'react';
import { X, History, Search, Receipt, Calendar, CreditCard, Printer, Eye } from 'lucide-react';
import { normalizeSale } from '../services/storage';

export default function SalesHistoryModal({
  isOpen,
  onClose,
  salesHistory = [],
  currencySymbol = '৳',
  onReprintInvoice,
  onViewInvoiceDetails
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
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-2xl w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[85vh]">
        
        {/* মডাল হেডার */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center space-x-2">
            <History className="w-5 h-5 text-indigo-600" />
            <h3 className="text-base font-bold text-slate-900">
              সাম্প্রতিক বিক্রয় হিস্ট্রি ও রিসিট রি-প্রিন্ট
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* সার্চ বার */}
        <div className="p-4 border-b border-slate-100 bg-white">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="ইনভয়েস নম্বর বা ক্রেতার নাম খুঁজুন..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 border border-slate-300 rounded-lg text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* হিস্ট্রি তালিকা */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {filteredSales.length === 0 ? (
            <div className="h-40 flex flex-col items-center justify-center text-slate-400 text-xs">
              <Receipt className="w-10 h-10 mb-2 stroke-1" />
              <span>কোনো বিক্রয় রেকর্ড পাওয়া যায়নি</span>
            </div>
          ) : (
            filteredSales.map((sale, idx) => (
              <div
                key={sale.saleId || idx}
                className="p-3 bg-slate-50 border border-slate-200 rounded-xl hover:border-indigo-300 transition-all flex flex-col space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="font-mono font-bold text-xs text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                      {sale.invoiceNo || 'INV-LOCAL'}
                    </span>
                    <span className="text-xs font-semibold text-slate-800">
                      {sale.customerName || 'Walk-in Customer'}
                    </span>
                  </div>
                  
                  <div className="flex items-center space-x-1.5">
                    <span className="text-sm font-extrabold text-slate-900 mr-1">
                      {currencySymbol}{Number(sale.grandTotal).toFixed(2)}
                    </span>
                    
                    {/* ইনভয়েস বিস্তারিত বাটন */}
                    {onViewInvoiceDetails && (
                      <button
                        onClick={() => onViewInvoiceDetails(sale)}
                        title="ইনভয়েসের পূর্ণ বিবরণ দেখুন"
                        className="p-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-semibold flex items-center space-x-1 shadow-2xs transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">বিস্তারিত</span>
                      </button>
                    )}

                    {/* ইনভয়েস রি-প্রিন্ট বাটন */}
                    <button
                      onClick={() => onReprintInvoice(sale)}
                      title="ইনভয়েস দেখুন বা রি-প্রিন্ট করুন"
                      className="p-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 hover:border-slate-300 rounded-lg text-xs font-semibold flex items-center space-x-1 shadow-2xs transition-colors"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">প্রিন্ট</span>
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-200/60">
                  <div className="flex items-center space-x-3">
                    <span className="flex items-center">
                      <Calendar className="w-3 h-3 mr-1 text-slate-400" />
                      {new Date(sale.timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                    </span>
                    <span className="flex items-center">
                      <CreditCard className="w-3 h-3 mr-1 text-slate-400" />
                      {sale.paymentMethod || 'Cash'}
                    </span>
                  </div>
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 font-medium px-2 py-0.5 rounded-full">
                    COMPLETED
                  </span>
                </div>

                {sale.items && sale.items.length > 0 && (
                  <div className="text-[11px] text-slate-600 bg-white p-2 rounded-lg border border-slate-100 line-clamp-2">
                    {sale.items.map((i) => `${i.productName} (x${i.quantity})`).join(', ')}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* ফুটার */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 text-right">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 text-white text-xs font-semibold rounded-lg hover:bg-slate-900 transition-colors"
          >
            বন্ধ করুন
          </button>
        </div>

      </div>
    </div>
  );
}
