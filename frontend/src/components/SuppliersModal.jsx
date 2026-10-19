import React, { useState, useMemo } from 'react';
import {
  Truck,
  Plus,
  Search,
  Phone,
  Mail,
  MapPin,
  Building2,
  DollarSign,
  CreditCard,
  X,
  Edit2,
  Trash2,
  Send,
  FileText,
  CheckCircle,
  AlertCircle,
  User,
  History,
  TrendingUp,
  Receipt
} from 'lucide-react';

export default function SuppliersModal({
  isOpen,
  onClose,
  suppliers = [],
  supplierLedger = [],
  currencySymbol = '৳',
  onSaveSupplier,
  onDeleteSupplier,
  onRecordPayment,
  onOpenPurchaseOrderModal,
  showToast
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSupplierForLedger, setSelectedSupplierForLedger] = useState(null);
  const [isLedgerModalOpen, setIsLedgerModalOpen] = useState(false);

  // নতুন বা এডিট সাপ্লায়ার ফর্ম স্টেট
  const [isEditing, setIsEditing] = useState(false);
  const [supplierForm, setSupplierForm] = useState({
    SupplierID: '',
    CompanyName: '',
    ContactPerson: '',
    Phone: '',
    Email: '',
    Address: '',
    Notes: ''
  });

  // পেমেন্ট মডাল স্টেট
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentSupplier, setPaymentSupplier] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [paymentTrxId, setPaymentTrxId] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);

  // ফিল্টার করা সাপ্লায়ার তালিকা
  const filteredSuppliers = useMemo(() => {
    const list = Array.isArray(suppliers) ? suppliers : [];
    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase().trim();
    return list.filter(s =>
      (s.CompanyName && s.CompanyName.toLowerCase().includes(q)) ||
      (s.ContactPerson && s.ContactPerson.toLowerCase().includes(q)) ||
      (s.Phone && s.Phone.includes(q)) ||
      (s.SupplierID && s.SupplierID.toLowerCase().includes(q))
    );
  }, [suppliers, searchQuery]);

  // সারাংশ হিসাব (KPIs)
  const totalSuppliersCount = Array.isArray(suppliers) ? suppliers.length : 0;
  const totalPayableAmount = useMemo(() => {
    return (Array.isArray(suppliers) ? suppliers : []).reduce(
      (sum, s) => sum + (Number(s.CurrentPayable) || 0),
      0
    );
  }, [suppliers]);

  const totalPaidAmount = useMemo(() => {
    return (Array.isArray(suppliers) ? suppliers : []).reduce(
      (sum, s) => sum + (Number(s.TotalPaid) || 0),
      0
    );
  }, [suppliers]);

  const totalPurchasedAmount = useMemo(() => {
    return (Array.isArray(suppliers) ? suppliers : []).reduce(
      (sum, s) => sum + (Number(s.TotalPurchased) || 0),
      0
    );
  }, [suppliers]);

  if (!isOpen) return null;

  const handleOpenAddForm = () => {
    setSupplierForm({
      SupplierID: '',
      CompanyName: '',
      ContactPerson: '',
      Phone: '',
      Email: '',
      Address: '',
      Notes: ''
    });
    setIsEditing(true);
  };

  const handleOpenEditForm = (supplier) => {
    setSupplierForm({
      SupplierID: supplier.SupplierID || '',
      CompanyName: supplier.CompanyName || '',
      ContactPerson: supplier.ContactPerson || '',
      Phone: supplier.Phone || '',
      Email: supplier.Email || '',
      Address: supplier.Address || '',
      Notes: supplier.Notes || ''
    });
    setIsEditing(true);
  };

  const handleSaveForm = (e) => {
    e.preventDefault();
    if (!supplierForm.CompanyName.trim() && !supplierForm.ContactPerson.trim()) {
      if (showToast) showToast('প্রতিষ্ঠানের নাম অথবা ব্যক্তির নাম প্রদান করুন।', 'warning');
      return;
    }
    if (onSaveSupplier) {
      onSaveSupplier(supplierForm);
    }
    setIsEditing(false);
  };

  const handleOpenPayment = (supplier) => {
    setPaymentSupplier(supplier);
    setPaymentAmount('');
    setPaymentMethod('Cash');
    setPaymentTrxId('');
    setPaymentNotes('');
    setIsPaymentModalOpen(true);
  };

  const handleSubmitPayment = async (e) => {
    e.preventDefault();
    const amount = Number(paymentAmount);
    if (!amount || amount <= 0) {
      if (showToast) showToast('সঠিক পেমেন্ট পরিমাণ প্রদান করুন।', 'warning');
      return;
    }
    if (!paymentSupplier) return;

    setIsSubmittingPayment(true);
    try {
      if (onRecordPayment) {
        await onRecordPayment({
          supplierId: paymentSupplier.SupplierID,
          amount: amount,
          paymentMethod: paymentMethod,
          trxId: paymentTrxId,
          notes: paymentNotes
        });
      }
      setIsPaymentModalOpen(false);
    } catch (err) {
      // Toast handled by parent
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  const handleOpenLedger = (supplier) => {
    setSelectedSupplierForLedger(supplier);
    setIsLedgerModalOpen(true);
  };

  const handleSendWhatsAppMemo = (supplier) => {
    if (!supplier.Phone) {
      if (showToast) showToast('সাপ্লায়ারের মোবাইল নম্বর নেই।', 'warning');
      return;
    }
    const cleanPhone = String(supplier.Phone).replace(/[^0-9]/g, '');
    const intlPhone = cleanPhone.startsWith('88') ? cleanPhone : `88${cleanPhone}`;
    const payable = Number(supplier.CurrentPayable) || 0;
    const paid = Number(supplier.TotalPaid) || 0;

    const message = `প্রিয় ${supplier.ContactPerson || supplier.CompanyName},\nআমাদের হিসাব অনুযায়ী আপনার সাথে লেনদেনের বর্তমান স্থিতি:\nমোট মাল ক্রয়: ${currencySymbol}${Number(supplier.TotalPurchased || 0).toLocaleString('en-IN')}\nমোট পরিশোধ: ${currencySymbol}${paid.toLocaleString('en-IN')}\nবর্তমান নেট বাকি: ${currencySymbol}${payable.toLocaleString('en-IN')}\n\nধন্যবাদান্তে।`;
    const waUrl = `https://wa.me/${intlPhone}?text=${encodeURIComponent(message)}`;
    window.open(waUrl, '_blank');
  };

  return (
    <div
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 z-[100] animate-in fade-in"
      style={{ zIndex: 100 }}
    >
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200/80 w-full max-w-6xl flex flex-col max-h-[90vh] my-auto overflow-hidden relative" style={{ zIndex: 101 }}>
        
        {/* ১. হেডার সেকশন */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 to-white shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/20">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                  সাপ্লায়ার ও ভেন্ডর ম্যানেজমেন্ট
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-indigo-50 text-indigo-700 border border-indigo-200">
                  {totalSuppliersCount} জন
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                পাইকারি ভেন্ডর প্রোফাইল, প্রকিউরমেন্ট বিলিং ও দেনার খাতা (Accounts Payable)
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleOpenAddForm}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm flex items-center space-x-1.5 cursor-pointer active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">নতুন সাপ্লায়ার</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ২. KPI সামারি মেট্রিক্স কার্ড */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-slate-50/70 border-b border-slate-100 shrink-0">
          <div className="bg-white p-3 rounded-2xl border border-slate-200/70 shadow-2xs">
            <span className="text-[11px] font-bold text-slate-500 flex items-center justify-between">
              <span>মোট সাপ্লায়ার</span>
              <Building2 className="w-4 h-4 text-slate-400" />
            </span>
            <p className="text-base sm:text-xl font-black text-slate-900 mt-1">
              {totalSuppliersCount} <span className="text-xs font-semibold text-slate-500">জন</span>
            </p>
          </div>

          <div className="bg-white p-3 rounded-2xl border border-slate-200/70 shadow-2xs">
            <span className="text-[11px] font-bold text-slate-500 flex items-center justify-between">
              <span>মোট ক্রয় (Purchases)</span>
              <TrendingUp className="w-4 h-4 text-indigo-500" />
            </span>
            <p className="text-base sm:text-xl font-black text-indigo-700 mt-1">
              {currencySymbol}{totalPurchasedAmount.toLocaleString('en-IN')}
            </p>
          </div>

          <div className="bg-white p-3 rounded-2xl border border-slate-200/70 shadow-2xs">
            <span className="text-[11px] font-bold text-slate-500 flex items-center justify-between">
              <span>মোট পরিশোধ (Paid)</span>
              <CheckCircle className="w-4 h-4 text-emerald-500" />
            </span>
            <p className="text-base sm:text-xl font-black text-emerald-700 mt-1">
              {currencySymbol}{totalPaidAmount.toLocaleString('en-IN')}
            </p>
          </div>

          <div className="bg-white p-3 rounded-2xl border border-rose-200/70 shadow-2xs bg-rose-50/30">
            <span className="text-[11px] font-bold text-rose-700 flex items-center justify-between">
              <span>বর্তমান দেনা (Payable)</span>
              <AlertCircle className="w-4 h-4 text-rose-600" />
            </span>
            <p className="text-base sm:text-xl font-black text-rose-700 mt-1">
              {currencySymbol}{totalPayableAmount.toLocaleString('en-IN')}
            </p>
          </div>
        </div>

        {/* ৩. সার্চ বার */}
        <div className="p-3 border-b border-slate-100 flex items-center space-x-3 shrink-0">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="কোম্পানি, ব্যক্তির নাম, ফোন বা সাপ্লায়ার আইডি দিয়ে খুঁজুন..."
              className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm font-medium border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 bg-slate-50/50"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* ৪. সাপ্লায়ার তালিকা (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {filteredSuppliers.length === 0 ? (
            <div className="text-center py-12">
              <Truck className="w-12 h-12 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-600">কোনো সাপ্লায়ার পাওয়া যায়নি</p>
              <p className="text-xs text-slate-400 mt-1">
                {searchQuery ? 'ভিন্ন কোনো নাম বা নম্বর দিয়ে খুঁজুন' : 'নতুন সাপ্লায়ার যুক্ত করতে ওপরের বাটনে ক্লিক করুন'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {filteredSuppliers.map((sup) => {
                const payable = Number(sup.CurrentPayable) || 0;
                const paid = Number(sup.TotalPaid) || 0;
                const purchased = Number(sup.TotalPurchased) || 0;

                return (
                  <div
                    key={sup.SupplierID || sup.Phone}
                    className="bg-white border border-slate-200/80 hover:border-indigo-300 rounded-2xl p-4 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between"
                  >
                    <div>
                      {/* টপ রো: নাম ও ব্যাজ */}
                      <div className="flex items-start justify-between">
                        <div className="min-w-0 flex-1">
                          <h3 className="text-sm sm:text-base font-black text-slate-900 truncate">
                            {sup.CompanyName || sup.ContactPerson}
                          </h3>
                          {sup.ContactPerson && sup.CompanyName && (
                            <p className="text-xs font-semibold text-slate-500 flex items-center space-x-1 mt-0.5">
                              <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span className="truncate">{sup.ContactPerson}</span>
                            </p>
                          )}
                        </div>

                        <div className="text-right shrink-0 ml-2">
                          {payable > 0 ? (
                            <span className="px-2.5 py-1 rounded-xl text-xs font-black bg-rose-50 text-rose-700 border border-rose-200/80 inline-block shadow-2xs">
                              দেনা: {currencySymbol}{payable.toLocaleString('en-IN')}
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/80 inline-block">
                              পরিশোধিত
                            </span>
                          )}
                        </div>
                      </div>

                      {/* যোগাযোগ ও ঠিকানা */}
                      <div className="mt-3 space-y-1 text-xs text-slate-600">
                        {sup.Phone && (
                          <div className="flex items-center space-x-2">
                            <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>{sup.Phone}</span>
                          </div>
                        )}
                        {sup.Email && (
                          <div className="flex items-center space-x-2">
                            <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="truncate">{sup.Email}</span>
                          </div>
                        )}
                        {sup.Address && (
                          <div className="flex items-center space-x-2">
                            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="truncate">{sup.Address}</span>
                          </div>
                        )}
                      </div>

                      {/* ফিন্যান্সিয়াল সারাংশ বার */}
                      <div className="mt-3 grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-xs">
                        <div>
                          <span className="text-[10px] text-slate-400 font-bold uppercase">মোট কেনা:</span>
                          <p className="font-bold text-slate-800">{currencySymbol}{purchased.toLocaleString('en-IN')}</p>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 font-bold uppercase">পরিশোধ:</span>
                          <p className="font-bold text-emerald-700">{currencySymbol}{paid.toLocaleString('en-IN')}</p>
                        </div>
                      </div>
                    </div>

                    {/* অ্যাকশন বাটনসমূহ */}
                    <div className="mt-3.5 pt-3 border-t border-slate-100 flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center space-x-1.5">
                        {payable > 0 && (
                          <button
                            onClick={() => handleOpenPayment(sup)}
                            className="px-2.5 py-1.5 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white text-xs font-bold rounded-lg transition-all flex items-center space-x-1 shadow-2xs cursor-pointer"
                          >
                            <DollarSign className="w-3.5 h-3.5" />
                            <span>পেমেন্ট দিন</span>
                          </button>
                        )}
                        <button
                          onClick={() => handleOpenLedger(sup)}
                          title="লেনদেনের লেজার খাতা দেখুন"
                          className="px-2.5 py-1.5 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 text-xs font-bold rounded-lg transition-all flex items-center space-x-1 cursor-pointer"
                        >
                          <History className="w-3.5 h-3.5" />
                          <span>লেজার</span>
                        </button>
                        {sup.Phone && (
                          <button
                            onClick={() => handleSendWhatsAppMemo(sup)}
                            title="হোয়াটসঅ্যাপে স্টেটমেন্ট পাঠান"
                            className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all cursor-pointer"
                          >
                            <Send className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => handleOpenEditForm(sup)}
                          title="সম্পাদনা করুন"
                          className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all cursor-pointer"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm(`আপনি কি '${sup.CompanyName || sup.ContactPerson}' সাপ্লায়ারকে মুছে ফেলতে চান?`)) {
                              if (onDeleteSupplier) onDeleteSupplier(sup.SupplierID);
                            }
                          }}
                          title="মুছে ফেলুন"
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ফুটার */}
        <div className="p-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <span>মোট {filteredSuppliers.length} জন সাপ্লায়ার প্রদর্শিত</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-xl transition-all cursor-pointer"
          >
            বন্ধ করুন
          </button>
        </div>

      </div>

      {/* ৫. নতুন / এডিট সাপ্লায়ার সাব-মডাল */}
      {isEditing && (
        <div
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-3 z-[110] animate-in fade-in"
          style={{ zIndex: 110 }}
        >
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="text-sm font-black text-slate-900">
                {supplierForm.SupplierID ? 'সাপ্লায়ার সম্পাদনা' : 'নতুন সাপ্লায়ার যুক্ত করুন'}
              </h3>
              <button
                onClick={() => setIsEditing(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveForm} className="p-5 space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  প্রতিষ্ঠানের নাম / কোম্পানির নাম *
                </label>
                <input
                  type="text"
                  required
                  value={supplierForm.CompanyName}
                  onChange={(e) => setSupplierForm({ ...supplierForm, CompanyName: e.target.value })}
                  placeholder="যেমন: মেঘনা গ্রুপ / প্রাণ পাইকারি ডিলার"
                  className="w-full px-3 py-2 text-xs font-medium border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    যোগাযোগের ব্যক্তির নাম
                  </label>
                  <input
                    type="text"
                    value={supplierForm.ContactPerson}
                    onChange={(e) => setSupplierForm({ ...supplierForm, ContactPerson: e.target.value })}
                    placeholder="ম্যানেজার / সেলস রিপ্রেজেন্টেটিভ"
                    className="w-full px-3 py-2 text-xs font-medium border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    মোবাইল নম্বর *
                  </label>
                  <input
                    type="tel"
                    required
                    value={supplierForm.Phone}
                    onChange={(e) => setSupplierForm({ ...supplierForm, Phone: e.target.value })}
                    placeholder="017XXXXXXXX"
                    className="w-full px-3 py-2 text-xs font-medium border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ইমেইল ঠিকানা (ঐচ্ছিক)
                </label>
                <input
                  type="email"
                  value={supplierForm.Email}
                  onChange={(e) => setSupplierForm({ ...supplierForm, Email: e.target.value })}
                  placeholder="vendor@company.com"
                  className="w-full px-3 py-2 text-xs font-medium border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ঠিকানা ও গুদাম/অফিস অবস্থান
                </label>
                <input
                  type="text"
                  value={supplierForm.Address}
                  onChange={(e) => setSupplierForm({ ...supplierForm, Address: e.target.value })}
                  placeholder="বাজার, জেলা, এলাকা..."
                  className="w-full px-3 py-2 text-xs font-medium border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  বিশেষ মন্তব্য বা শর্তাবলী
                </label>
                <textarea
                  rows="2"
                  value={supplierForm.Notes}
                  onChange={(e) => setSupplierForm({ ...supplierForm, Notes: e.target.value })}
                  placeholder="পেমেন্ট শর্ত, ডেলিভারি শিডিউল..."
                  className="w-full px-3 py-2 text-xs font-medium border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm cursor-pointer"
                >
                  সংরক্ষণ করুন
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ৬. সাপ্লায়ার বকেয়া পরিশোধ (Payment) সাব-মডাল */}
      {isPaymentModalOpen && paymentSupplier && (
        <div
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-3 z-[110] animate-in fade-in"
          style={{ zIndex: 110 }}
        >
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-rose-50 to-white">
              <div className="flex items-center space-x-2">
                <DollarSign className="w-5 h-5 text-rose-600" />
                <h3 className="text-sm font-black text-slate-900">
                  সাপ্লায়ারকে পেমেন্ট পরিশোধ
                </h3>
              </div>
              <button
                onClick={() => setIsPaymentModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitPayment} className="p-5 space-y-3.5">
              <div className="bg-rose-50/60 p-3 rounded-2xl border border-rose-200/70">
                <p className="text-xs text-rose-800 font-bold">
                  {paymentSupplier.CompanyName || paymentSupplier.ContactPerson}
                </p>
                <p className="text-xs text-rose-900 mt-1">
                  বর্তমান মোট দেনা: <span className="font-black text-sm">{currencySymbol}{Number(paymentSupplier.CurrentPayable || 0).toLocaleString('en-IN')}</span>
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  পরিশোধিত টাকার পরিমাণ * ({currencySymbol})
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  min="1"
                  max={Number(paymentSupplier.CurrentPayable || 99999999)}
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder="টাকার অংক লিখুন..."
                  className="w-full px-3 py-2 text-sm font-black border border-slate-200 rounded-xl focus:ring-2 focus:ring-rose-500/20 focus:border-rose-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  পেমেন্ট মেথড
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-bold border border-slate-200 rounded-xl bg-white"
                >
                  <option value="Cash">Cash (নগদ)</option>
                  <option value="bKash">bKash (বিকাশ)</option>
                  <option value="Nagad">Nagad (নগদ)</option>
                  <option value="Bank">Bank Transfer (ব্যাংক)</option>
                  <option value="Cheque">Bank Cheque (চেক)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ট্রানজেকশন আইডি / চেক নম্বর (ঐচ্ছিক)
                </label>
                <input
                  type="text"
                  value={paymentTrxId}
                  onChange={(e) => setPaymentTrxId(e.target.value)}
                  placeholder="TrxID বা চেক নম্বর..."
                  className="w-full px-3 py-2 text-xs font-medium border border-slate-200 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  মন্তব্য / নোট
                </label>
                <input
                  type="text"
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  placeholder="যেমন: মে মাসের চালানের বিল পরিশোধ"
                  className="w-full px-3 py-2 text-xs font-medium border border-slate-200 rounded-xl"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsPaymentModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingPayment}
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingPayment ? 'সংরক্ষণ হচ্ছে...' : 'পেমেন্ট নিশ্চিত করুন'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ৭. সাপ্লায়ার লেজার (Accounts Payable Ledger) সাব-মডাল */}
      {isLedgerModalOpen && selectedSupplierForLedger && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 z-[110] animate-in fade-in"
          style={{ zIndex: 110 }}
        >
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center space-x-2">
                <History className="w-5 h-5 text-indigo-600" />
                <div>
                  <h3 className="text-sm font-black text-slate-900">
                    {selectedSupplierForLedger.CompanyName || selectedSupplierForLedger.ContactPerson}-এর লেজার খাতা
                  </h3>
                  <p className="text-xs text-slate-500">
                    বর্তমান বকেয়া দেনা: <span className="font-bold text-rose-600">{currencySymbol}{Number(selectedSupplierForLedger.CurrentPayable || 0).toLocaleString('en-IN')}</span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsLedgerModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {(() => {
                const entries = (Array.isArray(supplierLedger) ? supplierLedger : []).filter(
                  l => String(l.SupplierID || '').trim() === String(selectedSupplierForLedger.SupplierID || '').trim()
                );

                if (entries.length === 0) {
                  return (
                    <div className="text-center py-10 text-slate-400 text-xs">
                      এই সাপ্লায়ারের কোনো পূর্ববর্তী লেজার বা লেনদেন এন্ট্রি নেই।
                    </div>
                  );
                }

                return (
                  <div className="space-y-2">
                    {entries.map((entry, idx) => (
                      <div
                        key={entry.LedgerID || idx}
                        className="p-3 rounded-2xl border border-slate-200/80 bg-slate-50/50 flex items-center justify-between text-xs"
                      >
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                              entry.EntryType === 'Purchase' ? 'bg-indigo-100 text-indigo-700' : 'bg-emerald-100 text-emerald-700'
                            }`}>
                              {entry.EntryType === 'Purchase' ? 'ক্রয় চালান' : 'পেমেন্ট প্রদান'}
                            </span>
                            <span className="font-mono text-slate-400 text-[11px]">{entry.PO_ID || entry.LedgerID}</span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-1">
                            তারিখ: {entry.Timestamp ? new Date(entry.Timestamp).toLocaleString('bn-BD') : 'N/A'}
                          </p>
                          {entry.Notes && (
                            <p className="text-[11px] text-slate-600 italic mt-0.5">{entry.Notes}</p>
                          )}
                        </div>

                        <div className="text-right">
                          {entry.EntryType === 'Purchase' ? (
                            <div>
                              <p className="font-black text-rose-700">+ {currencySymbol}{Number(entry.Credit || 0).toLocaleString('en-IN')}</p>
                              {Number(entry.Debit || 0) > 0 && (
                                <p className="text-[10px] text-emerald-600 font-bold">পরিশোধ: {currencySymbol}{Number(entry.Debit).toLocaleString('en-IN')}</p>
                              )}
                            </div>
                          ) : (
                            <div>
                              <p className="font-black text-emerald-700">- {currencySymbol}{Number(entry.Debit || 0).toLocaleString('en-IN')}</p>
                              <p className="text-[10px] text-slate-400">{entry.PaymentMethod}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>

            <div className="p-3 border-t border-slate-100 bg-slate-50 flex justify-end">
              <button
                onClick={() => setIsLedgerModalOpen(false)}
                className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold rounded-xl"
              >
                বন্ধ করুন
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

