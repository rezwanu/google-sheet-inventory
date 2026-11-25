import React, { useState, useMemo } from 'react';
import {
  X,
  MessageSquare,
  Send,
  Smartphone,
  AlertCircle,
  RefreshCw,
  Copy,
  Check,
  Truck,
  Package,
  Edit3
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
      className="fixed inset-0 z-50 overflow-y-auto bg-neutral-900/40 flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg border border-neutral-200/80 max-w-3xl w-full overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-150 relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* হেডার ব্যানার */}
        <div className="p-4 sm:p-5 border-b border-neutral-200/80 bg-[#FAFAFA] text-[#111111] flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3.5">
            <div className="w-10 h-10 rounded-md bg-white border border-neutral-200/80 flex items-center justify-center text-[#0F172A] shrink-0">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base sm:text-lg font-semibold tracking-tight text-[#111111]">
                  বাল্ক SMS ও WhatsApp নোটিফিকেশন ইঞ্জিন
                </h2>
                <span className="px-2 py-0.5 bg-white text-[#111111] text-[10px] font-mono tabular-nums font-medium rounded-md border border-neutral-200/80">
                  {selectedOrders.length} টি কাস্টমার
                </span>
              </div>
              <p className="text-xs text-[#525252] mt-0.5">
                এক ক্লিকে স্বয়ংক্রিয় SMS পাঠান বা সরাসরি WhatsApp চ্যাটে ট্র্যাকিং মেসেজ ফরোয়ার্ড করুন
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
          
          {/* টেমপ্লেট নির্বাচন বাটন */}
          <div>
            <label className="block text-xs font-medium text-[#525252] mb-1.5">
              মেসেজের ধরন নির্বাচন করুন:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: 'courier', label: 'কুরিয়ার ট্র্যাকিং', icon: Truck },
                { id: 'order', label: 'অর্ডার কনফার্ম', icon: Check },
                { id: 'delivered', label: 'ডেলিভারি সম্পন্ন', icon: Package },
                { id: 'custom', label: 'কাস্টম বার্তা', icon: Edit3 }
              ].map(t => {
                const Icon = t.icon;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => handleTemplateChange(t.id)}
                    className={`min-h-[44px] sm:min-h-[36px] px-3 py-2 rounded-md text-xs font-medium transition-colors text-center border cursor-pointer flex items-center justify-center gap-1.5 ${
                      templateType === t.id
                        ? 'border-[#0F172A] bg-[#0F172A] text-white'
                        : 'bg-white text-[#525252] border-neutral-200/80 hover:bg-[#F5F5F5] hover:text-[#111111]'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5 shrink-0" />
                    <span>{t.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* টেমপ্লেট এডিটর টেক্সটএরিয়া */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-medium text-[#111111]">
              <span>মেসেজ টেমপ্লেট (ডাইনামিক কোড সহ)</span>
              <span className="text-[11px] text-[#737373] font-mono tabular-nums">দৈর্ঘ্য: {messageTemplate.length} অক্ষর</span>
            </div>
            <textarea
              rows={3}
              value={messageTemplate}
              onChange={(e) => setMessageTemplate(e.target.value)}
              className="w-full p-3 text-xs bg-[#FAFAFA] focus:bg-white border border-neutral-200/80 rounded-md font-medium text-[#111111] focus:outline-none focus:border-[#0F172A] focus:ring-1 focus:ring-[#0F172A] leading-relaxed"
            />
            
            {/* ভেরিয়েবল ট্যাগ চিপস */}
            <div className="flex items-center flex-wrap gap-1.5 pt-1">
              <span className="text-[10px] font-medium text-[#737373]">ট্যাগ ক্লিক করে ইনসার্ট করুন:</span>
              {[
                '{customerName}', '{orderNumber}', '{courierName}', '{trackingId}', '{dueAmount}', '{storeName}'
              ].map(tag => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setMessageTemplate(prev => prev + ' ' + tag)}
                  className="min-h-[44px] sm:min-h-[36px] px-2 py-1 bg-[#F5F5F5] hover:bg-neutral-200/70 text-[#0F172A] text-[10px] font-mono font-medium rounded-md border border-neutral-200/80 transition-colors cursor-pointer"
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {/* কাস্টমারদের জন্য প্রিভিউ ও অ্যাকশন লিস্ট */}
          <div className="space-y-2">
            <span className="text-xs font-semibold text-[#111111] block">
              কাস্টমার প্রিভিউ তালিকা (<span className="font-mono tabular-nums">{selectedOrders.length}</span> টি)
            </span>

            <div className="border border-neutral-200/80 rounded-lg divide-y divide-neutral-200/80 max-h-72 overflow-y-auto">
              {selectedOrders.map((ord) => {
                const previewMsg = generateMessageForOrder(ord, messageTemplate);
                const status = sendLogs[ord.OrderID];

                return (
                  <div key={ord.OrderID} className="p-3.5 hover:bg-[#FAFAFA] transition-colors space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center flex-wrap gap-2">
                        <strong className="text-xs font-semibold text-[#111111]">{ord.CustomerName}</strong>
                        <span className="text-[11px] font-mono tabular-nums text-[#525252] font-medium">{ord.CustomerPhone}</span>
                        <span className="px-2 py-0.5 bg-[#F5F5F5] text-[#525252] border border-neutral-200/80 rounded-md text-[10px] font-mono tabular-nums">
                          {ord.OrderID}
                        </span>
                      </div>

                      {/* স্ট্যাটাস ব্যাজ */}
                      <div>
                        {status === 'Sent' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-[#15803D] border border-emerald-200/80 text-[10px] font-medium rounded-md">
                            <Check className="w-3 h-3" />
                            <span>SMS সফল</span>
                          </span>
                        )}
                        {status === 'Sending' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-[#B45309] border border-amber-200/80 text-[10px] font-medium rounded-md">
                            <RefreshCw className="w-3 h-3 animate-spin" />
                            <span>পাঠানো হচ্ছে...</span>
                          </span>
                        )}
                        {status && status.startsWith('Failed') && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-50 text-[#B91C1C] border border-red-200/80 text-[10px] font-medium rounded-md" title={status}>
                            <AlertCircle className="w-3 h-3" />
                            <span>ব্যর্থ</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* লাইভ পারসোনালাইজড মেসেজ বক্স */}
                    <div className="p-2.5 bg-[#F5F5F5] rounded-md text-[11px] text-[#111111] leading-relaxed font-sans border border-neutral-200/80 flex items-start justify-between gap-2">
                      <p className="flex-1">{previewMsg}</p>
                      
                      <div className="flex items-center space-x-1 shrink-0 pt-0.5">
                        <button
                          type="button"
                          onClick={() => handleCopyText(ord)}
                          title="মেসেজ কপি করুন"
                          className="min-h-[44px] sm:min-h-[36px] min-w-[44px] sm:min-w-[36px] p-1.5 hover:bg-neutral-200/70 rounded-md text-[#525252] transition-colors cursor-pointer flex items-center justify-center"
                        >
                          {copiedOrderId === ord.OrderID ? (
                            <Check className="w-3.5 h-3.5 text-[#15803D]" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => openWhatsApp(ord)}
                          title="সরাসরি হোয়াটসঅ্যাপে পাঠান"
                          className="min-h-[44px] sm:min-h-[36px] min-w-[44px] sm:min-w-[36px] p-1.5 hover:bg-emerald-50 text-[#15803D] rounded-md transition-colors cursor-pointer flex items-center justify-center"
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
        <div className="p-4 border-t border-neutral-200/80 bg-[#FAFAFA] flex flex-wrap items-center justify-between gap-3 shrink-0">
          <span className="text-xs text-[#525252]">
            SMS API গেটওয়ে: <strong className="text-[#111111] font-medium">{settings?.SmsProvider || 'Greenweb'}</strong>
          </span>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] sm:min-h-[36px] px-4 py-2 border border-neutral-200/80 bg-white text-[#111111] text-xs font-medium rounded-md hover:bg-[#F5F5F5] transition-colors cursor-pointer"
            >
              বন্ধ করুন
            </button>

            <button
              type="button"
              onClick={handleSendAllSms}
              disabled={isSending || selectedOrders.length === 0}
              className="min-h-[44px] sm:min-h-[36px] px-5 py-2 bg-[#0F172A] hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-medium rounded-md transition-colors flex items-center space-x-2 cursor-pointer"
            >
              {isSending ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>SMS পাঠানো হচ্ছে...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>সবাইকে SMS পাঠান (<span className="font-mono tabular-nums">{selectedOrders.length}</span>)</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
