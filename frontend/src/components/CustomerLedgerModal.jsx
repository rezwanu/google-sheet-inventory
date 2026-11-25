import React, { useState, useMemo } from 'react';
import {
  X,
  Search,
  DollarSign,
  TrendingUp,
  Phone,
  MessageCircle,
  Printer,
  CheckCircle2,
  User,
  MapPin,
  FileText,
  Banknote,
  ShieldAlert,
  RefreshCw,
  PlusCircle,
  Edit3
} from 'lucide-react';


export default function CustomerLedgerModal({
  isOpen,
  onClose,
  embedded = false,
  customers = [],
  customerLedger = [],
  orders = [],
  settings = {},
  activeUser = null,
  onRecordPayment,
  onUpdateCreditLimit,
  onSendSms,
  currencySymbol = '৳',
  showToast
}) {
  const [activeTab, setActiveTab] = useState('due'); // 'due' | 'all' | 'transactions'
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomerForPayment, setSelectedCustomerForPayment] = useState(null);
  const [selectedCustomerForStatement, setSelectedCustomerForStatement] = useState(null);
  const [selectedCustomerForLimit, setSelectedCustomerForLimit] = useState(null);
  const [printedReceiptData, setPrintedReceiptData] = useState(null);

  // পেমেন্ট কালেকশন ফর্ম স্টেট
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [trxId, setTrxId] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);

  // ক্রেডিট লিমিট ফর্ম স্টেট
  const [newCreditLimit, setNewCreditLimit] = useState('');
  const [isUpdatingLimit, setIsUpdatingLimit] = useState(false);

  // ১. ড্যাশবোর্ড সারসংক্ষেপ মেট্রিক্স
  const metrics = useMemo(() => {
    let totalDue = 0;
    let dueCustomersCount = 0;
    let limitExceededCount = 0;

    const safeCustomers = Array.isArray(customers) ? customers : [];
    safeCustomers.forEach(c => {
      if (!c) return;
      const due = Number(c.CurrentDue || 0);
      const limit = Number(c.CreditLimit || 0);
      if (due > 0) {
        totalDue += due;
        dueCustomersCount++;
        if (limit > 0 && due > limit) {
          limitExceededCount++;
        }
      }
    });

    // চলতি মাসের আদায় (Current Month Collected)
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    let monthCollected = 0;

    const safeLedger = Array.isArray(customerLedger) ? customerLedger : [];
    safeLedger.forEach(tx => {
      if (tx && tx.EntryType === 'Payment' && Number(tx.Credit || 0) > 0) {
        const txDate = new Date(tx.Timestamp);
        if (txDate.getMonth() === currentMonth && txDate.getFullYear() === currentYear) {
          monthCollected += Number(tx.Credit || 0);
        }
      }
    });

    return {
      totalDue,
      dueCustomersCount,
      limitExceededCount,
      monthCollected
    };
  }, [customers, customerLedger]);

  // ২. ফিল্টারকৃত কাস্টমার তালিকা
  const filteredCustomers = useMemo(() => {
    const safeCustomers = Array.isArray(customers) ? customers : [];
    return safeCustomers.filter(c => {
      if (!c) return false;
      const due = Number(c.CurrentDue || 0);
      if (activeTab === 'due' && due <= 0) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      return (
        (c.CustomerName && String(c.CustomerName).toLowerCase().includes(q)) ||
        (c.Phone && String(c.Phone).includes(q)) ||
        (c.Address && String(c.Address).toLowerCase().includes(q)) ||
        (c.CustomerID && String(c.CustomerID).toLowerCase().includes(q))
      );
    }).sort((a, b) => Number(b?.CurrentDue || 0) - Number(a?.CurrentDue || 0));
  }, [customers, activeTab, searchQuery]);

  // ৩. ফিল্টারকৃত লেজার ট্রানজেকশন তালিকা
  const filteredTransactions = useMemo(() => {
    const safeLedger = Array.isArray(customerLedger) ? customerLedger : [];
    return safeLedger.filter(tx => {
      if (!tx) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      return (
        (tx.CustomerName && String(tx.CustomerName).toLowerCase().includes(q)) ||
        (tx.CustomerPhone && String(tx.CustomerPhone).includes(q)) ||
        (tx.OrderID && String(tx.OrderID).toLowerCase().includes(q)) ||
        (tx.TrxID && String(tx.TrxID).toLowerCase().includes(q))
      );
    });
  }, [customerLedger, searchQuery]);

  // পেমেন্ট সাবমিট হ্যান্ডলার
  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    if (!selectedCustomerForPayment) return;
    const amt = Number(paymentAmount);
    if (isNaN(amt) || amt <= 0) {
      alert('সঠিক টাকার পরিমাণ প্রদান করুন।');
      return;
    }

    setIsSubmittingPayment(true);
    try {
      if (onRecordPayment) {
        const res = await onRecordPayment({
          customerId: selectedCustomerForPayment.CustomerID,
          customerName: selectedCustomerForPayment.CustomerName,
          customerPhone: selectedCustomerForPayment.Phone,
          amount: amt,
          paymentMethod: paymentMethod,
          trxId: trxId.trim(),
          notes: notes.trim(),
          collectedBy: activeUser?.FullName || activeUser?.Email || 'Admin'
        });

        if (res && res.success) {
          if (showToast) showToast(res.message || 'বকেয়া সফলভাবে পরিশোধ হয়েছে!', 'success');
          // রিসিট প্রিন্ট প্রস্তুত
          setPrintedReceiptData({
            receiptNo: res.data?.ledgerId || `REC-${Date.now()}`,
            timestamp: new Date().toISOString(),
            customerName: selectedCustomerForPayment.CustomerName,
            customerPhone: selectedCustomerForPayment.Phone,
            customerAddress: selectedCustomerForPayment.Address,
            amount: amt,
            paymentMethod: paymentMethod,
            trxId: trxId.trim(),
            notes: notes.trim(),
            previousDue: Number(selectedCustomerForPayment.CurrentDue || 0),
            currentDue: Math.max(0, Number(selectedCustomerForPayment.CurrentDue || 0) - amt),
            collectedBy: activeUser?.FullName || 'Admin'
          });
          setSelectedCustomerForPayment(null);
          setPaymentAmount('');
          setTrxId('');
          setNotes('');
        } else {
          alert(res?.message || 'বকেয়া পরিশোধ সম্পন্ন করা যায়নি।');
        }
      }
    } catch (err) {
      alert(`ত্রুটি: ${err.message}`);
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  // ক্রেডিট লিমিট আপডেট হ্যান্ডলার
  const handleCreditLimitSubmit = async (e) => {
    e.preventDefault();
    if (!selectedCustomerForLimit) return;
    const limit = Math.max(0, Number(newCreditLimit) || 0);

    setIsUpdatingLimit(true);
    try {
      if (onUpdateCreditLimit) {
        const res = await onUpdateCreditLimit(selectedCustomerForLimit.CustomerID, limit, selectedCustomerForLimit.Phone);
        if (res && res.success) {
          if (showToast) showToast(res.message || 'ক্রেডিট লিমিট সফলভাবে আপডেট করা হয়েছে!', 'success');
          setSelectedCustomerForLimit(null);
          setNewCreditLimit('');
        } else {
          alert(res?.message || 'ক্রেডিট লিমিট আপডেট করা যায়নি।');
        }
      }
    } catch (err) {
      alert(`ত্রুটি: ${err.message}`);
    } finally {
      setIsUpdatingLimit(false);
    }
  };

  // হোয়াটসঅ্যাপে বকেয়া তাগাদা পাঠানোর মেসেজ
  const handleSendWhatsAppReminder = (customer) => {
    if (!customer || !customer.Phone) return;
    let phone = String(customer.Phone).replace(/\D/g, '');
    if (phone.startsWith('01')) phone = '88' + phone;
    else if (!phone.startsWith('8801') && phone.length === 11) phone = '88' + phone;

    const storeName = settings?.StoreName || 'Pabna Bostraloy';
    const storePhone = settings?.Phone || '';
    const due = Number(customer.CurrentDue || 0);

    const message = `আসসালামু আলাইকুম ${customer.CustomerName || 'সম্মানিত গ্রাহক'},
${storeName}-এ আপনার বর্তমান বকেয়া হিসাব ৳${due.toLocaleString('en-US')}।

অনুগ্রহ করে আপনার সুবিধাজনক সময়ে বকেয়া টাকা পরিশোধের অনুরোধ জানাচ্ছি।
বিকাশ/নগদ বা তথ্যের জন্য যোগাযোগ: ${storePhone}

ধন্যবাদান্তে,
${storeName}`;

    const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  // ১-ক্লিক SMS তাগাদা
  const handleSendSmsReminder = (customer) => {
    if (!customer || !customer.Phone) {
      alert('গ্রাহকের মোবাইল নম্বর পাওয়া যায়নি।');
      return;
    }
    const storeName = settings?.StoreName || 'Pabna Bostraloy';
    const storePhone = settings?.Phone || '';
    const due = Number(customer.CurrentDue || 0);

    const message = `Prio ${customer.CustomerName || 'Grahok'}, ${storeName}-e apnar bokeya tk ${due} porishodher onurodh roilo. Helpline: ${storePhone}`;

    if (onSendSms) {
      if (window.confirm(`${customer.CustomerName}-কে কি বকেয়া তাগাদা SMS পাঠানো হবে?\n\nমেসেজ: "${message}"`)) {
        onSendSms({
          customerName: customer.CustomerName,
          customerPhone: customer.Phone,
          message: message
        }).then(res => {
          if (res && res.success) {
            if (showToast) showToast('বকেয়া তাগাদা SMS সফলভাবে পাঠানো হয়েছে!', 'success');
          } else {
            alert(res?.message || 'SMS পাঠানো ব্যর্থ হয়েছে।');
          }
        });
      }
    } else {
      alert('SMS পাঠানোর গেটওয়ে সক্রিয় নেই। অনুগ্রহ করে Settings থেকে SMS গেটওয়ে চালু করুন।');
    }
  };

  if (!isOpen && !embedded) return null;

  return (
    <div className={embedded ? "w-full flex-1 flex flex-col min-h-0 bg-transparent animate-in fade-in duration-200" : "fixed inset-0 z-50 overflow-y-auto bg-neutral-900/40 flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200"}>
      <div className={embedded ? "bg-white rounded-lg border border-neutral-200/80 w-full flex-1 min-h-[calc(100vh-6.5rem)] flex flex-col overflow-hidden" : "bg-white rounded-lg border border-neutral-200/80 w-full max-w-6xl max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"}>
        
        {/* ১. আধুনিক হেডার ও ক্লোজ বাটন */}
        <div className="p-4 sm:p-5 bg-[#FAFAFA] border-b border-neutral-200/80 text-[#111111] flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3.5">
            <div className="w-10 h-10 rounded-md bg-white border border-neutral-200/80 text-[#0F172A] flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base sm:text-lg font-semibold tracking-tight text-[#111111]">
                  বাকির খাতা ও কাস্টমার লেজার (Due & Credit Ledger)
                </h2>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-amber-50 text-[#B45309] border border-amber-200/80">
                  ফেজ ২
                </span>
              </div>
              <p className="text-xs text-[#525252] mt-0.5">
                গ্রাহকদের বকেয়া ব্যবস্থাপনা, কিস্তি ও আংশিক পরিশোধ আদায়, ক্রেডিট লিমিট ও স্বয়ংক্রিয় তাগাদা ইঞ্জিন
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className={`min-h-[44px] sm:min-h-[36px] rounded-md transition-colors cursor-pointer flex items-center space-x-1 shrink-0 ${
              embedded
                ? 'px-3 py-1.5 bg-white hover:bg-[#F5F5F5] text-[#111111] font-medium text-xs border border-neutral-200/80'
                : 'min-w-[44px] sm:min-w-[36px] p-2 hover:bg-neutral-200/60 text-[#525252] hover:text-[#111111] justify-center'
            }`}
            title={embedded ? "সেলস ক্যাটালগে ফিরে যান" : "বন্ধ করুন"}
          >
            {embedded ? (
              <>
                <span className="text-sm font-medium">←</span>
                <span className="hidden sm:inline">ক্যাটালগে ফিরুন</span>
              </>
            ) : (
              <X className="w-5 h-5" />
            )}
          </button>
        </div>

        {/* ২. টপ মেট্রিক্স কার্ডস গ্রিড (Executive Metric Banners) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 p-4 sm:p-5 bg-[#F5F5F5] border-b border-neutral-200/80 shrink-0">
          {/* মোট বকেয়া পাওনা */}
          <div className="bg-white p-4 rounded-lg border border-neutral-200/80">
            <div className="flex items-center justify-between">
              <span className="text-[10px] sm:text-[11px] font-medium text-[#525252] uppercase tracking-wider">মোট বকেয়া পাওনা</span>
              <div className="w-7 h-7 rounded-md bg-red-50 border border-red-200/80 text-[#B91C1C] flex items-center justify-center">
                <DollarSign className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="mt-2 text-xl sm:text-2xl font-semibold text-[#B91C1C] font-mono tabular-nums tracking-tight">
              {currencySymbol}{metrics.totalDue.toLocaleString('en-US')}
            </div>
            <span className="text-[10px] text-[#737373] mt-0.5 block">কাস্টমারদের কাছে মোট পাওনা</span>
          </div>

          {/* বাকিদার কাস্টমার সংখ্যা */}
          <div className="bg-white p-4 rounded-lg border border-neutral-200/80">
            <div className="flex items-center justify-between">
              <span className="text-[10px] sm:text-[11px] font-medium text-[#525252] uppercase tracking-wider">বাকিদার কাস্টমার</span>
              <div className="w-7 h-7 rounded-md bg-amber-50 border border-amber-200/80 text-[#B45309] flex items-center justify-center">
                <User className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="mt-2 text-xl sm:text-2xl font-semibold text-[#B45309] font-mono tabular-nums tracking-tight">
              {metrics.dueCustomersCount} <span className="text-xs font-medium text-[#525252] font-sans">জন</span>
            </div>
            <span className="text-[10px] text-[#737373] mt-0.5 block">যাদের নিকট টাকা বাকি রয়েছে</span>
          </div>

          {/* চলতি মাসে বকেয়া আদায় */}
          <div className="bg-white p-4 rounded-lg border border-neutral-200/80">
            <div className="flex items-center justify-between">
              <span className="text-[10px] sm:text-[11px] font-medium text-[#525252] uppercase tracking-wider">চলতি মাসে আদায়</span>
              <div className="w-7 h-7 rounded-md bg-emerald-50 border border-emerald-200/80 text-[#15803D] flex items-center justify-center">
                <TrendingUp className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="mt-2 text-xl sm:text-2xl font-semibold text-[#15803D] font-mono tabular-nums tracking-tight">
              {currencySymbol}{metrics.monthCollected.toLocaleString('en-US')}
            </div>
            <span className="text-[10px] text-[#737373] mt-0.5 block">নগদ বা ব্যাংকে সংগৃহীত বকেয়া</span>
          </div>

          {/* লিমিট অতিক্রান্ত সতর্কবার্তা */}
          <div className="bg-white p-4 rounded-lg border border-neutral-200/80">
            <div className="flex items-center justify-between">
              <span className="text-[10px] sm:text-[11px] font-medium text-[#525252] uppercase tracking-wider">লিমিট অতিক্রান্ত</span>
              <div className="w-7 h-7 rounded-md bg-red-50 border border-red-200/80 text-[#B91C1C] flex items-center justify-center">
                <ShieldAlert className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="mt-2 text-xl sm:text-2xl font-semibold text-[#B91C1C] font-mono tabular-nums tracking-tight">
              {metrics.limitExceededCount} <span className="text-xs font-medium text-[#525252] font-sans">জন</span>
            </div>
            <span className="text-[10px] text-[#B91C1C] font-medium mt-0.5 block">ক্রেডিট লিমিট ছাড়া বাকি</span>
          </div>
        </div>

        {/* ৩. ট্যাব সুইচিং ও সার্চ ফিল্টার বার */}
        <div className="p-4 bg-white border-b border-neutral-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <div className="flex items-center space-x-1 bg-[#F5F5F5] border border-neutral-200/80 p-1 rounded-md overflow-x-auto shrink-0">
            <button
              onClick={() => setActiveTab('due')}
              className={`min-h-[44px] sm:min-h-[36px] px-3.5 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer whitespace-nowrap font-mono tabular-nums border ${
                activeTab === 'due'
                  ? 'border-[#0F172A] bg-[#0F172A] text-white'
                  : 'border-transparent text-[#525252] hover:text-[#111111]'
              }`}
            >
              বকেয়া তালিকা ({metrics.dueCustomersCount})
            </button>
            <button
              onClick={() => setActiveTab('all')}
              className={`min-h-[44px] sm:min-h-[36px] px-3.5 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer whitespace-nowrap font-mono tabular-nums border ${
                activeTab === 'all'
                  ? 'border-[#0F172A] bg-[#0F172A] text-white'
                  : 'border-transparent text-[#525252] hover:text-[#111111]'
              }`}
            >
              সকল গ্রাহক ({customers.length})
            </button>
            <button
              onClick={() => setActiveTab('transactions')}
              className={`min-h-[44px] sm:min-h-[36px] px-3.5 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer whitespace-nowrap font-mono tabular-nums border ${
                activeTab === 'transactions'
                  ? 'border-[#0F172A] bg-[#0F172A] text-white'
                  : 'border-transparent text-[#525252] hover:text-[#111111]'
              }`}
            >
              লেনদেন হিস্ট্রি ({customerLedger.length})
            </button>
          </div>

          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-[#737373] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="গ্রাহকের নাম, মোবাইল, অর্ডার বা ট্রানজেকশন দিয়ে খুঁজুন..."
              className="w-full min-h-[44px] sm:min-h-[36px] pl-10 pr-4 py-2 bg-[#FAFAFA] border border-neutral-200/80 rounded-md text-xs sm:text-sm text-[#111111] placeholder-[#737373] focus:outline-none focus:bg-white focus:border-[#0F172A] focus:ring-1 focus:ring-[#0F172A] font-medium"
            />
          </div>
        </div>

        {/* ৪. প্রধান স্ক্রোলেবল বডি কনটেন্ট */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-[#FAFAFA]">
          {activeTab === 'transactions' ? (
            /* ৪.১ লেনদেন হিস্ট্রি টেবিল */
            <div className="bg-white rounded-lg border border-neutral-200/80 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-[#F5F5F5] border-b border-neutral-200/80 text-[#525252] font-medium uppercase text-[10px]">
                      <th className="p-3 pl-4">তারিখ ও সময়</th>
                      <th className="p-3">গ্রাহকের নাম ও ফোন</th>
                      <th className="p-3">বিবরণ / অর্ডার</th>
                      <th className="p-3">ধরণ</th>
                      <th className="p-3 text-right">ডেবিট (ক্রয়)</th>
                      <th className="p-3 text-right">ক্রেডিট (পরিশোধ)</th>
                      <th className="p-3 text-right">চলতি বকেয়া</th>
                      <th className="p-3 pr-4 text-center">মাধ্যম / রিসিভার</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200/80 font-medium text-[#525252]">
                    {filteredTransactions.length === 0 ? (
                      <tr>
                        <td colSpan="8" className="p-8 text-center text-[#737373] font-medium">
                          কোনো লেনদেন রেকর্ড পাওয়া যায়নি।
                        </td>
                      </tr>
                    ) : (
                      filteredTransactions.map((tx) => (
                        <tr key={tx.LedgerID} className="hover:bg-[#FAFAFA] transition-colors">
                          <td className="p-3 pl-4 font-mono tabular-nums text-[11px] text-[#525252] whitespace-nowrap">
                            {new Date(tx.Timestamp).toLocaleString('bn-BD', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </td>
                          <td className="p-3 font-semibold text-[#111111]">
                            <div>{tx.CustomerName}</div>
                            <div className="text-[11px] text-[#737373] font-mono tabular-nums font-normal">{tx.CustomerPhone}</div>
                          </td>
                          <td className="p-3">
                            <div className="font-medium text-[#111111]">{tx.Notes || 'বকেয়া লেনদেন'}</div>
                            {tx.OrderID && (
                              <span className="text-[10px] font-mono tabular-nums text-[#111111] bg-[#F5F5F5] border border-neutral-200/80 px-1.5 py-0.5 rounded-md inline-block mt-0.5">
                                {tx.OrderID}
                              </span>
                            )}
                          </td>
                          <td className="p-3 whitespace-nowrap">
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-medium border ${
                              tx.EntryType === 'Payment'
                                ? 'bg-emerald-50 text-[#15803D] border-emerald-200/80'
                                : 'bg-red-50 text-[#B91C1C] border-red-200/80'
                            }`}>
                              {tx.EntryType === 'Payment' ? 'পরিশোধ' : 'বাকি বিক্রয়'}
                            </span>
                          </td>
                          <td className="p-3 text-right font-mono tabular-nums font-semibold text-[#111111]">
                            {Number(tx.Debit || 0) > 0 ? `${currencySymbol}${Number(tx.Debit).toLocaleString()}` : '-'}
                          </td>
                          <td className="p-3 text-right font-mono tabular-nums font-semibold text-[#15803D]">
                            {Number(tx.Credit || 0) > 0 ? `${currencySymbol}${Number(tx.Credit).toLocaleString()}` : '-'}
                          </td>
                          <td className="p-3 text-right font-mono tabular-nums font-semibold text-[#B91C1C]">
                            {currencySymbol}{Number(tx.Balance || 0).toLocaleString()}
                          </td>
                          <td className="p-3 pr-4 text-center">
                            <span className="text-[10px] font-medium text-[#111111] block">{tx.PaymentMethod || 'Cash'}</span>
                            <span className="text-[9px] text-[#737373] block">{tx.CollectedBy || 'Admin'}</span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* ৪.২ কাস্টমার বকেয়া রেজিস্টার কার্ড তালিকা */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredCustomers.length === 0 ? (
                <div className="col-span-full bg-white rounded-lg p-10 text-center border border-neutral-200/80">
                  <CheckCircle2 className="w-12 h-12 text-[#15803D] mx-auto mb-3" />
                  <h3 className="text-base font-semibold tracking-tight text-[#111111]">কোনো বকেয়া রেকর্ড পাওয়া যায়নি!</h3>
                  <p className="text-xs text-[#525252] mt-1">সব কাস্টমারের হিসাব পরিশোধিত রয়েছে অথবা সার্চের সাথে কোনো গ্রাহক মিলেনি।</p>
                </div>
              ) : (
                filteredCustomers.map((cust) => {
                  const due = Number(cust.CurrentDue || 0);
                  const limit = Number(cust.CreditLimit || 0);
                  const isOverLimit = limit > 0 && due > limit;

                  return (
                    <div
                      key={cust.CustomerID || cust.Phone}
                      className="bg-white rounded-lg p-4 sm:p-5 border border-neutral-200/80 space-y-3.5 flex flex-col justify-between"
                    >
                      <div className="space-y-2.5">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h3 className="text-sm font-semibold tracking-tight text-[#111111] leading-tight">
                              {cust.CustomerName}
                            </h3>
                            <div className="flex items-center space-x-1 text-[#525252] text-xs font-mono tabular-nums mt-0.5">
                              <Phone className="w-3 h-3 text-[#737373]" />
                              <a href={`tel:${cust.Phone}`} className="hover:text-[#0F172A]">{cust.Phone}</a>
                            </div>
                          </div>

                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-medium shrink-0 border ${
                            due > 0
                              ? isOverLimit
                                ? 'bg-red-50 text-[#B91C1C] border-red-200/80'
                                : 'bg-amber-50 text-[#B45309] border-amber-200/80'
                              : 'bg-emerald-50 text-[#15803D] border-emerald-200/80'
                          }`}>
                            {due > 0 ? (isOverLimit ? 'লিমিট অতিক্রম' : 'বকেয়া আছে') : 'পরিশোধিত'}
                          </span>
                        </div>

                        {cust.Address && (
                          <div className="text-[11px] text-[#737373] flex items-start space-x-1 truncate">
                            <MapPin className="w-3 h-3 text-[#737373] shrink-0 mt-0.5" />
                            <span className="truncate">{cust.Address}</span>
                          </div>
                        )}

                        {/* ব্যালেন্স বক্স */}
                        <div className="bg-[#F5F5F5] p-3 rounded-md border border-neutral-200/80 grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="text-[10px] text-[#737373] uppercase font-medium block">বর্তমান বকেয়া</span>
                            <span className="text-base font-semibold text-[#B91C1C] font-mono tabular-nums">
                              {currencySymbol}{due.toLocaleString('en-US')}
                            </span>
                          </div>

                          <div className="text-right">
                            <span className="text-[10px] text-[#737373] uppercase font-medium flex items-center justify-end gap-1">
                              <span>ক্রেডিট লিমিট</span>
                              <button
                                onClick={() => {
                                  setSelectedCustomerForLimit(cust);
                                  setNewCreditLimit(limit.toString());
                                }}
                                className="text-[#737373] hover:text-[#111111] cursor-pointer p-0.5"
                                title="ক্রেডিট লিমিট পরিবর্তন করুন"
                              >
                                <Edit3 className="w-3 h-3" />
                              </button>
                            </span>
                            <span className="text-xs font-semibold text-[#111111] font-mono tabular-nums">
                              {limit > 0 ? `${currencySymbol}${limit.toLocaleString()}` : 'সীমাহীন'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* অ্যাকশন বাটনসমূহ */}
                      <div className="pt-2 border-t border-neutral-200/80 grid grid-cols-4 gap-1.5">
                        {/* ১. বকেয়া পরিশোধ গ্রহণ বাটন */}
                        <button
                          onClick={() => {
                            setSelectedCustomerForPayment(cust);
                            setPaymentAmount(due > 0 ? due.toString() : '');
                          }}
                          className="col-span-2 min-h-[44px] sm:min-h-[36px] py-2 px-2.5 rounded-md bg-[#0F172A] hover:bg-slate-800 text-white text-xs font-medium flex items-center justify-center space-x-1 transition-colors cursor-pointer"
                          title="টাকা জমা / বকেয়া আদায় করুন"
                        >
                          <PlusCircle className="w-3.5 h-3.5" />
                          <span>বকেয়া আদায়</span>
                        </button>

                        {/* ২. স্টেটমেন্ট / লেজার */}
                        <button
                          onClick={() => setSelectedCustomerForStatement(cust)}
                          className="min-h-[44px] sm:min-h-[36px] py-2 px-2 rounded-md bg-[#F5F5F5] hover:bg-neutral-200/70 border border-neutral-200/80 text-[#111111] text-xs font-medium flex items-center justify-center space-x-1 transition-colors cursor-pointer"
                          title="কাস্টমারের সম্পূর্ণ খতিয়ান স্টেটমেন্ট দেখুন"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline text-[10px]">খতিয়ান</span>
                        </button>

                        {/* ৩. হোয়াটসঅ্যাপ তাগাদা */}
                        <button
                          onClick={() => handleSendWhatsAppReminder(cust)}
                          className="min-h-[44px] sm:min-h-[36px] py-2 px-2 rounded-md bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/80 text-[#15803D] text-xs font-medium flex items-center justify-center space-x-1 transition-colors cursor-pointer"
                          title="হোয়াটসঅ্যাপে বকেয়া তাগাদা পাঠান"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline text-[10px]">তাগাদা</span>
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

      </div>

      {/* ৫. বকেয়া পরিশোধ গ্রহণ পপআপ মডাল (Collect Payment Modal) */}
      {selectedCustomerForPayment && (
        <div className="fixed inset-0 z-60 bg-neutral-900/40 flex items-center justify-center p-3">
          <div className="bg-white rounded-lg border border-neutral-200/80 w-full max-w-lg p-5 sm:p-6 space-y-5 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-200/80">
              <div className="flex items-center space-x-2.5">
                <div className="w-10 h-10 rounded-md bg-[#F5F5F5] border border-neutral-200/80 text-[#0F172A] flex items-center justify-center">
                  <Banknote className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-semibold tracking-tight text-[#111111]">
                    বকেয়া টাকা গ্রহণ (Collect Payment)
                  </h3>
                  <p className="text-xs text-[#525252]">
                    গ্রাহক: <strong className="text-[#111111] font-medium">{selectedCustomerForPayment.CustomerName}</strong> (<span className="font-mono tabular-nums">{selectedCustomerForPayment.Phone}</span>)
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedCustomerForPayment(null)}
                className="min-h-[44px] sm:min-h-[36px] min-w-[44px] sm:min-w-[36px] rounded-md bg-[#F5F5F5] hover:bg-neutral-200/70 text-[#525252] flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handlePaymentSubmit} className="space-y-4">
              {/* বকেয়া স্ট্যাটাস কার্ড */}
              <div className="p-3 bg-amber-50 border border-amber-200/80 rounded-md flex items-center justify-between text-xs">
                <span className="font-medium text-[#B45309]">বর্তমান মোট বকেয়া:</span>
                <span className="text-base font-semibold text-[#B91C1C] font-mono tabular-nums">
                  {currencySymbol}{Number(selectedCustomerForPayment.CurrentDue || 0).toLocaleString()}
                </span>
              </div>

              {/* টাকার পরিমাণ ইনপুট */}
              <div>
                <label className="block text-xs font-medium text-[#525252] mb-1">
                  জমা / পরিশোধের টাকার পরিমাণ ({currencySymbol}) *
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    step="any"
                    required
                    placeholder="0.00"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    className="w-full min-h-[44px] px-4 py-2.5 pr-40 text-lg font-semibold bg-[#FAFAFA] border border-neutral-200/80 rounded-md focus:bg-white focus:outline-none focus:border-[#0F172A] focus:ring-1 focus:ring-[#0F172A] font-mono tabular-nums text-[#111111]"
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center space-x-1">
                    <button
                      type="button"
                      onClick={() => setPaymentAmount(String(selectedCustomerForPayment.CurrentDue || 0))}
                      className="px-2 py-1 bg-white hover:bg-[#F5F5F5] border border-neutral-200/80 rounded-md text-[10px] font-medium text-[#111111] cursor-pointer"
                    >
                      সম্পূর্ণ পরিশোধ
                    </button>
                    {Number(selectedCustomerForPayment.CurrentDue || 0) > 100 && (
                      <button
                        type="button"
                        onClick={() => setPaymentAmount(String(Math.round(Number(selectedCustomerForPayment.CurrentDue || 0) / 2)))}
                        className="px-2 py-1 bg-white hover:bg-[#F5F5F5] border border-neutral-200/80 rounded-md text-[10px] font-medium text-[#111111] cursor-pointer"
                      >
                        অর্ধেক
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* পেমেন্ট মেথড নির্বাচন */}
              <div>
                <label className="block text-xs font-medium text-[#525252] mb-1">
                  পেমেন্ট মাধ্যম (Payment Method) *
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {['Cash', 'bKash', 'Nagad', 'Bank'].map(pm => (
                    <button
                      key={pm}
                      type="button"
                      onClick={() => setPaymentMethod(pm)}
                      className={`min-h-[44px] sm:min-h-[36px] py-2 text-xs font-medium rounded-md border transition-colors cursor-pointer ${
                        paymentMethod === pm
                          ? 'border-[#0F172A] bg-[#0F172A] text-white'
                          : 'bg-white border-neutral-200/80 text-[#525252] hover:bg-[#F5F5F5]'
                      }`}
                    >
                      {pm === 'Cash' ? 'নগদ' : pm === 'Bank' ? 'ব্যাংক' : pm}
                    </button>
                  ))}
                </div>
              </div>

              {/* ট্রানজেকশন আইডি / রেফারেন্স */}
              {paymentMethod !== 'Cash' && (
                <div>
                  <label className="block text-xs font-medium text-[#525252] mb-1">
                    ট্রানজেকশন আইডি / স্লিপ নম্বর (ঐচ্ছিক):
                  </label>
                  <input
                    type="text"
                    placeholder="যেমন: TRXB9828731 বা স্লিপ #104"
                    value={trxId}
                    onChange={(e) => setTrxId(e.target.value)}
                    className="w-full min-h-[44px] sm:min-h-[36px] px-3.5 py-2 text-xs bg-[#FAFAFA] border border-neutral-200/80 rounded-md font-mono focus:bg-white focus:outline-none focus:border-[#0F172A] focus:ring-1 focus:ring-[#0F172A]"
                  />
                </div>
              )}

              {/* রিসিভার নোট */}
              <div>
                <label className="block text-xs font-medium text-[#525252] mb-1">
                  মন্তব্য / নোট (ঐচ্ছিক):
                </label>
                <input
                  type="text"
                  placeholder="যেমন: মাসিক কিস্তি পরিশোধ"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full min-h-[44px] sm:min-h-[36px] px-3.5 py-2 text-xs bg-[#FAFAFA] border border-neutral-200/80 rounded-md focus:bg-white focus:outline-none focus:border-[#0F172A] focus:ring-1 focus:ring-[#0F172A]"
                />
              </div>

              <div className="pt-2 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setSelectedCustomerForPayment(null)}
                  className="min-h-[44px] sm:min-h-[36px] px-4 py-2 rounded-md border border-neutral-200/80 bg-white text-[#111111] text-xs font-medium hover:bg-[#F5F5F5] cursor-pointer"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingPayment}
                  className="min-h-[44px] sm:min-h-[36px] px-6 py-2 rounded-md bg-[#0F172A] hover:bg-slate-800 text-white text-xs font-medium flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingPayment ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>জমা হচ্ছে...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>পরিশোধ নিশ্চিত করুন</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ৬. ক্রেডিট লিমিট পরিবর্তন মডাল */}
      {selectedCustomerForLimit && (
        <div className="fixed inset-0 z-60 bg-neutral-900/40 flex items-center justify-center p-3">
          <div className="bg-white rounded-lg border border-neutral-200/80 w-full max-w-sm p-5 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-2 border-b border-neutral-200/80">
              <h3 className="text-sm font-semibold tracking-tight text-[#111111]">ক্রেডিট লিমিট সেট করুন</h3>
              <button
                onClick={() => setSelectedCustomerForLimit(null)}
                className="min-h-[44px] sm:min-h-[36px] min-w-[44px] sm:min-w-[36px] rounded-md bg-[#F5F5F5] text-[#525252] hover:text-[#111111] flex items-center justify-center cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <form onSubmit={handleCreditLimitSubmit} className="space-y-3">
              <p className="text-xs text-[#525252]">
                গ্রাহক: <strong className="text-[#111111] font-medium">{selectedCustomerForLimit.CustomerName}</strong>
              </p>

              <div>
                <label className="block text-xs font-medium text-[#525252] mb-1">
                  সর্বোচ্চ অনুমোদিত বাকির সীমা ({currencySymbol}):
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={newCreditLimit}
                  onChange={(e) => setNewCreditLimit(e.target.value)}
                  placeholder="যেমন: 10000 (0 হলে সীমাহীন)"
                  className="w-full min-h-[44px] sm:min-h-[36px] px-3.5 py-2 text-sm font-semibold bg-[#FAFAFA] border border-neutral-200/80 rounded-md focus:bg-white focus:outline-none focus:border-[#0F172A] focus:ring-1 focus:ring-[#0F172A] font-mono tabular-nums text-[#111111]"
                />
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setSelectedCustomerForLimit(null)}
                  className="min-h-[44px] sm:min-h-[36px] px-3 py-2 text-xs font-medium text-[#111111] bg-white hover:bg-[#F5F5F5] border border-neutral-200/80 rounded-md cursor-pointer"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingLimit}
                  className="min-h-[44px] sm:min-h-[36px] px-4 py-2 text-xs font-medium text-white bg-[#0F172A] hover:bg-slate-800 rounded-md cursor-pointer"
                >
                  {isUpdatingLimit ? 'সংরক্ষণ হচ্ছে...' : 'সংরক্ষণ করুন'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ৭. কাস্টমার লেজার / খতিয়ান স্টেটমেন্ট ভিউয়ার (Customer Statement Modal) */}
      {selectedCustomerForStatement && (
        <div className="fixed inset-0 z-60 bg-neutral-900/40 flex items-center justify-center p-3">
          <div className="bg-white rounded-lg border border-neutral-200/80 w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95">
            <div className="p-4 sm:p-5 bg-[#FAFAFA] border-b border-neutral-200/80 text-[#111111] flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-base font-semibold tracking-tight text-[#111111]">
                  {selectedCustomerForStatement.CustomerName}-এর খতিয়ান স্টেটমেন্ট
                </h3>
                <p className="text-xs text-[#525252] font-mono tabular-nums mt-0.5">
                  মোবাইল: {selectedCustomerForStatement.Phone} • বর্তমান বকেয়া: {currencySymbol}{Number(selectedCustomerForStatement.CurrentDue || 0).toLocaleString()}
                </p>
              </div>
              <button
                onClick={() => setSelectedCustomerForStatement(null)}
                className="min-h-[44px] sm:min-h-[36px] min-w-[44px] sm:min-w-[36px] rounded-md bg-white hover:bg-[#F5F5F5] border border-neutral-200/80 text-[#525252] hover:text-[#111111] flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 bg-white">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-[#F5F5F5] border-b border-neutral-200/80 text-[#525252] font-medium uppercase text-[10px]">
                      <th className="p-2.5">তারিখ</th>
                      <th className="p-2.5">বিবরণ / মেমো নং</th>
                      <th className="p-2.5 text-right">ডেবিট (ক্রয়)</th>
                      <th className="p-2.5 text-right">ক্রেডিট (পরিশোধ)</th>
                      <th className="p-2.5 text-right">বাকি ব্যালেন্স</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200/80 font-medium text-[#525252]">
                    {(Array.isArray(customerLedger) ? customerLedger : [])
                      .filter(tx => 
                        tx && (
                          (tx.CustomerID && selectedCustomerForStatement?.CustomerID && String(tx.CustomerID) === String(selectedCustomerForStatement.CustomerID)) ||
                          (tx.CustomerPhone && selectedCustomerForStatement?.Phone && String(tx.CustomerPhone).trim() === String(selectedCustomerForStatement.Phone).trim())
                        )
                      )
                      .map((tx) => (
                        <tr key={tx.LedgerID} className="hover:bg-[#FAFAFA]">
                          <td className="p-2.5 font-mono tabular-nums text-[11px] text-[#525252] whitespace-nowrap">
                            {new Date(tx.Timestamp).toLocaleDateString('bn-BD', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </td>
                          <td className="p-2.5">
                            <div className="font-medium text-[#111111]">{tx.Notes || (tx.EntryType === 'Payment' ? 'বকেয়া জমা' : 'বিক্রয় বিল')}</div>
                            {tx.OrderID && <span className="text-[10px] font-mono tabular-nums text-[#525252]">{tx.OrderID}</span>}
                          </td>
                          <td className="p-2.5 text-right font-mono tabular-nums font-semibold text-[#111111]">
                            {Number(tx.Debit || 0) > 0 ? `${currencySymbol}${Number(tx.Debit).toLocaleString()}` : '-'}
                          </td>
                          <td className="p-2.5 text-right font-mono tabular-nums font-semibold text-[#15803D]">
                            {Number(tx.Credit || 0) > 0 ? `${currencySymbol}${Number(tx.Credit).toLocaleString()}` : '-'}
                          </td>
                          <td className="p-2.5 text-right font-mono tabular-nums font-semibold text-[#B91C1C]">
                            {currencySymbol}{Number(tx.Balance || 0).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="p-3 bg-[#FAFAFA] border-t border-neutral-200/80 flex justify-end shrink-0">
              <button
                onClick={() => window.print()}
                className="min-h-[44px] sm:min-h-[36px] px-4 py-2 bg-[#0F172A] hover:bg-slate-800 text-white text-xs font-medium rounded-md flex items-center space-x-1.5 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>স্টেটমেন্ট প্রিন্ট</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ৮. মানি রিসিট ভাউচার প্রিন্ট প্রিভিউ (Money Receipt Modal) */}
      {printedReceiptData && (
        <div className="fixed inset-0 z-70 bg-neutral-900/40 flex items-center justify-center p-3">
          <div className="bg-white rounded-lg border border-neutral-200/80 w-full max-w-md p-6 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-200/80">
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-6 h-6 text-[#15803D]" />
                <h3 className="text-base font-semibold tracking-tight text-[#111111]">মানি রিসিট (Money Receipt)</h3>
              </div>
              <button
                onClick={() => setPrintedReceiptData(null)}
                className="min-h-[44px] sm:min-h-[36px] min-w-[44px] sm:min-w-[36px] rounded-md bg-[#F5F5F5] text-[#525252] hover:text-[#111111] flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div id="money-receipt-print" className="p-4 bg-[#FAFAFA] border border-neutral-200/80 rounded-lg text-xs space-y-3 font-mono tabular-nums">
              <div className="text-center pb-2 border-b border-neutral-200/80 space-y-0.5">
                <h4 className="font-semibold text-base text-[#111111] font-sans">{settings?.StoreName || 'দোকান'}</h4>
                <p className="text-[10px] text-[#525252] font-sans">{settings?.Address}</p>
                <p className="text-[10px] text-[#525252]">ফোন: {settings?.Phone}</p>
              </div>

              <div className="flex justify-between text-[11px] pt-1">
                <span>রিসিট নং: <strong>{printedReceiptData.receiptNo}</strong></span>
                <span>{new Date(printedReceiptData.timestamp).toLocaleDateString('bn-BD')}</span>
              </div>

              <div className="pt-1 border-t border-neutral-200/80 font-sans">
                <div>গ্রাহক: <strong className="text-[#111111]">{printedReceiptData.customerName}</strong></div>
                <div className="font-mono tabular-nums">মোবাইল: {printedReceiptData.customerPhone}</div>
              </div>

              <div className="p-3 bg-white border border-neutral-200/80 rounded-md space-y-1.5 my-2">
                <div className="flex justify-between text-sm font-semibold text-[#15803D]">
                  <span>আদায়কৃত টাকা:</span>
                  <span>{currencySymbol}{printedReceiptData.amount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-[11px] text-[#525252]">
                  <span>পেমেন্ট মাধ্যম:</span>
                  <span>{printedReceiptData.paymentMethod}</span>
                </div>
                {printedReceiptData.trxId && (
                  <div className="flex justify-between text-[10px] text-[#737373]">
                    <span>TrxID:</span>
                    <span>{printedReceiptData.trxId}</span>
                  </div>
                )}
              </div>

              <div className="flex justify-between text-[11px] pt-1 border-t border-neutral-200/80">
                <span>পূর্বের বকেয়া: {currencySymbol}{printedReceiptData.previousDue}</span>
                <span className="font-semibold text-[#B91C1C]">বর্তমান বকেয়া: {currencySymbol}{printedReceiptData.currentDue}</span>
              </div>

              <div className="pt-6 text-center text-[10px] text-[#737373] font-sans">
                আদায়কারী: {printedReceiptData.collectedBy}
              </div>
            </div>

            <div className="pt-2 flex justify-end space-x-2">
              <button
                onClick={() => setPrintedReceiptData(null)}
                className="min-h-[44px] sm:min-h-[36px] px-4 py-2 bg-white hover:bg-[#F5F5F5] border border-neutral-200/80 text-[#111111] text-xs font-medium rounded-md cursor-pointer"
              >
                বন্ধ করুন
              </button>
              <button
                onClick={() => window.print()}
                className="min-h-[44px] sm:min-h-[36px] px-5 py-2 bg-[#0F172A] hover:bg-slate-800 text-white text-xs font-medium rounded-md flex items-center space-x-1.5 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>প্রিন্ট রিসিট</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
