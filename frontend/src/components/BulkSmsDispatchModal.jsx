import React, { useState, useMemo } from 'react';
import {
  X,
  MessageSquare,
  Send,
  Smartphone,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Copy,
  ExternalLink,
  Sparkles,
  User,
  Check
} from 'lucide-react';

export default function BulkSmsDispatchModal({
  isOpen,
  onClose,
  selectedOrders = [],
  settings = {},
  onSendSmsNotification,
  currencySymbol = '৳'
}) {
  const storeName = settings?.StoreName || 'দোকান';

  // টেমপ্লেট টাইপ: 'courier' | 'order' | 'delivered' | 'custom'
  const [templateType, setTemplateType] = useState('courier');

  // মেসেজ টেমপ্লেট
  const defaultTemplates = useMemo(() => ({
    courier: settings?.SmsTemplateCourier || `প্রিয় {customerName}, আপনার পার্সেলটি {courierName}-এ পাঠানো হয়েছে। ট্র্যাকিং কোড: {trackingId}। বকেয়া টাকা: {dueAmount}। সাথে থাকুন, {storeName}।`,
    order: settings?.SmsTemplateOrder || `প্রিয় {customerName}, আপনার অর্ডার #{orderNumber} নিশ্চিত করা হয়েছে। মোট বিল: {totalAmount}। ধন্যবাদ, {storeName}।`,
    delivered: settings?.SmsTemplateDelivered || `প্রিয় {customerName}, আপনার অর্ডার #{orderNumber} সফলভাবে ডেলিভারি সম্পন্ন হয়েছে। আমাদের সাথে থাকার জন্য ধন্যবাদ, {storeName}।`,
    custom: `প্রিয় {customerName}, {storeName}-এর পক্ষ থেকে শুভেচ্ছা! আপনার অর্ডারের বিষয়ে যে কোনো প্রয়োজনে আমাদের সাথে যোগাযোগ করুন।`
  }), [settings, storeName]);

  const [messageTemplate, setMessageTemplate] = useState(defaultTemplates.courier);
  const [isSending, setIsSending] = useState(false);
  const [sendLogs, setSendLogs] = useState({}); // { [orderId]: 'Sent' | 'Failed' | 'Sending' }
  const [copiedOrderId, setCopiedOrderId] = useState(null);

  // টেমপ্লেট টাইপ বদলালে টেক্সটবক্স আপডেট
  const handleTemplateChange = (type) => {
    setTemplateType(type);
    setMessageTemplate(defaultTemplates[type] || '');
  };

  // ডাইনামিক ভেরিয়েবল রিপ্লেস করে নির্দিষ্ট কাস্টমারের জন্য মেসেজ প্রস্তুত করা
  const generateMessageForOrder = (order, rawTemplate) => {
    const dueAmount = order.DueAmount !== undefined 
      ? order.DueAmount 
      : (order.dueAmount !== undefined ? order.dueAmount : (order.TotalAmount || 0));
    const totalAmount = order.TotalAmount || 0;

    return rawTemplate
      .replace(/{customerName}/g, order.CustomerName || 'গ্রাহক')
      .replace(/{orderNumber}/g, order.OrderNumber || order.OrderID || '')
      .replace(/{courierName}/g, order.CourierName || 'Steadfast')
      .replace(/{trackingId}/g, order.TrackingID || 'বুকিং প্রক্রিয়াধীন')
      .replace(/{dueAmount}/g, `${currencySymbol}${dueAmount}`)
      .replace(/{totalAmount}/g, `${currencySymbol}${totalAmount}`)
      .replace(/{storeName}/g, storeName);
  };

  if (!isOpen) return null;

  // সব সিলেক্ট করা অর্ডারে বাল্ক SMS পাঠানো
  const handleSendAllSms = async () => {
    if (!messageTemplate.trim()) return;

    setIsSending(true);
    const newLogs = { ...sendLogs };

    for (let i = 0; i < selectedOrders.length; i++) {
      const order = selectedOrders[i];
      const phone = order.CustomerPhone || '';
      if (!phone) {
        newLogs[order.OrderID] = 'Failed (ফোন নম্বর নেই)';
        setSendLogs({ ...newLogs });
        continue;
      }

      newLogs[order.OrderID] = 'Sending';
      setSendLogs({ ...newLogs });

      const finalMsg = generateMessageForOrder(order, messageTemplate);

      try {
        if (onSendSmsNotification) {
          const res = await onSendSmsNotification({
            orderId: order.OrderID,
            phone: phone,
            message: finalMsg
          });

          if (res?.success) {
            newLogs[order.OrderID] = 'Sent';
          } else {
            newLogs[order.OrderID] = res?.message ? `Failed: ${res.message}` : 'Failed';
          }
        } else {
          newLogs[order.OrderID] = 'Sent (Mock)';
        }
      } catch (err) {
        newLogs[order.OrderID] = `Failed: ${err.message}`;
      }

      setSendLogs({ ...newLogs });
    }

    setIsSending(false);
  };

  // WhatsApp Click-to-Chat ওপেন করা
  const openWhatsApp = (order) => {
    const phone = String(order.CustomerPhone || '').replace(/[^0-9]/g, '');
    let cleanPhone = phone;
    if (cleanPhone.startsWith('0')) cleanPhone = '88' + cleanPhone;
    else if (!cleanPhone.startsWith('88')) cleanPhone = '88' + cleanPhone;

    const text = generateMessageForOrder(order, messageTemplate);
    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  // ক্লিপবোর্ডে কপি
  const handleCopyText = (order) => {
    const text = generateMessageForOrder(order, messageTemplate);
    navigator.clipboard?.writeText(text);
    setCopiedOrderId(order.OrderID);
    setTimeout(() => setCopiedOrderId(null), 2000);
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl shadow-2xl border border-slate-200/90 max-w-3xl w-full overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-150 relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* হেডার ব্যানার */}
        <div className="p-4 sm:p-5 border-b border-violet-100 bg-gradient-to-r from-violet-700 via-purple-700 to-indigo-700 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3.5">
            <div className="w-11 h-11 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center text-white border border-white/20 shadow-xs">
              <MessageSquare className="w-6 h-6 text-violet-200" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-tight">
                  বাল্ক SMS ও WhatsApp নোটিফিকেশন ইঞ্জিন
                </h2>
                <span className="px-2 py-0.5 bg-violet-500/40 text-violet-100 text-[10px] font-black rounded-full border border-white/20">
                  {selectedOrders.length} টি কাস্টমার
                </span>
              </div>
              <p className="text-xs text-violet-100/90">
                এক ক্লিকে স্বয়ংক্রিয় SMS পাঠান বা সরাসরি WhatsApp চ্যাটে ট্র্যাকিং মেসেজ ফরোয়ার্ড করুন
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* কনটেন্ট বডি */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          
          {/* টেমপ্লেট নির্বাচন বাটন */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              মেসেজের ধরন নির্বাচন করুন:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: 'courier', label: '🚚 কুরিয়ার ট্র্যাকিং' },
                { id: 'order', label: '✓ অর্ডার কনফার্ম' },
                { id: 'delivered', label: '🎁 ডেলিভারি সম্পন্ন' },
                { id: 'custom', label: '✏️ কাস্টম বার্তা' }
              ].map(t => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => handleTemplateChange(t.id)}
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition-all text-center border cursor-pointer ${
                    templateType === t.id
                      ? 'bg-violet-600 text-white border-violet-600 shadow-md shadow-violet-600/20'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* টেমপ্লেট এডিটর টেক্সটএরিয়া */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700">
              <span>মেসেজ টেমপ্লেট (ডাইনামিক কোড সহ)</span>
              <span className="text-[11px] text-slate-400 font-mono">দৈর্ঘ্য: {messageTemplate.length} অক্ষর</span>
            </div>
            <textarea
              rows={3}
              value={messageTemplate}
              onChange={(e) => setMessageTemplate(e.target.value)}
              className="w-full p-3 text-xs bg-slate-50 focus:bg-white border border-slate-300 rounded-2xl font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-violet-500 leading-relaxed"
            />
            
            {/* ভেরিয়েবল ট্যাগ চিপস */}
            <div className="flex items-center flex-wrap gap-1.5 pt-1">
              <span className="text-[10px] font-bold text-slate-400">ট্যাগ ক্লিক করে ইনসার্ট করুন:</span>
              {[
                '{customerName}', '{orderNumber}', '{courierName}', '{trackingId}', '{dueAmount}', '{storeName}'
              ].map(tag => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setMessageTemplate(prev => prev + ' ' + tag)}
                  className="px-2 py-0.5 bg-violet-50 hover:bg-violet-100 text-violet-700 text-[10px] font-mono font-bold rounded-md border border-violet-200 transition-colors cursor-pointer"
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {/* কাস্টমারদের জন্য প্রিভিউ ও অ্যাকশন লিস্ট */}
          <div className="space-y-2">
            <span className="text-xs font-black text-slate-800 block">
              কাস্টমার প্রিভিউ তালিকা ({selectedOrders.length} টি)
            </span>

            <div className="border border-slate-200 rounded-2xl divide-y divide-slate-100 max-h-72 overflow-y-auto">
              {selectedOrders.map((ord) => {
                const previewMsg = generateMessageForOrder(ord, messageTemplate);
                const status = sendLogs[ord.OrderID];

                return (
                  <div key={ord.OrderID} className="p-3.5 hover:bg-slate-50/70 transition-colors space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <strong className="text-xs font-black text-slate-900">{ord.CustomerName}</strong>
                        <span className="text-[11px] font-mono text-slate-500 font-bold">{ord.CustomerPhone}</span>
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md text-[10px] font-mono">
                          {ord.OrderID}
                        </span>
                      </div>

                      {/* স্ট্যাটাস ব্যাজ */}
                      <div>
                        {status === 'Sent' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-black rounded-full">
                            <Check className="w-3 h-3" />
                            <span>SMS সফল</span>
                          </span>
                        )}
                        {status === 'Sending' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-bold rounded-full animate-pulse">
                            <RefreshCw className="w-3 h-3 animate-spin" />
                            <span>পাঠানো হচ্ছে...</span>
                          </span>
                        )}
                        {status && status.startsWith('Failed') && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-rose-100 text-rose-800 text-[10px] font-bold rounded-full" title={status}>
                            <AlertCircle className="w-3 h-3" />
                            <span>ব্যর্থ</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* লাইভ পারসোনালাইজড মেসেজ বক্স */}
                    <div className="p-2.5 bg-slate-100/70 rounded-xl text-[11px] text-slate-700 leading-relaxed font-sans border border-slate-200/60 flex items-start justify-between gap-2">
                      <p className="flex-1">{previewMsg}</p>
                      
                      <div className="flex items-center space-x-1 shrink-0 pt-0.5">
                        <button
                          type="button"
                          onClick={() => handleCopyText(ord)}
                          title="মেসেজ কপি করুন"
                          className="p-1 hover:bg-slate-200 rounded-lg text-slate-600 transition-colors cursor-pointer"
                        >
                          {copiedOrderId === ord.OrderID ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => openWhatsApp(ord)}
                          title="সরাসরি হোয়াটসঅ্যাপে পাঠান"
                          className="p-1 hover:bg-emerald-100 text-emerald-700 rounded-lg transition-colors cursor-pointer"
                        >
                          <Smartphone className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

        {/* ফুটার অ্যাকশন বার */}
        <div className="p-4 border-t border-slate-200 bg-slate-50/80 flex items-center justify-between shrink-0">
          <span className="text-xs text-slate-500">
            SMS API গেটওয়ে: <strong className="text-slate-800">{settings?.SmsProvider || 'Greenweb'}</strong>
          </span>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 text-slate-700 text-xs font-bold rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
            >
              বন্ধ করুন
            </button>

            <button
              type="button"
              onClick={handleSendAllSms}
              disabled={isSending || selectedOrders.length === 0}
              className="px-5 py-2.5 bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 disabled:opacity-50 text-white text-xs font-black rounded-xl shadow-lg shadow-violet-600/25 transition-all flex items-center space-x-2 cursor-pointer active:scale-95"
            >
              {isSending ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>SMS পাঠানো হচ্ছে...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>সবাইকে SMS পাঠান ({selectedOrders.length})</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

