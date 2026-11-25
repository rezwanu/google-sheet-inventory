import React, { useState, useEffect, useMemo } from 'react';
import { X, Printer, MessageCircle } from 'lucide-react';
import { extractAndNormalizeItems, getDriveImageCandidates } from '../services/storage';
import { formatFabricQuantity } from '../utils/fabricUtils';
import { generateWhatsAppInvoiceText, openWhatsAppInvoice } from '../utils/whatsappUtils';

export default function InvoiceModal({
  isOpen,
  onClose,
  saleData,
  settings,
  autoPrint = false
}) {
  const [printFormat, setPrintFormat] = useState('thermal');

  const rawLogo = settings?.LogoUrl || settings?.logoUrl;
  const candidates = useMemo(() => getDriveImageCandidates(rawLogo), [rawLogo]);
  const [candidateIdx, setCandidateIdx] = useState(0);

  useEffect(() => {
    setCandidateIdx(0);
  }, [rawLogo]);

  const currentLogoSrc = candidates[candidateIdx] || '';
  const hasValidLogo = Boolean(currentLogoSrc && candidateIdx < candidates.length);

  const handleLogoError = () => {
    setCandidateIdx((prev) => prev + 1);
  };

  const items = useMemo(() => {
    return extractAndNormalizeItems(saleData);
  }, [saleData]);

  useEffect(() => {
    if (!isOpen) return;
    const handleEsc = (e) => {
      if (e.key === 'Escape' && onClose) onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen && autoPrint && saleData) {
      const timer = setTimeout(() => {
        handlePrint();
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [isOpen, autoPrint, saleData, printFormat]);

  if (!isOpen || !saleData) return null;

  const currencySymbol = settings?.CurrencySymbol || '৳';
  const taxRate = Number(saleData.taxPercent || settings?.TaxRatePercent || 0);

  const handlePrint = () => {
    document.body.classList.remove('print-mode-thermal', 'print-mode-a4');
    document.body.classList.add(printFormat === 'thermal' ? 'print-mode-thermal' : 'print-mode-a4');
    window.print();
  };

  const handleSendWhatsApp = () => {
    if (!saleData) return;
    const phone = saleData.CustomerPhone || saleData.customerPhone || '';
    let targetPhone = phone;
    if (!targetPhone) {
      targetPhone = window.prompt('কাস্টমারের হোয়াটসঅ্যাপ মোবাইল নম্বর লিখুন (যেমন: 017xxxxxxxx):', '');
      if (!targetPhone) return;
    }
    const text = generateWhatsAppInvoiceText({
      invoice: saleData,
      storeSettings: settings,
      currencySymbol: currencySymbol
    });
    openWhatsAppInvoice(targetPhone, text);
  };

  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto bg-neutral-950/40 flex items-center justify-center p-2 sm:p-4 print:p-0 print:bg-white print:static">
      <div className="bg-white rounded-lg border border-neutral-200/80 max-w-4xl w-full overflow-hidden flex flex-col max-h-[95vh] print:max-h-none print:border-none print:w-full print:rounded-none">
        {/* টপ টুলবার (Utilitarian Minimalism) */}
        <div className="no-print px-5 py-3 bg-white border-b border-neutral-200/80 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Printer className="w-4 h-4 text-[#111111]" />
            <h3 className="text-sm font-semibold font-heading tracking-tight text-[#111111]">
              Invoice Preview
            </h3>
          </div>

          {/* 80mm Thermal vs Standard A4 Switch */}
          <div className="flex items-center bg-[#FAFAFA] p-1 rounded-md border border-neutral-200/80 text-xs">
            <button
              type="button"
              onClick={() => setPrintFormat('thermal')}
              className={`min-h-[32px] px-3 py-1 rounded-sm font-medium transition-colors cursor-pointer ${
                printFormat === 'thermal'
                  ? 'bg-[#0F172A] text-white'
                  : 'text-[#525252] hover:text-[#111111]'
              }`}
            >
              80mm Thermal
            </button>
            <button
              type="button"
              onClick={() => setPrintFormat('a4')}
              className={`min-h-[32px] px-3 py-1 rounded-sm font-medium transition-colors cursor-pointer ${
                printFormat === 'a4'
                  ? 'bg-[#0F172A] text-white'
                  : 'text-[#525252] hover:text-[#111111]'
              }`}
            >
              Standard A4
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSendWhatsApp}
              className="min-h-[36px] px-3 py-1.5 bg-white hover:bg-neutral-100 text-[#15803D] border border-emerald-200 text-xs font-medium rounded-md flex items-center gap-1.5 cursor-pointer"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span>WhatsApp</span>
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="min-h-[36px] px-3.5 py-1.5 bg-[#0F172A] hover:bg-slate-800 text-white text-xs font-medium rounded-md flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / PDF</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="min-w-[36px] min-h-[36px] flex items-center justify-center text-[#525252] hover:text-[#111111] rounded-md border border-neutral-200/80 hover:bg-neutral-100 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* প্রিন্টেবল প্রিভিউ এরিয়া */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-[#FAFAFA] flex justify-center print:p-0 print:bg-white print:overflow-visible">
          <div id="printable-invoice-container" className="w-full flex justify-center">
            {printFormat === 'thermal' && (
              <div className="invoice-thermal-sheet w-[80mm] max-w-[80mm] bg-white p-4 text-[#111111] font-mono tabular-nums text-[12px] leading-tight border border-neutral-200 print:border-none print:p-2 print:w-[80mm]">
                <div className="text-center pb-2 border-b border-dashed border-neutral-400">
                  {hasValidLogo && (
                    <img
                      src={currentLogoSrc}
                      alt={settings?.StoreName || 'লোগো'}
                      className="h-10 mx-auto object-contain mb-1.5 grayscale"
                      onError={handleLogoError}
                    />
                  )}
                  <h2 className="text-base font-bold uppercase tracking-tight text-[#111111]">
                    {settings?.StoreName || 'ENTERPRISE POS'}
                  </h2>
                  <p className="text-[11px] text-[#525252] mt-0.5 font-sans">{settings?.Address}</p>
                  {settings?.Phone && (
                    <p className="text-[11px] text-[#525252]">Tel: {settings.Phone}</p>
                  )}
                </div>

                <div className="py-2 border-b border-dashed border-neutral-400 text-[11px] space-y-0.5">
                  <div className="flex justify-between">
                    <span className="text-[#525252]">Invoice:</span>
                    <span className="font-bold">{saleData.invoiceNo}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#525252]">Date:</span>
                    <span>{new Date(saleData.timestamp || Date.now()).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#525252]">Customer:</span>
                    <span className="truncate max-w-[140px] font-sans font-medium">
                      {saleData.customerName || 'Walk-in'}
                    </span>
                  </div>
                  {saleData.customerPhone && (
                    <div className="flex justify-between">
                      <span className="text-[#525252]">Phone:</span>
                      <span>{saleData.customerPhone}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-[#525252]">Payment:</span>
                    <span className="font-semibold">{saleData.paymentMethod || 'Cash'}</span>
                  </div>
                </div>

                <div className="py-2 border-b border-dashed border-neutral-400">
                  <table className="w-full text-[11px]">
                    <thead>
                      <tr className="border-b border-neutral-300 text-[#525252] font-bold">
                        <th className="text-left pb-1">Item</th>
                        <th className="text-center pb-1">Qty</th>
                        <th className="text-right pb-1">Rate</th>
                        <th className="text-right pb-1">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-dotted divide-neutral-200">
                      {items.map((item, index) => (
                        <tr key={index} className="align-top py-1">
                          <td className="text-left py-1 pr-1 font-sans text-[11px] leading-tight">
                            <span>{item.productName}</span>
                            {item.variantName && (
                              <span className="block text-[9px] text-[#525252]">({item.variantName})</span>
                            )}
                          </td>
                          <td className="text-center py-1 whitespace-nowrap">
                            x{formatFabricQuantity(item.quantity, item.unit, false)}
                          </td>
                          <td className="text-right py-1 whitespace-nowrap">
                            {Number(item.sellingPrice).toFixed(1)}
                          </td>
                          <td className="text-right py-1 font-bold whitespace-nowrap">
                            {Number(item.total || item.sellingPrice * item.quantity).toFixed(1)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="py-2 border-b border-dashed border-neutral-400 text-[11px] space-y-1">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>{currencySymbol}{Number(saleData.subTotal).toFixed(2)}</span>
                  </div>
                  {Number(saleData.discountAmount) > 0 && (
                    <div className="flex justify-between">
                      <span>Discount:</span>
                      <span>-{currencySymbol}{Number(saleData.discountAmount).toFixed(2)}</span>
                    </div>
                  )}
                  {taxRate > 0 && (
                    <div className="flex justify-between">
                      <span>Tax ({taxRate}%):</span>
                      <span>{currencySymbol}{Number(saleData.taxAmount).toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm font-bold border-t border-[#111111] pt-1.5 mt-1">
                    <span>Grand Total:</span>
                    <span>{currencySymbol}{Number(saleData.grandTotal).toFixed(2)}</span>
                  </div>
                </div>

                <div className="pt-3 text-center text-[10px] space-y-1 text-[#525252]">
                  <div className="tracking-widest text-[11px] font-bold text-[#111111]">
                    *{saleData.invoiceNo}*
                  </div>
                  <p className="font-sans font-medium text-[#111111]">
                    {settings?.ReceiptFooter || 'ধন্যবাদ! আবার আসবেন।'}
                  </p>
                </div>
              </div>
            )}

            {printFormat === 'a4' && (
              <div className="invoice-a4-sheet w-full max-w-3xl bg-white p-8 sm:p-10 text-[#111111] font-sans text-sm border border-neutral-200 print:border-none print:p-6 print:max-w-none print:w-full">
                <div className="flex justify-between items-start pb-6 border-b border-[#111111]">
                  <div className="flex items-center space-x-4">
                    {hasValidLogo && (
                      <img
                        src={currentLogoSrc}
                        alt={settings?.StoreName || 'লোগো'}
                        className="h-12 w-auto object-contain rounded-sm"
                        onError={handleLogoError}
                      />
                    )}
                    <div>
                      <h1 className="text-xl font-semibold font-heading text-[#111111] tracking-tight">
                        {settings?.StoreName || 'ENTERPRISE POS'}
                      </h1>
                      <p className="text-xs text-[#525252] mt-1 max-w-sm">{settings?.Address}</p>
                      <p className="text-xs font-mono text-[#525252]">
                        {settings?.Phone} {settings?.Email ? `• ${settings.Email}` : ''}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="inline-block px-2.5 py-1 bg-[#0F172A] text-white text-[11px] font-medium tracking-wider rounded-sm uppercase">
                      INVOICE
                    </span>
                    <p className="text-base font-semibold font-mono tabular-nums text-[#111111] mt-2">
                      {saleData.invoiceNo}
                    </p>
                    <p className="text-xs font-mono tabular-nums text-[#525252]">
                      {new Date(saleData.timestamp || Date.now()).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6 py-5 border-b border-neutral-200 text-xs">
                  <div>
                    <h4 className="font-medium text-[#737373] uppercase tracking-wider mb-1 text-[10.5px]">
                      Billed To
                    </h4>
                    <p className="text-sm font-semibold text-[#111111]">
                      {saleData.customerName || 'Walk-in Customer'}
                    </p>
                    {saleData.customerPhone && (
                      <p className="text-[#525252] font-mono mt-0.5">{saleData.customerPhone}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <h4 className="font-medium text-[#737373] uppercase tracking-wider mb-1 text-[10.5px]">
                      Payment Info
                    </h4>
                    <p className="text-[#525252]">
                      Method: <span className="font-mono font-semibold text-[#111111]">{saleData.paymentMethod || 'Cash'}</span>
                    </p>
                    <p className="text-[#525252] mt-0.5">
                      Status: <span className="font-semibold text-[#15803D]">PAID</span>
                    </p>
                  </div>
                </div>

                <div className="py-5">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-[#FAFAFA] text-[#525252] font-medium border-y border-neutral-200">
                        <th className="py-2.5 px-3">#</th>
                        <th className="py-2.5 px-3">Item Description</th>
                        <th className="py-2.5 px-3 text-center">Qty</th>
                        <th className="py-2.5 px-3 text-right">Unit Price</th>
                        <th className="py-2.5 px-3 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-200">
                      {items.map((item, idx) => (
                        <tr key={idx}>
                          <td className="py-2.5 px-3 font-mono tabular-nums text-[#737373]">{idx + 1}</td>
                          <td className="py-2.5 px-3 font-medium text-[#111111]">
                            {item.productName}
                            {item.barcode && (
                              <span className="block text-[10px] font-mono text-[#737373]">
                                SKU: {item.barcode}
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono tabular-nums">
                            {formatFabricQuantity(item.quantity, item.unit, true)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono tabular-nums">
                            {currencySymbol}{Number(item.sellingPrice).toFixed(2)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono tabular-nums font-semibold text-[#111111]">
                            {currencySymbol}{Number(item.total || item.sellingPrice * item.quantity).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="pt-4 border-t border-neutral-200 flex justify-between items-start">
                  <div className="max-w-xs text-xs text-[#525252] space-y-1">
                    <p className="font-semibold text-[#111111]">Terms & Footer</p>
                    <p>{settings?.ReceiptFooter || 'ধন্যবাদ! আবার আসবেন।'}</p>
                    <div className="pt-8">
                      <div className="w-36 border-b border-neutral-400" />
                      <p className="text-[10px] text-[#737373] mt-1">Authorized Signature</p>
                    </div>
                  </div>

                  <div className="w-64 space-y-1.5 text-xs">
                    <div className="flex justify-between text-[#525252]">
                      <span>Subtotal</span>
                      <span className="font-mono tabular-nums font-medium text-[#111111]">
                        {currencySymbol}{Number(saleData.subTotal).toFixed(2)}
                      </span>
                    </div>
                    {Number(saleData.discountAmount) > 0 && (
                      <div className="flex justify-between text-[#B91C1C]">
                        <span>Discount</span>
                        <span className="font-mono tabular-nums">
                          -{currencySymbol}{Number(saleData.discountAmount).toFixed(2)}
                        </span>
                      </div>
                    )}
                    {taxRate > 0 && (
                      <div className="flex justify-between text-[#525252]">
                        <span>Tax ({taxRate}%)</span>
                        <span className="font-mono tabular-nums">
                          {currencySymbol}{Number(saleData.taxAmount).toFixed(2)}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between text-base font-semibold text-[#111111] pt-2 border-t border-[#111111]">
                      <span>Grand Total</span>
                      <span className="font-mono tabular-nums">
                        {currencySymbol}{Number(saleData.grandTotal).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
