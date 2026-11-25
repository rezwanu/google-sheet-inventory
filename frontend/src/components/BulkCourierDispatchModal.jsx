import React, { useState } from 'react';
import {
  X,
  Truck,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  RefreshCw,
  Printer,
  Send,
  Key
} from 'lucide-react';

export default function BulkCourierDispatchModal({
  isOpen,
  onClose,
  selectedOrders = [],
  settings = {},
  onSteadfastBulkDispatch,
  onOpenBulkLabels,
  currencySymbol = '৳'
}) {
  const [apiKey, setApiKey] = useState(settings?.SteadfastApiKey || '');
  const [secretKey, setSecretKey] = useState(settings?.SteadfastSecretKey || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dispatchResults, setDispatchResults] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  // প্রতিটি অর্ডারের সিওডি এবং নোটস এডিটযোগ্য রাখার লোকাল স্টেট
  const [orderEdits, setOrderEdits] = useState(() => {
    const map = {};
    selectedOrders.forEach(ord => {
      const codAmount = ord.DueAmount !== undefined 
        ? ord.DueAmount 
        : (ord.dueAmount !== undefined ? ord.dueAmount : (ord.TotalAmount || 0));
      map[ord.OrderID] = {
        included: true,
        cod: codAmount,
        note: ord.Notes || 'Handle with care / Fragile'
      };
    });
    return map;
  });

  if (!isOpen) return null;

  const handleToggleInclude = (id) => {
    setOrderEdits(prev => ({
      ...prev,
      [id]: { ...prev[id], included: !prev[id]?.included }
    }));
  };

  const handleCodChange = (id, val) => {
    setOrderEdits(prev => ({
      ...prev,
      [id]: { ...prev[id], cod: Math.max(0, Number(val) || 0) }
    }));
  };

  const handleNoteChange = (id, val) => {
    setOrderEdits(prev => ({
      ...prev,
      [id]: { ...prev[id], note: val }
    }));
  };

  const activeOrders = selectedOrders.filter(o => orderEdits[o.OrderID]?.included);
  const totalCod = activeOrders.reduce((sum, o) => sum + (Number(orderEdits[o.OrderID]?.cod) || 0), 0);

  const handleSubmitDispatch = async () => {
    if (activeOrders.length === 0) {
      setErrorMsg('অনুগ্রহ করে অন্তত একটি অর্ডার নির্বাচন করুন।');
      return;
    }

    const effectiveApiKey = apiKey.trim() || settings?.SteadfastApiKey;
    const effectiveSecretKey = secretKey.trim() || settings?.SteadfastSecretKey;

    if (!effectiveApiKey || !effectiveSecretKey) {
      setErrorMsg('Steadfast API Key এবং Secret Key প্রদান করা আবশ্যক।');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');
    setDispatchResults(null);

    const payloadOrders = activeOrders.map(ord => ({
      orderId: ord.OrderID,
      orderNumber: ord.OrderNumber || ord.OrderID,
      customerName: ord.CustomerName || 'Customer',
      customerPhone: ord.CustomerPhone || '',
      customerAddress: ord.CustomerAddress || 'Bangladesh',
      dueAmount: Number(orderEdits[ord.OrderID]?.cod) || 0,
      notes: orderEdits[ord.OrderID]?.note || 'Fragile'
    }));

    try {
      if (onSteadfastBulkDispatch) {
        const res = await onSteadfastBulkDispatch(payloadOrders);
        if (res.success) {
          setDispatchResults(res.data || res);
        } else {
          setErrorMsg(res.message || 'বুকিং ব্যর্থ হয়েছে।');
        }
      }
    } catch (err) {
      setErrorMsg(err.message || 'সার্ভার যোগাযোগ ব্যর্থ হয়েছে।');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-neutral-900/40 flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg border border-neutral-200/80 max-w-4xl w-full overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-150 relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* হেডার ব্যানার */}
        <div className="p-4 sm:p-5 border-b border-neutral-200/80 bg-[#FAFAFA] text-[#111111] flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3.5">
            <div className="w-10 h-10 rounded-md bg-white flex items-center justify-center text-[#0F172A] border border-neutral-200/80 shrink-0">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base sm:text-lg font-semibold tracking-tight text-[#111111]">
                  Steadfast ১-ক্লিক বাল্ক কুরিয়ার এন্ট্রি
                </h2>
                <span className="px-2 py-0.5 bg-emerald-50 text-[#15803D] text-[10px] font-medium rounded-md border border-emerald-200/80 uppercase">
                  Official API
                </span>
              </div>
              <p className="text-xs text-[#525252] mt-0.5">
                এক সাথে একাধিক অর্ডার Steadfast-এ বুকিং করুন এবং রিয়েল-টাইম কনসাইনমেন্ট কোড গ্রহণ করুন
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="min-h-[44px] sm:min-h-[36px] min-w-[44px] sm:min-w-[36px] p-2 text-[#525252] hover:text-[#111111] hover:bg-neutral-200/60 rounded-md transition-colors cursor-pointer flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* কনটেন্ট বডি */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-white">
          
          {/* মেট্রিক্স সামারি কার্ড */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3.5 bg-[#F5F5F5] border border-neutral-200/80 rounded-lg">
              <span className="text-[10px] font-medium uppercase tracking-wider text-[#737373] block mb-0.5">মোট পার্সেল সংখ্যা</span>
              <span className="text-xl font-semibold text-[#111111] font-mono tabular-nums">{activeOrders.length} টি</span>
            </div>

            <div className="p-3.5 bg-[#F5F5F5] border border-neutral-200/80 rounded-lg">
              <span className="text-[10px] font-medium uppercase tracking-wider text-[#737373] block mb-0.5">মোট ক্যাশ অন ডেলিভারি (COD)</span>
              <span className="text-xl font-semibold text-[#111111] font-mono tabular-nums">{currencySymbol}{totalCod.toLocaleString('bn-BD')}</span>
            </div>

            <div className="p-3.5 bg-[#F5F5F5] border border-neutral-200/80 rounded-lg">
              <span className="text-[10px] font-medium uppercase tracking-wider text-[#737373] block mb-0.5">স্টোর / প্রেরক</span>
              <span className="text-sm font-semibold text-[#111111] truncate block">{settings?.StoreName || 'দোকান'}</span>
            </div>
          </div>

          {/* যদি API Credentials সেটিংস এ না থাকে তবে ইনপুট ড্রপডাউন */}
          {(!settings?.SteadfastApiKey || !settings?.SteadfastSecretKey) && (
            <div className="p-4 bg-amber-50 border border-amber-200/80 rounded-lg space-y-2.5">
              <div className="flex items-center space-x-2 text-[#B45309] font-medium text-xs">
                <AlertTriangle className="w-4 h-4 shrink-0 text-[#B45309]" />
                <span>Steadfast API Key পাওয়া যায়নি। নিচের বক্সে আপনার Key ও Secret প্রদান করুন:</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <input
                  type="password"
                  placeholder="Steadfast API Key"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="min-h-[44px] sm:min-h-[36px] px-3 py-2 text-xs bg-white border border-amber-200/80 rounded-md font-mono text-[#111111] focus:outline-none focus:border-[#0F172A] focus:ring-1 focus:ring-[#0F172A]"
                />
                <input
                  type="password"
                  placeholder="Steadfast Secret Key"
                  value={secretKey}
                  onChange={(e) => setSecretKey(e.target.value)}
                  className="min-h-[44px] sm:min-h-[36px] px-3 py-2 text-xs bg-white border border-amber-200/80 rounded-md font-mono text-[#111111] focus:outline-none focus:border-[#0F172A] focus:ring-1 focus:ring-[#0F172A]"
                />
              </div>
            </div>
          )}

          {/* এরর মেসেজ ব্যানার */}
          {errorMsg && (
            <div className="p-3.5 bg-red-50 border border-red-200/80 text-[#B91C1C] rounded-lg text-xs font-medium flex items-center space-x-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 text-[#B91C1C]" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* ডিসপ্যাচ ফলাফল স্ক্রিন */}
          {dispatchResults ? (
            <div className="p-5 bg-emerald-50 border border-emerald-200/80 rounded-lg space-y-4 animate-in fade-in">
              <div className="flex items-center space-x-3 text-[#15803D]">
                <CheckCircle2 className="w-6 h-6 text-[#15803D] shrink-0" />
                <div>
                  <h3 className="text-base font-semibold tracking-tight text-[#111111]">অভিনন্দন! Steadfast-এ সফলভাবে বুকিং সম্পন্ন হয়েছে!</h3>
                  <p className="text-xs text-[#15803D]">অর্ডারগুলোর স্ট্যাটাস 'In Transit'-এ পরিবর্তিত হয়েছে এবং ট্র্যাকিং কোড সংরক্ষিত হয়েছে।</p>
                </div>
              </div>

              {/* ট্র্যাকিং কোডের সারাংশ তালিকা */}
              <div className="bg-white rounded-lg border border-emerald-200/80 divide-y divide-neutral-200/80 max-h-60 overflow-y-auto">
                {activeOrders.map(ord => {
                  const inv = String(ord.OrderNumber || ord.OrderID).trim();
                  const trk = dispatchResults?.trackingMap?.[inv] || 'অ্যাসাইন হয়েছে';
                  const cid = dispatchResults?.consignmentMap?.[inv] || 'CID তৈরি হয়েছে';

                  return (
                    <div key={ord.OrderID} className="p-3 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-semibold text-[#111111] block">{ord.CustomerName}</span>
                        <span className="text-[#525252] font-mono tabular-nums text-[11px]">{ord.OrderID} • {ord.CustomerPhone}</span>
                      </div>
                      <div className="text-right">
                        <span className="inline-block px-2.5 py-1 bg-emerald-50 text-[#15803D] border border-emerald-200/80 font-mono tabular-nums font-semibold rounded-md text-[11px]">
                          {trk}
                        </span>
                        <span className="block text-[10px] text-[#737373] font-mono tabular-nums mt-0.5">CID: {cid}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* লেবেল প্রিন্ট করার শর্টকাট */}
              <div className="pt-2 flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs font-medium text-[#111111]">
                  এখন আপনি সব পার্সেলের শিপিং স্টিকার লেবেল একসাথে প্রিন্ট করতে পারেন:
                </p>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    if (onOpenBulkLabels) onOpenBulkLabels();
                  }}
                  className="min-h-[44px] sm:min-h-[36px] px-4 py-2 bg-[#0F172A] hover:bg-slate-800 text-white text-xs font-medium rounded-md flex items-center space-x-1.5 cursor-pointer transition-colors"
                >
                  <Printer className="w-4 h-4" />
                  <span>শিপিং লেবেল প্রিন্ট করুন</span>
                </button>
              </div>
            </div>
          ) : (
            /* বুকিং প্রিভিউ টেবিল */
            <div className="border border-neutral-200/80 rounded-lg overflow-hidden bg-white">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#F5F5F5] border-b border-neutral-200/80 text-[#525252] font-medium">
                      <th className="py-2.5 px-3 w-10 text-center">
                        <span className="sr-only">সিলেক্ট</span>
                      </th>
                      <th className="py-2.5 px-3">অর্ডার ও কাস্টমার</th>
                      <th className="py-2.5 px-3">ঠিকানা</th>
                      <th className="py-2.5 px-3 w-36">সিওডি (COD)</th>
                      <th className="py-2.5 px-3">ডেলিভারি নোট</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200/80">
                    {selectedOrders.map((ord) => {
                      const edit = orderEdits[ord.OrderID] || {};
                      const isInc = edit.included !== false;

                      return (
                        <tr key={ord.OrderID} className={`hover:bg-[#FAFAFA] transition-colors ${!isInc ? 'opacity-40 bg-[#F5F5F5]' : ''}`}>
                          <td className="py-3 px-3 text-center">
                            <input
                              type="checkbox"
                              checked={isInc}
                              onChange={() => handleToggleInclude(ord.OrderID)}
                              className="w-4 h-4 accent-[#0F172A] rounded cursor-pointer"
                            />
                          </td>
                          <td className="py-3 px-3">
                            <strong className="text-[#111111] block font-semibold">{ord.CustomerName}</strong>
                            <span className="text-[11px] text-[#525252] font-mono tabular-nums">{ord.OrderID} • {ord.CustomerPhone}</span>
                          </td>
                          <td className="py-3 px-3 max-w-[200px]">
                            <p className="text-[11px] text-[#525252] line-clamp-2 leading-relaxed">
                              {ord.CustomerAddress || 'ঠিকানা দেওয়া নেই'}
                            </p>
                          </td>
                          <td className="py-3 px-3">
                            <div className="relative">
                              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#737373] font-medium text-xs">{currencySymbol}</span>
                              <input
                                type="number"
                                value={edit.cod ?? 0}
                                disabled={!isInc}
                                onChange={(e) => handleCodChange(ord.OrderID, e.target.value)}
                                className="w-full min-h-[44px] sm:min-h-[36px] pl-6 pr-2 py-1.5 text-xs bg-white border border-neutral-200/80 rounded-md font-mono tabular-nums font-semibold text-[#111111] focus:outline-none focus:border-[#0F172A] focus:ring-1 focus:ring-[#0F172A]"
                              />
                            </div>
                          </td>
                          <td className="py-3 px-3">
                            <input
                              type="text"
                              value={edit.note ?? ''}
                              disabled={!isInc}
                              onChange={(e) => handleNoteChange(ord.OrderID, e.target.value)}
                              placeholder="নোট"
                              className="w-full min-h-[44px] sm:min-h-[36px] px-2.5 py-1.5 text-xs bg-white border border-neutral-200/80 rounded-md text-[#111111] focus:outline-none focus:border-[#0F172A] focus:ring-1 focus:ring-[#0F172A]"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>

        {/* ফুটার অ্যাকশন বার */}
        <div className="p-4 border-t border-neutral-200/80 bg-[#FAFAFA] flex flex-wrap items-center justify-between gap-3 shrink-0">
          <span className="text-xs text-[#525252] font-mono tabular-nums">
            {dispatchResults ? 'বুকিং প্রক্রিয়া সম্পন্ন হয়েছে।' : `${activeOrders.length}টি অর্ডার বুকিংয়ের জন্য প্রস্তুত`}
          </span>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] sm:min-h-[36px] px-4 py-2 border border-neutral-200/80 bg-white text-[#111111] text-xs font-medium rounded-md hover:bg-[#F5F5F5] transition-colors cursor-pointer"
            >
              {dispatchResults ? 'বন্ধ করুন' : 'বাতিল'}
            </button>

            {!dispatchResults && (
              <button
                type="button"
                onClick={handleSubmitDispatch}
                disabled={isSubmitting || activeOrders.length === 0}
                className="min-h-[44px] sm:min-h-[36px] px-5 py-2 bg-[#0F172A] hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-medium rounded-md transition-colors flex items-center space-x-2 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Steadfast-এ পাঠানো হচ্ছে...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Steadfast বুকিং নিশ্চিত করুন (<span className="font-mono tabular-nums">{activeOrders.length}</span>)</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
