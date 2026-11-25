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
  X,
  Edit2,
  Trash2,
  Send,
  CheckCircle,
  AlertCircle,
  User,
  History,
  TrendingUp
} from 'lucide-react';

export default function SuppliersModal({
  isOpen = false,
  onClose,
  embedded = false,
  suppliers = [],
  supplierLedger = [],
  bankAccounts = [],
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
  const [selectedBankAccountId, setSelectedBankAccountId] = useState('');
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
    setSelectedBankAccountId('');
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
          supplierName: paymentSupplier.CompanyName || paymentSupplier.ContactPerson || '',
          amount: amount,
          paymentMethod: paymentMethod,
          bankAccountId: paymentMethod !== 'Cash' ? selectedBankAccountId : '',
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

  if (!isOpen && !embedded) return null;

  return (
    <div
      className={embedded ? "w-full flex-1 flex flex-col min-h-0 bg-transparent animate-in fade-in duration-200" : "fixed inset-0 bg-neutral-900/40 flex items-center justify-center p-2 sm:p-4 z-[100] animate-in fade-in"}
      style={embedded ? {} : { zIndex: 100 }}
    >
      <div className={embedded ? "bg-white rounded-lg border border-neutral-200/80 w-full flex-1 min-h-[calc(100vh-6.5rem)] flex flex-col overflow-hidden relative" : "bg-white rounded-lg border border-neutral-200/80 w-full max-w-6xl flex flex-col max-h-[90vh] my-auto overflow-hidden relative"} style={embedded ? {} : { zIndex: 101 }}>
        
        {/* ১. হেডার সেকশন */}
        <div className="px-5 py-4 border-b border-neutral-200/80 flex items-center justify-between bg-[#FAFAFA] text-[#111111] shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-[#0F172A] text-white flex items-center justify-center shrink-0">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base sm:text-lg font-semibold text-[#111111] tracking-tight">
                  সাপ্লায়ার ও ভেন্ডর ম্যানেজমেন্ট
                </h2>
                <span className="px-2.5 py-0.5 rounded-md text-[11px] font-mono tabular-nums font-semibold bg-[#F5F5F5] text-[#111111] border border-neutral-200/80">
                  {totalSuppliersCount} জন
                </span>
              </div>
              <p className="text-xs text-[#525252] font-medium">
                পাইকারি ভেন্ডর প্রোফাইল, প্রকিউরমেন্ট বিলিং ও দেনার খাতা (Accounts Payable)
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={handleOpenAddForm}
              className="min-h-[44px] sm:min-h-[36px] px-3.5 py-1.5 bg-[#0F172A] hover:bg-slate-800 text-white text-xs font-semibold rounded-md transition-colors flex items-center space-x-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">নতুন সাপ্লায়ার</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className={`min-h-[44px] sm:min-h-[36px] p-2 rounded-md transition-colors cursor-pointer flex items-center space-x-1 ${
                embedded
                  ? 'bg-white hover:bg-[#F5F5F5] text-[#111111] font-semibold text-xs px-3 py-1.5 border border-neutral-200/80'
                  : 'min-w-[44px] sm:min-w-[36px] text-[#737373] hover:text-[#111111] hover:bg-[#F5F5F5] justify-center'
              }`}
              title={embedded ? "সেলস ক্যাটালগে ফিরে যান" : "বন্ধ করুন"}
            >
              {embedded ? (
                <>
                  <span className="text-sm font-semibold">←</span>
                  <span className="hidden sm:inline">ক্যাটালগে ফিরুন</span>
                </>
              ) : (
                <X className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>

        {/* ২. KPI সামারি মেট্রিক্স কার্ড */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-[#FAFAFA] border-b border-neutral-200/80 shrink-0">
          <div className="bg-white p-3 rounded-lg border border-neutral-200/80">
            <span className="text-[11px] font-semibold text-[#525252] flex items-center justify-between">
              <span>মোট সাপ্লায়ার</span>
              <Building2 className="w-4 h-4 text-[#737373]" />
            </span>
            <p className="text-base sm:text-xl font-semibold font-mono tabular-nums text-[#111111] mt-1">
              {totalSuppliersCount} <span className="text-xs font-sans font-medium text-[#525252]">জন</span>
            </p>
          </div>

          <div className="bg-white p-3 rounded-lg border border-neutral-200/80">
            <span className="text-[11px] font-semibold text-[#525252] flex items-center justify-between">
              <span>মোট ক্রয় (Purchases)</span>
              <TrendingUp className="w-4 h-4 text-[#0F172A]" />
            </span>
            <p className="text-base sm:text-xl font-semibold font-mono tabular-nums text-[#111111] mt-1">
              {currencySymbol}{totalPurchasedAmount.toLocaleString('en-IN')}
            </p>
          </div>

          <div className="bg-white p-3 rounded-lg border border-neutral-200/80">
            <span className="text-[11px] font-semibold text-[#525252] flex items-center justify-between">
              <span>মোট পরিশোধ (Paid)</span>
              <CheckCircle className="w-4 h-4 text-[#15803D]" />
            </span>
            <p className="text-base sm:text-xl font-semibold font-mono tabular-nums text-[#15803D] mt-1">
              {currencySymbol}{totalPaidAmount.toLocaleString('en-IN')}
            </p>
          </div>

          <div className="bg-red-50/40 p-3 rounded-lg border border-red-200">
            <span className="text-[11px] font-semibold text-[#B91C1C] flex items-center justify-between">
              <span>বর্তমান দেনা (Payable)</span>
              <AlertCircle className="w-4 h-4 text-[#B91C1C]" />
            </span>
            <p className="text-base sm:text-xl font-semibold font-mono tabular-nums text-[#B91C1C] mt-1">
              {currencySymbol}{totalPayableAmount.toLocaleString('en-IN')}
            </p>
          </div>
        </div>

        {/* ৩. সার্চ বার */}
        <div className="p-3 border-b border-neutral-200/80 bg-white flex items-center space-x-3 shrink-0">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#737373] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="কোম্পানি, ব্যক্তির নাম, ফোন বা সাপ্লায়ার আইডি দিয়ে খুঁজুন..."
              className="w-full min-h-[44px] sm:min-h-[36px] pl-9 pr-8 py-1.5 text-xs sm:text-sm font-medium border border-neutral-200/80 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0F172A]/10 focus:border-[#0F172A] bg-[#FAFAFA] focus:bg-white text-[#111111]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#737373] hover:text-[#111111] cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* ৪. সাপ্লায়ার তালিকা (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#FAFAFA]">
          {filteredSuppliers.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg border border-neutral-200/80">
              <Truck className="w-12 h-12 text-neutral-300 mx-auto mb-2" />
              <p className="text-sm font-semibold text-[#111111]">কোনো সাপ্লায়ার পাওয়া যায়নি</p>
              <p className="text-xs text-[#525252] mt-1">
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
                    className="bg-white border border-neutral-200/80 hover:border-neutral-300 rounded-lg p-4 transition-colors flex flex-col justify-between"
                  >
                    <div>
                      {/* টপ রো: নাম ও ব্যাজ */}
                      <div className="flex items-start justify-between">
                        <div className="min-w-0 flex-1">
                          <h3 className="text-sm sm:text-base font-semibold text-[#111111] tracking-tight truncate">
                            {sup.CompanyName || sup.ContactPerson}
                          </h3>
                          {sup.ContactPerson && sup.CompanyName && (
                            <p className="text-xs font-medium text-[#525252] flex items-center space-x-1 mt-0.5">
                              <User className="w-3.5 h-3.5 text-[#737373] shrink-0" />
                              <span className="truncate">{sup.ContactPerson}</span>
                            </p>
                          )}
                        </div>

                        <div className="text-right shrink-0 ml-2">
                          {payable > 0 ? (
                            <span className="px-2.5 py-1 rounded-md text-xs font-mono tabular-nums font-semibold bg-red-50 text-[#B91C1C] border border-red-200 inline-block">
                              দেনা: {currencySymbol}{payable.toLocaleString('en-IN')}
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-50 text-[#15803D] border border-emerald-200 inline-block">
                              পরিশোধিত
                            </span>
                          )}
                        </div>
                      </div>

                      {/* যোগাযোগ ও ঠিকানা */}
                      <div className="mt-3 space-y-1 text-xs text-[#525252]">
                        {sup.Phone && (
                          <div className="flex items-center space-x-2">
                            <Phone className="w-3.5 h-3.5 text-[#737373] shrink-0" />
                            <span className="font-mono tabular-nums text-[#111111]">{sup.Phone}</span>
                            <span className="text-[10px] bg-emerald-50 text-[#15803D] border border-emerald-200 px-1.5 py-0.5 rounded-md font-semibold">
                              WhatsApp
                            </span>
                          </div>
                        )}
                        {sup.Email && (
                          <div className="flex items-center space-x-2">
                            <Mail className="w-3.5 h-3.5 text-[#737373] shrink-0" />
                            <span className="truncate">{sup.Email}</span>
                          </div>
                        )}
                        {sup.Address && (
                          <div className="flex items-center space-x-2">
                            <MapPin className="w-3.5 h-3.5 text-[#737373] shrink-0" />
                            <span className="truncate">{sup.Address}</span>
                          </div>
                        )}
                      </div>

                      {/* ফিন্যান্সিয়াল সারাংশ বার */}
                      <div className="mt-3 grid grid-cols-2 gap-2 bg-[#FAFAFA] p-2.5 rounded-md border border-neutral-200/80 text-xs">
                        <div>
                          <span className="text-[10px] text-[#737373] font-semibold uppercase">মোট কেনা:</span>
                          <p className="font-semibold font-mono tabular-nums text-[#111111]">{currencySymbol}{purchased.toLocaleString('en-IN')}</p>
                        </div>
                        <div>
                          <span className="text-[10px] text-[#737373] font-semibold uppercase">পরিশোধ:</span>
                          <p className="font-semibold font-mono tabular-nums text-[#15803D]">{currencySymbol}{paid.toLocaleString('en-IN')}</p>
                        </div>
                      </div>
                    </div>

                    {/* অ্যাকশন বাটনসমূহ */}
                    <div className="mt-3.5 pt-3 border-t border-neutral-200/80 flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center space-x-1.5">
                        {payable > 0 && (
                          <button
                            type="button"
                            onClick={() => handleOpenPayment(sup)}
                            className="min-h-[44px] sm:min-h-[36px] px-2.5 py-1.5 bg-[#B91C1C] hover:bg-red-800 text-white text-xs font-semibold rounded-md transition-colors flex items-center space-x-1 cursor-pointer"
                          >
                            <DollarSign className="w-3.5 h-3.5" />
                            <span>পেমেন্ট দিন</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleOpenLedger(sup)}
                          title="লেনদেনের লেজার খাতা দেখুন"
                          className="min-h-[44px] sm:min-h-[36px] px-2.5 py-1.5 bg-[#F5F5F5] hover:bg-neutral-200 border border-neutral-200/80 text-[#111111] text-xs font-semibold rounded-md transition-colors flex items-center space-x-1 cursor-pointer"
                        >
                          <History className="w-3.5 h-3.5" />
                          <span>লেজার</span>
                        </button>
                        {sup.Phone && (
                          <button
                            type="button"
                            onClick={() => handleSendWhatsAppMemo(sup)}
                            title="হোয়াটসঅ্যাপে স্টেটমেন্ট পাঠান"
                            className="min-h-[44px] sm:min-h-[36px] min-w-[44px] sm:min-w-[36px] p-1.5 text-[#15803D] hover:bg-emerald-50 rounded-md transition-colors flex items-center justify-center cursor-pointer"
                          >
                            <Send className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      <div className="flex items-center space-x-1">
                        <button
                          type="button"
                          onClick={() => handleOpenEditForm(sup)}
                          title="সম্পাদনা করুন"
                          className="min-h-[44px] sm:min-h-[36px] min-w-[44px] sm:min-w-[36px] p-1.5 text-[#525252] hover:text-[#111111] hover:bg-[#F5F5F5] rounded-md transition-colors flex items-center justify-center cursor-pointer"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm(`আপনি কি '${sup.CompanyName || sup.ContactPerson}' সাপ্লায়ারকে মুছে ফেলতে চান?`)) {
                              if (onDeleteSupplier) onDeleteSupplier(sup.SupplierID);
                            }
                          }}
                          title="মুছে ফেলুন"
                          className="min-h-[44px] sm:min-h-[36px] min-w-[44px] sm:min-w-[36px] p-1.5 text-[#737373] hover:text-[#B91C1C] hover:bg-red-50 rounded-md transition-colors flex items-center justify-center cursor-pointer"
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
        <div className="p-3 px-5 border-t border-neutral-200/80 bg-[#FAFAFA] flex items-center justify-between text-xs text-[#525252] shrink-0">
          <span>মোট <strong className="font-mono tabular-nums text-[#111111]">{filteredSuppliers.length}</strong> জন সাপ্লায়ার প্রদর্শিত</span>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] sm:min-h-[36px] px-4 py-1.5 bg-white hover:bg-[#F5F5F5] border border-neutral-200/80 text-[#111111] font-semibold rounded-md transition-colors cursor-pointer"
          >
            বন্ধ করুন
          </button>
        </div>

      </div>

      {/* ৫. নতুন / এডিট সাপ্লায়ার সাব-মডাল */}
      {isEditing && (
        <div
          className="fixed inset-0 bg-neutral-900/40 flex items-center justify-center p-3 z-[110] animate-in fade-in"
          style={{ zIndex: 110 }}
        >
          <div className="bg-white rounded-lg border border-neutral-200/80 w-full max-w-lg overflow-hidden">
            <div className="px-5 py-4 border-b border-neutral-200/80 flex items-center justify-between bg-[#FAFAFA]">
              <h3 className="text-sm font-semibold tracking-tight text-[#111111]">
                {supplierForm.SupplierID ? 'সাপ্লায়ার সম্পাদনা' : 'নতুন সাপ্লায়ার যুক্ত করুন'}
              </h3>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="min-h-[44px] sm:min-h-[36px] min-w-[44px] sm:min-w-[36px] flex items-center justify-center rounded-md text-[#737373] hover:text-[#111111] hover:bg-[#F5F5F5] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveForm} className="p-5 space-y-3.5 bg-white">
              <div>
                <label className="block text-xs font-semibold text-[#111111] mb-1">
                  প্রতিষ্ঠানের নাম / কোম্পানির নাম *
                </label>
                <input
                  type="text"
                  required
                  value={supplierForm.CompanyName}
                  onChange={(e) => setSupplierForm({ ...supplierForm, CompanyName: e.target.value })}
                  placeholder="যেমন: মেঘনা গ্রুপ / প্রাণ পাইকারি ডিলার"
                  className="w-full min-h-[44px] sm:min-h-[36px] px-3 py-2 text-xs font-medium border border-neutral-200/80 rounded-md bg-[#FAFAFA] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0F172A]/10 focus:border-[#0F172A]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#111111] mb-1">
                    যোগাযোগের ব্যক্তির নাম
                  </label>
                  <input
                    type="text"
                    value={supplierForm.ContactPerson}
                    onChange={(e) => setSupplierForm({ ...supplierForm, ContactPerson: e.target.value })}
                    placeholder="ম্যানেজার / সেলস রিপ্রেজেন্টেটিভ"
                    className="w-full min-h-[44px] sm:min-h-[36px] px-3 py-2 text-xs font-medium border border-neutral-200/80 rounded-md bg-[#FAFAFA] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0F172A]/10 focus:border-[#0F172A]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#111111] mb-1 flex items-center justify-between">
                    <span>হোয়াটসঅ্যাপ / মোবাইল নম্বর *</span>
                    <span className="text-[10px] text-[#15803D] font-semibold">হোয়াটসঅ্যাপ সমর্থিত</span>
                  </label>
                  <input
                    type="tel"
                    required
                    value={supplierForm.Phone}
                    onChange={(e) => setSupplierForm({ ...supplierForm, Phone: e.target.value })}
                    placeholder="017XXXXXXXX (হোয়াটসঅ্যাপ নম্বর)"
                    className="w-full min-h-[44px] sm:min-h-[36px] px-3 py-2 text-xs font-mono tabular-nums font-medium border border-neutral-200/80 rounded-md bg-[#FAFAFA] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0F172A]/10 focus:border-[#0F172A]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#111111] mb-1">
                  ইমেইল ঠিকানা (ঐচ্ছিক)
                </label>
                <input
                  type="email"
                  value={supplierForm.Email}
                  onChange={(e) => setSupplierForm({ ...supplierForm, Email: e.target.value })}
                  placeholder="vendor@company.com"
                  className="w-full min-h-[44px] sm:min-h-[36px] px-3 py-2 text-xs font-medium border border-neutral-200/80 rounded-md bg-[#FAFAFA] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0F172A]/10 focus:border-[#0F172A]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#111111] mb-1">
                  ঠিকানা ও গুদাম/অফিস অবস্থান
                </label>
                <input
                  type="text"
                  value={supplierForm.Address}
                  onChange={(e) => setSupplierForm({ ...supplierForm, Address: e.target.value })}
                  placeholder="বাজার, জেলা, এলাকা..."
                  className="w-full min-h-[44px] sm:min-h-[36px] px-3 py-2 text-xs font-medium border border-neutral-200/80 rounded-md bg-[#FAFAFA] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0F172A]/10 focus:border-[#0F172A]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#111111] mb-1">
                  বিশেষ মন্তব্য বা শর্তাবলী
                </label>
                <textarea
                  rows="2"
                  value={supplierForm.Notes}
                  onChange={(e) => setSupplierForm({ ...supplierForm, Notes: e.target.value })}
                  placeholder="পেমেন্ট শর্ত, ডেলিভারি শিডিউল..."
                  className="w-full min-h-[44px] px-3 py-2 text-xs font-medium border border-neutral-200/80 rounded-md bg-[#FAFAFA] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0F172A]/10 focus:border-[#0F172A]"
                />
              </div>

              <div className="pt-3 border-t border-neutral-200/80 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="min-h-[44px] sm:min-h-[36px] px-4 py-2 bg-[#F5F5F5] hover:bg-neutral-200 border border-neutral-200/80 text-[#111111] text-xs font-semibold rounded-md cursor-pointer"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  className="min-h-[44px] sm:min-h-[36px] px-5 py-2 bg-[#0F172A] hover:bg-slate-800 text-white text-xs font-semibold rounded-md cursor-pointer"
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
          className="fixed inset-0 bg-neutral-900/40 flex items-center justify-center p-3 z-[110] animate-in fade-in"
          style={{ zIndex: 110 }}
        >
          <div className="bg-white rounded-lg border border-neutral-200/80 w-full max-w-md overflow-hidden">
            <div className="px-5 py-4 border-b border-neutral-200/80 flex items-center justify-between bg-[#FAFAFA]">
              <div className="flex items-center space-x-2">
                <DollarSign className="w-5 h-5 text-[#B91C1C]" />
                <h3 className="text-sm font-semibold tracking-tight text-[#111111]">
                  সাপ্লায়ারকে পেমেন্ট পরিশোধ
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsPaymentModalOpen(false)}
                className="min-h-[44px] sm:min-h-[36px] min-w-[44px] sm:min-w-[36px] flex items-center justify-center rounded-md text-[#737373] hover:text-[#111111] hover:bg-[#F5F5F5] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitPayment} className="p-5 space-y-3.5 bg-white">
              <div className="bg-red-50 p-3 rounded-lg border border-red-200">
                <p className="text-xs text-[#B91C1C] font-semibold">
                  {paymentSupplier.CompanyName || paymentSupplier.ContactPerson}
                </p>
                <p className="text-xs text-[#111111] mt-1">
                  বর্তমান মোট দেনা: <span className="font-mono tabular-nums font-semibold text-sm text-[#B91C1C]">{currencySymbol}{Number(paymentSupplier.CurrentPayable || 0).toLocaleString('en-IN')}</span>
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#111111] mb-1">
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
                  className="w-full min-h-[44px] sm:min-h-[36px] px-3 py-2 text-sm font-mono tabular-nums font-semibold border border-neutral-200/80 rounded-md bg-[#FAFAFA] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0F172A]/10 focus:border-[#0F172A]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#111111] mb-1">
                  পেমেন্ট মেথড
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full min-h-[44px] sm:min-h-[36px] px-3 py-2 text-xs font-semibold border border-neutral-200/80 rounded-md bg-white"
                >
                  <option value="Cash">Cash (নগদ)</option>
                  <option value="bKash">bKash (বিকাশ)</option>
                  <option value="Nagad">Nagad (নগদ)</option>
                  <option value="Bank">Bank Transfer (ব্যাংক)</option>
                  <option value="Cheque">Bank Cheque (চেক)</option>
                </select>
              </div>

              {paymentMethod !== 'Cash' && (
                <div className="p-3 rounded-lg bg-[#FAFAFA] border border-neutral-200/80 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-semibold text-[#111111]">
                      কোন ব্যাংক/MFS অ্যাকাউন্ট থেকে পরিশোধ হবে:
                    </label>
                    <span className="text-[10px] text-[#15803D] font-mono bg-emerald-50 px-1.5 py-0.5 rounded-md border border-emerald-200">
                      ব্যাংক থেকে কর্তন হবে
                    </span>
                  </div>
                  <select
                    value={selectedBankAccountId}
                    onChange={(e) => setSelectedBankAccountId(e.target.value)}
                    className="w-full min-h-[44px] sm:min-h-[36px] px-3 py-2 text-xs font-medium border border-neutral-200/80 rounded-md bg-white"
                  >
                    <option value="">-- ব্যাংক অ্যাকাউন্ট বাছাই করুন --</option>
                    {(bankAccounts || []).map(b => (
                      <option key={b.AccountID} value={b.AccountID}>
                        {b.BankName} — {b.AccountNumber} (ব্যালেন্স: ৳{Number(b.CurrentBalance || 0).toLocaleString('bn-BD')})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-[#111111] mb-1">
                  ট্রানজেকশন আইডি / চেক নম্বর (ঐচ্ছিক)
                </label>
                <input
                  type="text"
                  value={paymentTrxId}
                  onChange={(e) => setPaymentTrxId(e.target.value)}
                  placeholder="TrxID বা চেক নম্বর..."
                  className="w-full min-h-[44px] sm:min-h-[36px] px-3 py-2 text-xs font-mono tabular-nums font-medium border border-neutral-200/80 rounded-md bg-[#FAFAFA] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0F172A]/10 focus:border-[#0F172A]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#111111] mb-1">
                  মন্তব্য / নোট
                </label>
                <input
                  type="text"
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  placeholder="যেমন: মে মাসের চালানের বিল পরিশোধ"
                  className="w-full min-h-[44px] sm:min-h-[36px] px-3 py-2 text-xs font-medium border border-neutral-200/80 rounded-md bg-[#FAFAFA] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0F172A]/10 focus:border-[#0F172A]"
                />
              </div>

              <div className="pt-3 border-t border-neutral-200/80 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsPaymentModalOpen(false)}
                  className="min-h-[44px] sm:min-h-[36px] px-4 py-2 bg-[#F5F5F5] hover:bg-neutral-200 border border-neutral-200/80 text-[#111111] text-xs font-semibold rounded-md cursor-pointer"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingPayment}
                  className="min-h-[44px] sm:min-h-[36px] px-5 py-2 bg-[#B91C1C] hover:bg-red-800 text-white text-xs font-semibold rounded-md cursor-pointer disabled:opacity-50"
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
          className="fixed inset-0 bg-neutral-900/40 flex items-center justify-center p-3 z-[110] animate-in fade-in"
          style={{ zIndex: 110 }}
        >
          <div className="bg-white rounded-lg border border-neutral-200/80 w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden">
            <div className="px-5 py-4 border-b border-neutral-200/80 flex items-center justify-between bg-[#FAFAFA]">
              <div className="flex items-center space-x-2">
                <History className="w-5 h-5 text-[#0F172A]" />
                <div>
                  <h3 className="text-sm font-semibold tracking-tight text-[#111111]">
                    {selectedSupplierForLedger.CompanyName || selectedSupplierForLedger.ContactPerson}-এর লেজার খাতা
                  </h3>
                  <p className="text-xs text-[#525252]">
                    বর্তমান বকেয়া দেনা: <span className="font-mono tabular-nums font-semibold text-[#B91C1C]">{currencySymbol}{Number(selectedSupplierForLedger.CurrentPayable || 0).toLocaleString('en-IN')}</span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsLedgerModalOpen(false)}
                className="min-h-[44px] sm:min-h-[36px] min-w-[44px] sm:min-w-[36px] flex items-center justify-center rounded-md text-[#737373] hover:text-[#111111] hover:bg-[#F5F5F5] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 bg-white">
              {(() => {
                const entries = (Array.isArray(supplierLedger) ? supplierLedger : []).filter(
                  l => String(l.SupplierID || '').trim() === String(selectedSupplierForLedger.SupplierID || '').trim()
                );

                if (entries.length === 0) {
                  return (
                    <div className="text-center py-10 text-[#737373] text-xs">
                      এই সাপ্লায়ারের কোনো পূর্ববর্তী লেজার বা লেনদেন এন্ট্রি নেই।
                    </div>
                  );
                }

                return (
                  <div className="space-y-2">
                    {entries.map((entry, idx) => (
                      <div
                        key={entry.LedgerID || idx}
                        className="p-3 rounded-lg border border-neutral-200/80 bg-[#FAFAFA] flex items-center justify-between text-xs"
                      >
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className={`px-2 py-0.5 rounded-md font-semibold text-[10px] border ${
                              entry.EntryType === 'Purchase' ? 'bg-[#F5F5F5] text-[#111111] border-neutral-200/80' : 'bg-emerald-50 text-[#15803D] border-emerald-200'
                            }`}>
                              {entry.EntryType === 'Purchase' ? 'ক্রয় চালান' : 'পেমেন্ট প্রদান'}
                            </span>
                            <span className="font-mono tabular-nums text-[#737373] text-[11px]">{entry.PO_ID || entry.LedgerID}</span>
                          </div>
                          <p className="text-[11px] text-[#525252] mt-1 font-mono tabular-nums">
                            তারিখ: {entry.Timestamp ? new Date(entry.Timestamp).toLocaleString('bn-BD') : 'N/A'}
                          </p>
                          {entry.Notes && (
                            <p className="text-[11px] text-[#525252] italic mt-0.5">{entry.Notes}</p>
                          )}
                        </div>

                        <div className="text-right">
                          {entry.EntryType === 'Purchase' ? (
                            <div>
                              <p className="font-semibold font-mono tabular-nums text-[#B91C1C]">+ {currencySymbol}{Number(entry.Credit || 0).toLocaleString('en-IN')}</p>
                              {Number(entry.Debit || 0) > 0 && (
                                <p className="text-[10px] text-[#15803D] font-mono tabular-nums font-semibold">পরিশোধ: {currencySymbol}{Number(entry.Debit).toLocaleString('en-IN')}</p>
                              )}
                            </div>
                          ) : (
                            <div>
                              <p className="font-semibold font-mono tabular-nums text-[#15803D]">- {currencySymbol}{Number(entry.Debit || 0).toLocaleString('en-IN')}</p>
                              <p className="text-[10px] text-[#737373]">{entry.PaymentMethod}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>

            <div className="p-3 border-t border-neutral-200/80 bg-[#FAFAFA] flex justify-end">
              <button
                type="button"
                onClick={() => setIsLedgerModalOpen(false)}
                className="min-h-[44px] sm:min-h-[36px] px-4 py-1.5 bg-white hover:bg-[#F5F5F5] border border-neutral-200/80 text-[#111111] text-xs font-semibold rounded-md cursor-pointer"
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
