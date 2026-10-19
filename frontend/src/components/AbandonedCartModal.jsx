import React, { useState, useMemo } from 'react';
import {
  X,
  Search,
  ShoppingCart,
  Phone,
  MessageCircle,
  MessageSquare,
  ArrowRight,
  Clock,
  CheckCircle,
  AlertCircle,
  Trash2,
  ExternalLink,
  RefreshCw,
  ShoppingBag,
  DollarSign,
  User,
  Calendar,
  Send,
  Sparkles
} from 'lucide-react';

export default function AbandonedCartModal({
  isOpen,
  onClose,
  abandonedCarts = [],
  settings = {},
  onUpdateCartStatus,
  onConvertToOrder,
  onDeleteCart,
  onSendSms,
  currencySymbol = '৳',
  showToast
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatusTab, setSelectedStatusTab] = useState('all'); // 'all' | 'pending' | 'contacted' | 'recovered'
  const [selectedCartDetails, setSelectedCartDetails] = useState(null);

  const storeName = settings?.StoreName || settings?.storeName || 'আমাদের স্টোর';

  // KPI হিসাব-নিকাশ
  const stats = useMemo(() => {
    const list = Array.isArray(abandonedCarts) ? abandonedCarts : [];
    const totalCarts = list.length;
    const pendingCarts = list.filter(c => (c.RecoveryStatus || 'Pending') === 'Pending');
    const contactedCarts = list.filter(c => c.RecoveryStatus === 'Contacted');
    const recoveredCarts = list.filter(c => c.RecoveryStatus === 'Recovered');
    const pendingRevenue = pendingCarts.reduce((sum, c) => sum + (Number(c.TotalAmount) || 0), 0);
    const recoveredRevenue = recoveredCarts.reduce((sum, c) => sum + (Number(c.TotalAmount) || 0), 0);

    return {
      totalCarts,
      pendingCount: pendingCarts.length,
      contactedCount: contactedCarts.length,
      recoveredCount: recoveredCarts.length,
      pendingRevenue,
      recoveredRevenue
    };
  }, [abandonedCarts]);

  // ফিল্টারকৃত কার্ট তালিকা
  const filteredCarts = useMemo(() => {
    let list = Array.isArray(abandonedCarts) ? [...abandonedCarts] : [];

    // স্ট্যাটাস ফিল্টার
    if (selectedStatusTab === 'pending') {
      list = list.filter(c => (c.RecoveryStatus || 'Pending') === 'Pending');
    } else if (selectedStatusTab === 'contacted') {
      list = list.filter(c => c.RecoveryStatus === 'Contacted');
    } else if (selectedStatusTab === 'recovered') {
      list = list.filter(c => c.RecoveryStatus === 'Recovered');
    }

    // সার্চ ফিল্টার
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(c => 
        String(c.CartID || '').toLowerCase().includes(q) ||
        String(c.CustomerPhone || '').toLowerCase().includes(q) ||
        String(c.CustomerName || '').toLowerCase().includes(q)
      );
    }

    return list.sort((a, b) => new Date(b.Timestamp || 0) - new Date(a.Timestamp || 0));
  }, [abandonedCarts, selectedStatusTab, searchQuery]);

  // কার্টের আইটেম পার্সার
  const parseCartItems = (rawItems) => {
    if (!rawItems) return [];
    if (Array.isArray(rawItems)) return rawItems;
    try {
      const parsed = JSON.parse(rawItems);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  };

  // WhatsApp রিকভারি মেসেজ জেনারেটর
  const handleWhatsAppRecovery = (cart) => {
    const rawPhone = String(cart.CustomerPhone || '').replace(/[^0-9]/g, '');
    if (!rawPhone) {
      if (showToast) showToast('গ্রাহকের ফোন নম্বর পাওয়া যায়নি।', 'error');
      return;
    }

    let phone = rawPhone;
    if (phone.startsWith('01')) {
      phone = '88' + phone;
    } else if (!phone.startsWith('880')) {
      phone = '880' + phone;
    }

    const items = parseCartItems(cart.CartItemsJSON);
    const itemNames = items.map(it => `${it.productName || it.ProductName || 'পণ্য'} (${it.quantity || it.Quantity || 1}টি)`).join(', ');
    const amount = Number(cart.TotalAmount || 0).toLocaleString();

    const text = `আসসালামু আলাইকুম ${cart.CustomerName || 'গ্রাহক'},\n${storeName}-এ আপনার সিলেক্ট করা পছন্দের পণ্যগুলো ব্যাগে রয়ে গেছে:\n🛍️ পণ্য: ${itemNames || 'আপনার কার্টের পণ্য'}\n💰 মোট মূল্য: ${currencySymbol}${amount}\n\nআপনার অর্ডারটি কি আমরা কনফার্ম করব? অর্ডার সম্পন্ন করতে সরাসরি আমাদের এই নম্বরে রিপ্লাই দিন। ধন্যবাদ!`;

    const url = `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');

    // স্ট্যাটাস Contacted এ আপডেট করা
    if (onUpdateCartStatus && cart.RecoveryStatus !== 'Recovered') {
      onUpdateCartStatus(cart.CartID, 'Contacted', 'WhatsApp এ রিকভারি মেসেজ পাঠানো হয়েছে।');
    }
  };

  // SMS রিকভারি হ্যান্ডলার
  const handleSmsRecovery = (cart) => {
    const rawPhone = String(cart.CustomerPhone || '').replace(/[^0-9]/g, '');
    if (!rawPhone) {
      if (showToast) showToast('গ্রাহকের ফোন নম্বর পাওয়া যায়নি।', 'error');
      return;
    }

    const amount = Number(cart.TotalAmount || 0).toLocaleString();
    const message = `প্রিয় গ্রাহক, ${storeName}-এ আপনার ${currencySymbol}${amount} টাকার অসম্পূর্ণ অর্ডারটি সম্পন্ন করতে আমাদের সাথে যোগাযোগ করুন। ধন্যবাদ!`;

    if (onSendSms) {
      onSendSms(rawPhone, message);
    } else {
      window.open(`sms:${rawPhone}?body=${encodeURIComponent(message)}`, '_blank');
    }

    if (onUpdateCartStatus && cart.RecoveryStatus !== 'Recovered') {
      onUpdateCartStatus(cart.CartID, 'Contacted', 'SMS এর মাধ্যমে রিকভারি নোটিফিকেশন পাঠানো হয়েছে।');
    }
  };

  // অর্ডারে রূপান্তর (Convert to Order)
  const handleConvert = (cart) => {
    if (onConvertToOrder) {
      onConvertToOrder(cart);
      if (showToast) showToast(`কার্ট #${cart.CartID} অর্ডারে রূপান্তর করতে লোড করা হয়েছে!`, 'success');
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden border border-slate-200">
        
        {/* Modal Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 text-white flex items-center justify-between shadow-md">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/10 rounded-xl backdrop-blur-md border border-white/20">
              <ShoppingBag className="w-6 h-6 text-amber-200" />
            </div>
            <div>
              <h2 className="text-xl font-bold flex items-center gap-2">
                ড্রপ-অফ ও অসম্পূর্ণ কার্ট রিকভারি
                <span className="text-xs bg-amber-400 text-slate-900 font-bold px-2.5 py-0.5 rounded-full shadow-sm">
                  {stats.pendingCount} টি অপেক্ষমাণ
                </span>
              </h2>
              <p className="text-xs text-amber-100 mt-0.5">
                যেসব ক্রেতা চেকআউট সম্পূর্ণ না করে ফিরে গেছেন তাদের সরাসরি WhatsApp ও SMS পাঠিয়ে অর্ডার রিকভার করুন
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Top KPI Cards */}
        <div className="p-5 bg-slate-50 border-b border-slate-200 grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <div className="text-xs text-slate-500 font-medium">মোট ড্রপ-অফ</div>
              <div className="text-xl font-bold text-slate-800 mt-0.5">{stats.totalCarts} টি</div>
            </div>
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-lg">
              <ShoppingCart className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-amber-200 shadow-sm flex items-center justify-between">
            <div>
              <div className="text-xs text-amber-600 font-medium">অপেক্ষমাণ রিকভারি</div>
              <div className="text-xl font-bold text-amber-700 mt-0.5">{stats.pendingCount} টি</div>
            </div>
            <div className="p-2.5 bg-amber-50 text-amber-600 rounded-lg">
              <Clock className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-emerald-200 shadow-sm flex items-center justify-between">
            <div>
              <div className="text-xs text-emerald-600 font-medium">সফল রিকভারি</div>
              <div className="text-xl font-bold text-emerald-700 mt-0.5">{stats.recoveredCount} টি</div>
            </div>
            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-lg">
              <CheckCircle className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-purple-200 shadow-sm flex items-center justify-between">
            <div>
              <div className="text-xs text-purple-600 font-medium">সম্ভাব্য রাজস্ব উদ্ধার</div>
              <div className="text-xl font-bold text-purple-700 mt-0.5">
                {currencySymbol}{stats.pendingRevenue.toLocaleString()}
              </div>
            </div>
            <div className="p-2.5 bg-purple-50 text-purple-600 rounded-lg">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Toolbar: Search & Filter Tabs */}
        <div className="px-6 py-3 border-b border-slate-200 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl overflow-x-auto">
            <button
              onClick={() => setSelectedStatusTab('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                selectedStatusTab === 'all'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              সব ({stats.totalCarts})
            </button>
            <button
              onClick={() => setSelectedStatusTab('pending')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 ${
                selectedStatusTab === 'pending'
                  ? 'bg-amber-500 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              পেন্ডিং ({stats.pendingCount})
            </button>
            <button
              onClick={() => setSelectedStatusTab('contacted')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                selectedStatusTab === 'contacted'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              যোগাযোগকৃত ({stats.contactedCount})
            </button>
            <button
              onClick={() => setSelectedStatusTab('recovered')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                selectedStatusTab === 'recovered'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              রিকভার্ড ({stats.recoveredCount})
            </button>
          </div>

          {/* Search Box */}
          <div className="relative min-w-[240px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="মোবাইল, নাম বা কার্ট আইডি..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {filteredCarts.length === 0 ? (
            <div className="text-center py-16 px-4">
              <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto text-amber-500 mb-3 border border-amber-100">
                <ShoppingCart className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold text-slate-800">কোনো ড্রপ-অফ কার্ট পাওয়া যায়নি</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                গ্রাহকরা চেকআউট পেজে মোবাইল নম্বর দেওয়ার পর যদি অর্ডার সম্পন্ন না করে ফিরে যান, তবে তা স্বয়ংক্রিয়ভাবে এখানে তালিকাভুক্ত হবে।
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredCarts.map((cart) => {
                const items = parseCartItems(cart.CartItemsJSON);
                const isPending = (cart.RecoveryStatus || 'Pending') === 'Pending';
                const isContacted = cart.RecoveryStatus === 'Contacted';
                const isRecovered = cart.RecoveryStatus === 'Recovered';

                return (
                  <div
                    key={cart.CartID}
                    className={`bg-white rounded-xl border p-4.5 shadow-sm transition-all hover:shadow-md flex flex-col justify-between ${
                      isRecovered
                        ? 'border-emerald-200 bg-emerald-50/20'
                        : isContacted
                        ? 'border-blue-200'
                        : 'border-amber-200 hover:border-amber-400'
                    }`}
                  >
                    <div>
                      {/* Card Header */}
                      <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded">
                              #{cart.CartID}
                            </span>
                            <span
                              className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                                isRecovered
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : isContacted
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {isRecovered ? 'রিকভার্ড' : isContacted ? 'যোগাযোগকৃত' : 'অপেক্ষমাণ'}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-1.5">
                            <Clock className="w-3 h-3" />
                            {cart.Timestamp ? new Date(cart.Timestamp).toLocaleString('bn-BD', {
                              month: 'short',
                              day: 'numeric',
                              hour: 'numeric',
                              minute: 'numeric',
                              hour12: true
                            }) : 'তারিখ নেই'}
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="text-base font-extrabold text-slate-900">
                            {currencySymbol}{Number(cart.TotalAmount || 0).toLocaleString()}
                          </div>
                          <div className="text-[10px] text-slate-500 mt-0.5">
                            {items.length} টি আইটেম
                          </div>
                        </div>
                      </div>

                      {/* Customer Details */}
                      <div className="py-3 border-b border-slate-100 space-y-1.5">
                        <div className="flex items-center gap-2 text-xs font-semibold text-slate-800">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          <span>{cart.CustomerName || 'Online Visitor'}</span>
                        </div>
                        {cart.CustomerPhone && (
                          <div className="flex items-center gap-2 text-xs font-mono text-slate-600">
                            <Phone className="w-3.5 h-3.5 text-slate-400" />
                            <span>{cart.CustomerPhone}</span>
                          </div>
                        )}
                        {cart.CustomerAddress && (
                          <div className="text-[11px] text-slate-500 pl-5">
                            ঠিকানা: {cart.CustomerAddress}
                          </div>
                        )}
                      </div>

                      {/* Cart Items Summary */}
                      <div className="py-3 border-b border-slate-100">
                        <div className="text-[11px] font-semibold text-slate-600 mb-1.5">
                          কার্টের পণ্য তালিকা:
                        </div>
                        <div className="space-y-1 max-h-24 overflow-y-auto pr-1">
                          {items.length === 0 ? (
                            <div className="text-[11px] text-slate-400 italic">কোনো আইটেম ডাটা নেই</div>
                          ) : (
                            items.map((it, idx) => (
                              <div
                                key={idx}
                                className="flex items-center justify-between text-xs bg-slate-50 px-2 py-1 rounded border border-slate-100"
                              >
                                <span className="truncate max-w-[200px] text-slate-700">
                                  {it.productName || it.ProductName || 'পণ্য'}
                                </span>
                                <span className="font-semibold text-slate-800 shrink-0">
                                  {it.quantity || it.Quantity || 1} x {currencySymbol}{Number(it.sellingPrice || it.SellingPrice || it.price || 0).toLocaleString()}
                                </span>
                              </div>
                            ))
                          )}
                        </div>
                      </div>

                      {/* Notes & Last Contact */}
                      {cart.Notes && (
                        <div className="mt-2 text-[11px] text-amber-800 bg-amber-50/80 p-2 rounded border border-amber-100">
                          💡 {cart.Notes}
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="pt-3.5 mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100">
                      <div className="flex items-center gap-1.5">
                        {/* 1-Click WhatsApp Recovery */}
                        <button
                          onClick={() => handleWhatsAppRecovery(cart)}
                          className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
                          title="WhatsApp মেসেজ পাঠিয়ে ফলো-আপ করুন"
                        >
                          <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                          <span>WhatsApp</span>
                        </button>

                        {/* 1-Click SMS Recovery */}
                        <button
                          onClick={() => handleSmsRecovery(cart)}
                          className="px-2.5 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
                          title="SMS পাঠিয়ে ফলো-আপ করুন"
                        >
                          <MessageSquare className="w-3.5 h-3.5 text-purple-600" />
                          <span>SMS</span>
                        </button>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {/* Convert to Order */}
                        <button
                          onClick={() => handleConvert(cart)}
                          className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
                          title="এই কার্টটিকে সরাসরি বর্তমান চেকআউটে লোড করুন"
                        >
                          <span>অর্ডারে রূপান্তর</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>

                        {/* Delete Cart */}
                        {onDeleteCart && (
                          <button
                            onClick={() => {
                              if (window.confirm('আপনি কি নিশ্চিত যে এই অসম্পূর্ণ কার্ট রেকর্ডটি মুছে ফেলতে চান?')) {
                                onDeleteCart(cart.CartID);
                              }
                            }}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="মুছে ফেলুন"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>

                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <div className="text-xs text-slate-500">
            প্রদর্শিত হচ্ছে <span className="font-bold text-slate-700">{filteredCarts.length}</span> টি কার্ট
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-xl transition-colors"
          >
            বন্ধ করুন
          </button>
        </div>

      </div>
    </div>
  );
}

