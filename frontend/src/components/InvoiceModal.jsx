import React, { useState, useEffect, useMemo } from 'react';
import { X, Printer, FileText, CheckCircle2, RotateCcw } from 'lucide-react';
import { extractAndNormalizeItems, formatImageUrl, getDriveImageCandidates } from '../services/storage';

export default function InvoiceModal({
  isOpen,
  onClose,
  saleData,
  settings,
  autoPrint = false
}) {
  // প্রিন্ট ফরম্যাট: 'thermal' (80mm) অথবা 'a4' (Standard A4)
  const [printFormat, setPrintFormat] = useState('thermal');

  // স্টোর লোগো URL ও ফলব্যাক ক্যান্ডিডেট প্রস্তুত করা
  const rawLogo = settings?.LogoUrl || settings?.logoUrl;
  const candidates = useMemo(() => getDriveImageCandidates(rawLogo), [rawLogo]);
  const [candidateIdx, setCandidateIdx] = useState(0);

  useEffect(() => {
    setCandidateIdx(0);
  }, [rawLogo]);

  const currentLogoSrc = candidates[candidateIdx] || '';
  const hasValidLogo = Boolean(currentLogoSrc && candidateIdx < candidates.length);

  const handleLogoError = () => {
    setCandidateIdx(prev => prev + 1);
  };

  // পণ্যের তালিকা নিরাপদভাবে বের করা
  const items = useMemo(() => {
    return extractAndNormalizeItems(saleData);
  }, [saleData]);

  // মডাল খুললে যদি autoPrint সত্য হয়, তবে সাথে সাথে ব্রাউজারের প্রিন্ট ডায়ালগ ওপেন করা
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

  // প্রিন্ট হ্যান্ডলার
  const handlePrint = () => {
    // প্রিন্ট মোড অনুযায়ী বডিতে ক্লাস যুক্ত করা
    document.body.classList.remove('print-mode-thermal', 'print-mode-a4');
    document.body.classList.add(printFormat === 'thermal' ? 'print-mode-thermal' : 'print-mode-a4');
    
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 print:p-0 print:bg-white print:static">
      
      {/* স্ক্রিন প্রিভিউ কন্টেইনার (প্রিন্টের সময় স্ক্রিনের অপ্রয়োজনীয় এলিমেন্ট ছাড়া মূল অংশ প্রিন্ট হবে) */}
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-4xl w-full overflow-hidden flex flex-col max-h-[95vh] print:max-h-none print:shadow-none print:border-none print:w-full print:rounded-none">
        
        {/* টপ টুলবার (প্রিন্টের সময় লুকায়িত থাকবে) */}
        <div className="no-print px-6 py-3.5 bg-slate-800 text-white flex flex-wrap items-center justify-between gap-3 border-b border-slate-700">
          <div className="flex items-center space-x-2">
            <Printer className="w-5 h-5 text-indigo-400" />
            <h3 className="text-sm font-bold tracking-wide">
              ইনভয়েস প্রিভিউ ও প্রিন্ট জেনারেটর
            </h3>
          </div>

          {/* পেপার সাইজ টগল বাটন (৮০মিমি থার্মাল বনাম এ৪) */}
          <div className="flex items-center bg-slate-900/80 p-1 rounded-xl border border-slate-700 text-xs">
            <button
              onClick={() => setPrintFormat('thermal')}
              className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                printFormat === 'thermal'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              80mm Thermal (POS রোল)
            </button>
            <button
              onClick={() => setPrintFormat('a4')}
              className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                printFormat === 'a4'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Standard A4 সাইজ
            </button>
          </div>

          {/* অ্যাকশন বাটনসমূহ */}
          <div className="flex items-center space-x-2">
            <button
              onClick={handlePrint}
              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm transition-all flex items-center space-x-1.5"
            >
              <Printer className="w-4 h-4" />
              <span>প্রিন্ট / PDF সংরক্ষণ</span>
            </button>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-700 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* প্রিন্টেবল প্রিভিউ এরিয়া */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-100 flex justify-center print:p-0 print:bg-white print:overflow-visible">
          
          <div id="printable-invoice-container" className="w-full flex justify-center">
            
            {/* ---------------------------------------------------------------- */}
            {/* লেআউট ১: 80mm থার্মাল রিসিট লেআউট (Thermal 80mm Format) */}
            {/* ---------------------------------------------------------------- */}
            {printFormat === 'thermal' && (
              <div className="invoice-thermal-sheet w-[80mm] max-w-[80mm] bg-white p-4 text-slate-900 shadow-md font-mono text-[12px] leading-tight border border-slate-200 print:shadow-none print:border-none print:p-2 print:w-[80mm]">
                
                {/* স্টোর ব্র্যান্ডিং */}
                <div className="text-center pb-2 border-b border-dashed border-slate-400">
                  {hasValidLogo && (
                    <img
                      src={currentLogoSrc}
                      alt={settings?.StoreName || 'লোগো'}
                      className="h-10 mx-auto object-contain mb-1.5 grayscale"
                      onError={handleLogoError}
                    />
                  )}
                  <h2 className="text-base font-extrabold uppercase tracking-tight text-slate-950">
                    {settings?.StoreName || 'AMAR POS STORE'}
                  </h2>
                  <p className="text-[11px] text-slate-600 mt-0.5">{settings?.Address}</p>
                  {settings?.Phone && (
                    <p className="text-[11px] text-slate-600">ফোন: {settings.Phone}</p>
                  )}
                </div>

                {/* ইনভয়েস মেটাডাটা */}
                <div className="py-2 border-b border-dashed border-slate-400 text-[11px] space-y-0.5">
                  <div className="flex justify-between">
                    <span className="text-slate-600">ইনভয়েস নং:</span>
                    <span className="font-bold">{saleData.invoiceNo}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">তারিখ:</span>
                    <span>{new Date(saleData.timestamp || Date.now()).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">ক্রেতা:</span>
                    <span className="truncate max-w-[140px] font-medium">
                      {saleData.customerName || 'Walk-in'}
                    </span>
                  </div>
                  {saleData.customerPhone && (
                    <div className="flex justify-between">
                      <span className="text-slate-600">মোবাইল:</span>
                      <span>{saleData.customerPhone}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-slate-600">পেমেন্ট:</span>
                    <span className="font-semibold">{saleData.paymentMethod || 'Cash'}</span>
                  </div>
                </div>

                {/* আইটেম তালিকা */}
                <div className="py-2 border-b border-dashed border-slate-400">
                  <table className="w-full text-[11px]">
                    <thead>
                      <tr className="border-b border-slate-300 pb-1 text-slate-600 font-bold">
                        <th className="text-left pb-1">আইটেম</th>
                        <th className="text-center pb-1">পরিমাণ</th>
                        <th className="text-right pb-1">দর</th>
                        <th className="text-right pb-1">মোট</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-dotted divide-slate-200">
                      {items.map((item, index) => (
                        <tr key={index} className="align-top py-1">
                          <td className="text-left py-1 pr-1 font-sans text-[11px] leading-tight">
                            <span>{item.productName}</span>
                            {item.variantName && (
                              <span className="block text-[9px] text-slate-500 font-normal">
                                ({item.variantName})
                              </span>
                            )}
                          </td>
                          <td className="text-center py-1 whitespace-nowrap">
                            x{item.quantity}
                          </td>
                          <td className="text-right py-1 whitespace-nowrap">
                            {Number(item.sellingPrice).toFixed(1)}
                          </td>
                          <td className="text-right py-1 font-bold whitespace-nowrap">
                            {Number(item.total || (item.sellingPrice * item.quantity)).toFixed(1)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* মোট হিসাব ও ট্যাক্স */}
                <div className="py-2 border-b border-dashed border-slate-400 text-[11px] space-y-1">
                  <div className="flex justify-between">
                    <span>উপ-মোট (SubTotal):</span>
                    <span>{currencySymbol}{Number(saleData.subTotal).toFixed(2)}</span>
                  </div>
                  {Number(saleData.discountAmount) > 0 && (
                    <div className="flex justify-between text-slate-700">
                      <span>ছাড় (Discount):</span>
                      <span>-{currencySymbol}{Number(saleData.discountAmount).toFixed(2)}</span>
                    </div>
                  )}
                  {taxRate > 0 && (
                    <div className="flex justify-between">
                      <span>ভ্যাট/ট্যাক্স ({taxRate}%):</span>
                      <span>{currencySymbol}{Number(saleData.taxAmount).toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm font-black border-t border-slate-800 pt-1.5 mt-1">
                    <span>সর্বমোট:</span>
                    <span>{currencySymbol}{Number(saleData.grandTotal).toFixed(2)}</span>
                  </div>
                </div>

                {/* ইনভয়েস ফুটার ও বারকোড ডামি */}
                <div className="pt-3 text-center text-[10px] space-y-1 text-slate-600">
                  <div className="font-mono tracking-widest text-[11px] font-bold text-slate-800">
                    *{saleData.invoiceNo}*
                  </div>
                  <p className="font-sans font-medium text-slate-800">
                    {settings?.ReceiptFooter || 'ধন্যবাদ! আবার আসবেন।'}
                  </p>
                  <p className="text-[9px] text-slate-400">Powered by Enterprise POS</p>
                </div>

              </div>
            )}

            {/* ---------------------------------------------------------------- */}
            {/* লেআউট ২: Standard A4 সাইজ ইনভয়েস (A4 Size Format) */}
            {/* ---------------------------------------------------------------- */}
            {printFormat === 'a4' && (
              <div className="invoice-a4-sheet w-full max-w-3xl bg-white p-8 sm:p-12 text-slate-900 shadow-xl font-sans text-sm border border-slate-200 print:shadow-none print:border-none print:p-6 print:max-w-none print:w-full">
                
                {/* A4 হেডার: লোগো, প্রতিষ্ঠানের নাম ও ঠিকানা */}
                <div className="flex justify-between items-start pb-6 border-b-2 border-slate-900">
                  <div className="flex items-center space-x-4">
                    {hasValidLogo && (
                      <img
                        src={currentLogoSrc}
                        alt={settings?.StoreName || 'লোগো'}
                        className="h-14 w-auto object-contain rounded-md"
                        onError={handleLogoError}
                      />
                    )}
                    <div>
                      <h1 className="text-2xl font-black text-slate-950 tracking-tight">
                        {settings?.StoreName || 'স্টোর ক্যাশ মেমো'}
                      </h1>
                      <p className="text-xs text-slate-500 mt-1 max-w-sm">{settings?.Address}</p>
                      <p className="text-xs text-slate-500">
                        মোবাইল: {settings?.Phone} | ইমেইল: {settings?.Email}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="inline-block px-3 py-1 bg-slate-900 text-white text-xs font-bold tracking-wider rounded-md uppercase">
                      INVOICE / বিল চালান
                    </span>
                    <p className="text-lg font-black font-mono text-indigo-700 mt-2">
                      {saleData.invoiceNo}
                    </p>
                    <p className="text-xs text-slate-500">
                      তারিখ: {new Date(saleData.timestamp || Date.now()).toLocaleDateString('bn-BD', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                  </div>
                </div>

                {/* বিলিং ইনফরমেশন গ্রিড */}
                <div className="grid grid-cols-2 gap-6 py-6 border-b border-slate-200 text-xs">
                  <div>
                    <h4 className="font-bold text-slate-400 uppercase tracking-wider mb-1">
                      গ্রাহকের বিবরণ (Billed To):
                    </h4>
                    <p className="text-sm font-bold text-slate-900">
                      {saleData.customerName || 'Walk-in Customer'}
                    </p>
                    {saleData.customerPhone && (
                      <p className="text-slate-600 mt-0.5">মোবাইল: {saleData.customerPhone}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <h4 className="font-bold text-slate-400 uppercase tracking-wider mb-1">
                      পেমেন্ট সংক্রান্ত তথ্য:
                    </h4>
                    <p className="text-slate-700">
                      পরিশোধ মাধ্যম: <span className="font-bold text-slate-900">{saleData.paymentMethod || 'Cash'}</span>
                    </p>
                    <p className="text-slate-700 mt-0.5">
                      স্ট্যাটাস: <span className="font-bold text-emerald-700">পরিশোধিত (PAID)</span>
                    </p>
                    {saleData.cashierEmail && (
                      <p className="text-slate-500 mt-0.5">ক্যাশিয়ার: {saleData.cashierEmail}</p>
                    )}
                  </div>
                </div>

                {/* আইটেম টেবিল */}
                <div className="py-6">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700 font-bold border-y border-slate-200">
                        <th className="py-3 px-3">ক্র নং</th>
                        <th className="py-3 px-3">পণ্যের বিবরণ</th>
                        <th className="py-3 px-3 text-center">পরিমাণ</th>
                        <th className="py-3 px-3 text-right">একক মূল্য</th>
                        <th className="py-3 px-3 text-right">মোট টাকা</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {items.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50">
                          <td className="py-3 px-3 font-mono text-slate-400">{idx + 1}</td>
                          <td className="py-3 px-3 font-medium text-slate-900">
                            {item.productName}
                            {item.barcode && (
                              <span className="block text-[10px] font-mono text-slate-400">
                                SKU: {item.barcode}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-center font-bold">
                            {item.quantity} {item.unit || 'Pcs'}
                          </td>
                          <td className="py-3 px-3 text-right">
                            {currencySymbol}{Number(item.sellingPrice).toFixed(2)}
                          </td>
                          <td className="py-3 px-3 text-right font-bold text-slate-900">
                            {currencySymbol}{Number(item.total || (item.sellingPrice * item.quantity)).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* সামারি এবং সিগনেচার সেকশন */}
                <div className="pt-4 border-t border-slate-200 flex justify-between items-start">
                  
                  {/* শর্ত ও কৃতজ্ঞতা প্রকাশ */}
                  <div className="max-w-xs text-xs text-slate-500 space-y-1">
                    <p className="font-bold text-slate-700">নোট ও শর্তাবলী:</p>
                    <p>{settings?.ReceiptFooter || 'পণ্য ক্রয়ের জন্য ধন্যবাদ! বিক্রিত পণ্য ৭ দিনের মধ্যে পরিবর্তনযোগ্য।'}</p>
                    <div className="pt-8">
                      <div className="w-36 border-b border-slate-400"></div>
                      <p className="text-[10px] text-slate-400 mt-1">কর্তৃপক্ষের স্বাক্ষর</p>
                    </div>
                  </div>

                  {/* হিসাব বিবরণী */}
                  <div className="w-64 space-y-2 text-xs">
                    <div className="flex justify-between text-slate-600">
                      <span>সাব-টোটাল:</span>
                      <span className="font-semibold">{currencySymbol}{Number(saleData.subTotal).toFixed(2)}</span>
                    </div>
                    {Number(saleData.discountAmount) > 0 && (
                      <div className="flex justify-between text-rose-600 font-medium">
                        <span>ডিসকাউন্ট:</span>
                        <span>-{currencySymbol}{Number(saleData.discountAmount).toFixed(2)}</span>
                      </div>
                    )}
                    {taxRate > 0 && (
                      <div className="flex justify-between text-slate-600">
                        <span>ভ্যাট / ট্যাক্স ({taxRate}%):</span>
                        <span>{currencySymbol}{Number(saleData.taxAmount).toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-base font-extrabold text-slate-900 pt-2 border-t-2 border-slate-900">
                      <span>সর্বমোট প্রদেয়:</span>
                      <span className="text-indigo-600">
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

