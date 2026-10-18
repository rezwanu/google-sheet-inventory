import React, { useState, useMemo } from 'react';
import {
  X,
  Search,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  Phone,
  MessageSquare,
  MessageCircle,
  Printer,
  Calendar,
  CheckCircle2,
  Clock,
  Send,
  User,
  MapPin,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  FileText,
  CreditCard,
  Banknote,
  Smartphone,
  Sparkles,
  ShieldAlert,
  ArrowDownLeft,
  ArrowUpRight,
  Filter,
  RefreshCw,
  PlusCircle,
  Edit3
} from 'lucide-react';
import StoreLogo from './StoreLogo';

export default function CustomerLedgerModal({
  isOpen,
  onClose,
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200/90 w-full max-w-6xl max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* ১. আধুনিক হেডার ও ক্লোজ বাটন */}
        <div className="p-4 sm:p-6 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3.5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-rose-500 to-amber-500 flex items-center justify-center shadow-lg shadow-rose-500/30 shrink-0">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg sm:text-xl font-black tracking-tight">
                  বাকির খাতা ও কাস্টমার লেজার (Due & Credit Ledger)
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  ফেজ ২
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                গ্রাহকদের বকেয়া ব্যবস্থাপনা, কিস্তি ও আংশিক পরিশোধ আদায়, ক্রেডিট লিমিট ও স্বয়ংক্রিয় তাগাদা ইঞ্জিন
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-2xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ২. টপ মেট্রিক্স কার্ডস গ্রিড (Executive Metric Banners) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 p-4 sm:p-6 bg-slate-50 border-b border-slate-200/80 shrink-0">
          {/* মোট বকেয়া পাওনা */}
          <div className="bg-white p-4 rounded-2xl border border-rose-200 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider">মোট বকেয়া পাওনা</span>
              <div className="w-7 h-7 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                <DollarSign className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="mt-2 text-xl sm:text-2xl font-black text-rose-600 font-mono tracking-tight">
              {currencySymbol}{metrics.totalDue.toLocaleString('en-US')}
            </div>
            <span className="text-[10px] text-slate-400 mt-0.5 block">কাস্টমারদের কাছে মোট পাওনা</span>
          </div>

          {/* বাকিদার কাস্টমার সংখ্যা */}
          <div className="bg-white p-4 rounded-2xl border border-amber-200 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider">বাকিদার কাস্টমার</span>
              <div className="w-7 h-7 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <User className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="mt-2 text-xl sm:text-2xl font-black text-amber-800 font-mono tracking-tight">
              {metrics.dueCustomersCount} <span className="text-xs font-semibold text-slate-500">জন</span>
            </div>
            <span className="text-[10px] text-slate-400 mt-0.5 block">যাদের নিকট টাকা বাকি রয়েছে</span>
          </div>

          {/* চলতি মাসে বকেয়া আদায় */}
          <div className="bg-white p-4 rounded-2xl border border-emerald-200 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider">চলতি মাসে আদায়</span>
              <div className="w-7 h-7 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <TrendingUp className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="mt-2 text-xl sm:text-2xl font-black text-emerald-600 font-mono tracking-tight">
              {currencySymbol}{metrics.monthCollected.toLocaleString('en-US')}
            </div>
            <span className="text-[10px] text-slate-400 mt-0.5 block">নগদ বা ব্যাংকে সংগৃহীত বকেয়া</span>
          </div>

          {/* লিমিট অতিক্রান্ত সতর্কবার্তা */}
          <div className="bg-white p-4 rounded-2xl border border-purple-200 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider">লিমিট অতিক্রান্ত</span>
              <div className="w-7 h-7 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                <ShieldAlert className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="mt-2 text-xl sm:text-2xl font-black text-purple-900 font-mono tracking-tight">
              {metrics.limitExceededCount} <span className="text-xs font-semibold text-slate-500">জন</span>
            </div>
            <span className="text-[10px] text-purple-600 font-bold mt-0.5 block">ক্রেডিট লিমিট ছাড়া বাকি</span>
          </div>
        </div>

        {/* ৩. ট্যাব সুইচিং ও সার্চ ফিল্টার বার */}
        <div className="p-4 bg-white border-b border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-2xl shrink-0">
            <button
              onClick={() => setActiveTab('due')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                activeTab === 'due'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              বকেয়া তালিকা ({metrics.dueCustomersCount})
            </button>
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                activeTab === 'all'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              সকল গ্রাহক ({customers.length})
            </button>
            <button
              onClick={() => setActiveTab('transactions')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                activeTab === 'transactions'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              লেনদেন হিস্ট্রি ({customerLedger.length})
            </button>
          </div>

          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="গ্রাহকের নাম, মোবাইল, অর্ডার বা ট্রানজেকশন দিয়ে খুঁজুন..."
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
            />
          </div>
        </div>

        {/* ৪. প্রধান স্ক্রোলেবল বডি কনটেন্ট */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50/50">
          {activeTab === 'transactions' ? (
            /* ৪.১ লেনদেন হিস্ট্রি টেবিল */
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
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
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {filteredTransactions.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="p-8 text-center text-slate-400 font-bold">
                        কোনো লেনদেন রেকর্ড পাওয়া যায়নি।
                      </td>
                    </tr>
                  ) : (
                    filteredTransactions.map((tx) => (
                      <tr key={tx.LedgerID} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-3 pl-4 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                          {new Date(tx.Timestamp).toLocaleString('bn-BD', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </td>
                        <td className="p-3 font-bold text-slate-900">
                          <div>{tx.CustomerName}</div>
                          <div className="text-[11px] text-slate-400 font-mono">{tx.CustomerPhone}</div>
                        </td>
                        <td className="p-3">
                          <div className="font-semibold">{tx.Notes || 'বকেয়া লেনদেন'}</div>
                          {tx.OrderID && (
                            <span className="text-[10px] font-mono text-indigo-600 bg-indigo-50 px-1 py-0.2 rounded">
                              {tx.OrderID}
                            </span>
                          )}
                        </td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                            tx.EntryType === 'Payment'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}>
                            {tx.EntryType === 'Payment' ? '✓ পরিশোধ' : '⚡ বাকি বিক্রয়'}
                          </span>
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-slate-800">
                          {Number(tx.Debit || 0) > 0 ? `${currencySymbol}${Number(tx.Debit).toLocaleString()}` : '-'}
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-emerald-600">
                          {Number(tx.Credit || 0) > 0 ? `${currencySymbol}${Number(tx.Credit).toLocaleString()}` : '-'}
                        </td>
                        <td className="p-3 text-right font-mono font-black text-rose-600">
                          {currencySymbol}{Number(tx.Balance || 0).toLocaleString()}
                        </td>
                        <td className="p-3 pr-4 text-center">
                          <span className="text-[10px] font-bold text-slate-600 block">{tx.PaymentMethod || 'Cash'}</span>
                          <span className="text-[9px] text-slate-400 block">{tx.CollectedBy || 'Admin'}</span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            /* ৪.২ কাস্টমার বকেয়া রেজিস্টার কার্ড তালিকা */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredCustomers.length === 0 ? (
                <div className="col-span-full bg-white rounded-3xl p-10 text-center border border-slate-200">
                  <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
                  <h3 className="text-base font-black text-slate-800">কোনো বকেয়া রেকর্ড পাওয়া যায়নি!</h3>
                  <p className="text-xs text-slate-500 mt-1">সব কাস্টমারের হিসাব পরিশোধিত রয়েছে অথবা সার্চের সাথে কোনো গ্রাহক মিলেনি।</p>
                </div>
              ) : (
                filteredCustomers.map((cust) => {
                  const due = Number(cust.CurrentDue || 0);
                  const limit = Number(cust.CreditLimit || 0);
                  const isOverLimit = limit > 0 && due > limit;

                  return (
                    <div
                      key={cust.CustomerID || cust.Phone}
                      className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-xs hover:shadow-md transition-all space-y-3.5 flex flex-col justify-between"
                    >
                      <div className="space-y-2.5">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h3 className="text-sm font-black text-slate-900 leading-tight">
                              {cust.CustomerName}
                            </h3>
                            <div className="flex items-center space-x-1 text-slate-500 text-xs font-mono mt-0.5">
                              <Phone className="w-3 h-3 text-slate-400" />
                              <a href={`tel:${cust.Phone}`} className="hover:text-indigo-600">{cust.Phone}</a>
                            </div>
                          </div>

                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black shrink-0 ${
                            due > 0
                              ? isOverLimit
                                ? 'bg-rose-100 text-rose-800 border border-rose-300 animate-pulse'
                                : 'bg-amber-100 text-amber-800 border border-amber-200'
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          }`}>
                            {due > 0 ? (isOverLimit ? 'লিমিট অতিক্রম' : 'বকেয়া আছে') : 'পরিশোধিত'}
                          </span>
                        </div>

                        {cust.Address && (
                          <div className="text-[11px] text-slate-400 flex items-start space-x-1 truncate">
                            <MapPin className="w-3 h-3 text-slate-400 shrink-0 mt-0.5" />
                            <span className="truncate">{cust.Address}</span>
                          </div>
                        )}

                        {/* ব্যালেন্স বক্স */}
                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="text-[10px] text-slate-400 uppercase font-bold block">বর্তমান বকেয়া</span>
                            <span className="text-base font-black text-rose-600 font-mono">
                              {currencySymbol}{due.toLocaleString('en-US')}
                            </span>
                          </div>

                          <div className="text-right">
                            <span className="text-[10px] text-slate-400 uppercase font-bold block flex items-center justify-end gap-1">
                              <span>ক্রেডিট লিমিট</span>
                              <button
                                onClick={() => {
                                  setSelectedCustomerForLimit(cust);
                                  setNewCreditLimit(limit.toString());
                                }}
                                className="text-slate-400 hover:text-indigo-600"
                                title="ক্রেডিট লিমিট পরিবর্তন করুন"
                              >
                                <Edit3 className="w-2.5 h-2.5" />
                              </button>
                            </span>
                            <span className="text-xs font-bold text-slate-700 font-mono">
                              {limit > 0 ? `${currencySymbol}${limit.toLocaleString()}` : 'সীমাহীন'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* অ্যাকশন বাটনসমূহ */}
                      <div className="pt-2 border-t border-slate-100 grid grid-cols-4 gap-1.5">
                        {/* ১. বকেয়া পরিশোধ গ্রহণ বাটন */}
                        <button
                          onClick={() => {
                            setSelectedCustomerForPayment(cust);
                            setPaymentAmount(due > 0 ? due.toString() : '');
                          }}
                          className="col-span-2 py-2 px-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-black flex items-center justify-center space-x-1 shadow-sm transition-all cursor-pointer active:scale-95"
                          title="টাকা জমা / বকেয়া আদায় করুন"
                        >
                          <PlusCircle className="w-3.5 h-3.5" />
                          <span>বকেয়া আদায়</span>
                        </button>

                        {/* ২. স্টেটমেন্ট / লেজার */}
                        <button
                          onClick={() => setSelectedCustomerForStatement(cust)}
                          className="py-2 px-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center justify-center space-x-1 transition-all cursor-pointer"
                          title="কাস্টমারের সম্পূর্ণ খতিয়ান স্টেটমেন্ট দেখুন"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline text-[10px]">খতিয়ান</span>
                        </button>

                        {/* ৩. হোয়াটসঅ্যাপ তাগাদা */}
                        <button
                          onClick={() => handleSendWhatsAppReminder(cust)}
                          className="py-2 px-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold flex items-center justify-center space-x-1 transition-all cursor-pointer"
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
        <div className="fixed inset-0 z-60 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-3">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg p-5 sm:p-6 space-y-5 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2.5">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Banknote className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    বকেয়া টাকা গ্রহণ (Collect Payment)
                  </h3>
                  <p className="text-xs text-slate-500">
                    গ্রাহক: <strong className="text-slate-800">{selectedCustomerForPayment.CustomerName}</strong> ({selectedCustomerForPayment.Phone})
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedCustomerForPayment(null)}
                className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handlePaymentSubmit} className="space-y-4">
              {/* বকেয়া স্ট্যাটাস কার্ড */}
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl flex items-center justify-between text-xs">
                <span className="font-bold text-amber-900">বর্তমান মোট বকেয়া:</span>
                <span className="text-base font-black text-rose-600 font-mono">
                  {currencySymbol}{Number(selectedCustomerForPayment.CurrentDue || 0).toLocaleString()}
                </span>
              </div>

              {/* টাকার পরিমাণ ইনপুট */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
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
                    className="w-full px-4 py-2.5 text-lg font-black bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center space-x-1">
                    <button
                      type="button"
                      onClick={() => setPaymentAmount(String(selectedCustomerForPayment.CurrentDue || 0))}
                      className="px-2 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded text-[10px] font-bold text-slate-600 shadow-2xs"
                    >
                      সম্পূর্ণ পরিশোধ
                    </button>
                    {Number(selectedCustomerForPayment.CurrentDue || 0) > 100 && (
                      <button
                        type="button"
                        onClick={() => setPaymentAmount(String(Math.round(Number(selectedCustomerForPayment.CurrentDue || 0) / 2)))}
                        className="px-2 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded text-[10px] font-bold text-slate-600 shadow-2xs"
                      >
                        অর্ধেক
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* পেমেন্ট মেথড নির্বাচন */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  পেমেন্ট মাধ্যম (Payment Method) *
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {['Cash', 'bKash', 'Nagad', 'Bank'].map(pm => (
                    <button
                      key={pm}
                      type="button"
                      onClick={() => setPaymentMethod(pm)}
                      className={`py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                        paymentMethod === pm
                          ? 'bg-emerald-50 border-emerald-500 text-emerald-800 ring-2 ring-emerald-500/20'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
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
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    ট্রানজেকশন আইডি / স্লিপ নম্বর (ঐচ্ছিক):
                  </label>
                  <input
                    type="text"
                    placeholder="যেমন: TRXB9828731 বা স্লিপ #104"
                    value={trxId}
                    onChange={(e) => setTrxId(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              )}

              {/* রিসিভার নোট */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  মন্তব্য / নোট (ঐচ্ছিক):
                </label>
                <input
                  type="text"
                  placeholder="যেমন: মাসিক কিস্তি পরিশোধ"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setSelectedCustomerForPayment(null)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-100"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingPayment}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-black shadow-md flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
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
        <div className="fixed inset-0 z-60 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-3">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-sm p-5 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-sm font-black text-slate-900">ক্রেডিট লিমিট সেট করুন</h3>
              <button
                onClick={() => setSelectedCustomerForLimit(null)}
                className="w-7 h-7 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <form onSubmit={handleCreditLimitSubmit} className="space-y-3">
              <p className="text-xs text-slate-500">
                গ্রাহক: <strong className="text-slate-800">{selectedCustomerForLimit.CustomerName}</strong>
              </p>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  সর্বোচ্চ অনুমোদিত বাকির সীমা ({currencySymbol}):
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={newCreditLimit}
                  onChange={(e) => setNewCreditLimit(e.target.value)}
                  placeholder="যেমন: 10000 (0 হলে সীমাহীন)"
                  className="w-full px-3.5 py-2 text-sm font-bold bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                />
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setSelectedCustomerForLimit(null)}
                  className="px-3 py-2 text-xs font-bold text-slate-600 bg-slate-100 rounded-xl"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingLimit}
                  className="px-4 py-2 text-xs font-black text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs"
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
        <div className="fixed inset-0 z-60 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-3">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95">
            <div className="p-4 sm:p-5 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-base font-black">
                  {selectedCustomerForStatement.CustomerName}-এর খতিয়ান স্টেটমেন্ট
                </h3>
                <p className="text-xs text-slate-300 font-mono">
                  মোবাইল: {selectedCustomerForStatement.Phone} • বর্তমান বকেয়া: {currencySymbol}{Number(selectedCustomerForStatement.CurrentDue || 0).toLocaleString()}
                </p>
              </div>
              <button
                onClick={() => setSelectedCustomerForStatement(null)}
                className="w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                    <th className="p-2.5">তারিখ</th>
                    <th className="p-2.5">বিবরণ / মেমো নং</th>
                    <th className="p-2.5 text-right">ডেবিট (ক্রয়)</th>
                    <th className="p-2.5 text-right">ক্রেডিট (পরিশোধ)</th>
                    <th className="p-2.5 text-right">বাকি ব্যালেন্স</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {(Array.isArray(customerLedger) ? customerLedger : [])
                    .filter(tx => 
                      tx && (
                        (tx.CustomerID && selectedCustomerForStatement?.CustomerID && String(tx.CustomerID) === String(selectedCustomerForStatement.CustomerID)) ||
                        (tx.CustomerPhone && selectedCustomerForStatement?.Phone && String(tx.CustomerPhone).trim() === String(selectedCustomerForStatement.Phone).trim())
                      )
                    )
                    .map((tx) => (
                      <tr key={tx.LedgerID} className="hover:bg-slate-50">
                        <td className="p-2.5 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                          {new Date(tx.Timestamp).toLocaleDateString('bn-BD', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </td>
                        <td className="p-2.5">
                          <div className="font-semibold text-slate-800">{tx.Notes || (tx.EntryType === 'Payment' ? 'বকেয়া জমা' : 'বিক্রয় বিল')}</div>
                          {tx.OrderID && <span className="text-[10px] font-mono text-indigo-600">{tx.OrderID}</span>}
                        </td>
                        <td className="p-2.5 text-right font-mono font-bold text-slate-800">
                          {Number(tx.Debit || 0) > 0 ? `${currencySymbol}${Number(tx.Debit).toLocaleString()}` : '-'}
                        </td>
                        <td className="p-2.5 text-right font-mono font-bold text-emerald-600">
                          {Number(tx.Credit || 0) > 0 ? `${currencySymbol}${Number(tx.Credit).toLocaleString()}` : '-'}
                        </td>
                        <td className="p-2.5 text-right font-mono font-black text-rose-600">
                          {currencySymbol}{Number(tx.Balance || 0).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>

            <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-xl flex items-center space-x-1 cursor-pointer"
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
        <div className="fixed inset-0 z-70 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-3">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-md p-6 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                <h3 className="text-base font-black text-slate-900">মানি রিসিট (Money Receipt)</h3>
              </div>
              <button
                onClick={() => setPrintedReceiptData(null)}
                className="w-8 h-8 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div id="money-receipt-print" className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs space-y-3 font-mono">
              <div className="text-center pb-2 border-b border-slate-200 space-y-0.5">
                <h4 className="font-black text-base text-slate-900 font-sans">{settings?.StoreName || 'দোকান'}</h4>
                <p className="text-[10px] text-slate-500">{settings?.Address}</p>
                <p className="text-[10px] text-slate-500">ফোন: {settings?.Phone}</p>
              </div>

              <div className="flex justify-between text-[11px] pt-1">
                <span>রিসিট নং: <strong>{printedReceiptData.receiptNo}</strong></span>
                <span>{new Date(printedReceiptData.timestamp).toLocaleDateString('bn-BD')}</span>
              </div>

              <div className="pt-1 border-t border-slate-200/60">
                <div>গ্রাহক: <strong>{printedReceiptData.customerName}</strong></div>
                <div>মোবাইল: {printedReceiptData.customerPhone}</div>
              </div>

              <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-1.5 my-2">
                <div className="flex justify-between text-sm font-black text-emerald-700">
                  <span>আদায়কৃত টাকা:</span>
                  <span>{currencySymbol}{printedReceiptData.amount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-[11px] text-slate-500">
                  <span>পেমেন্ট মাধ্যম:</span>
                  <span>{printedReceiptData.paymentMethod}</span>
                </div>
                {printedReceiptData.trxId && (
                  <div className="flex justify-between text-[10px] text-slate-400">
                    <span>TrxID:</span>
                    <span>{printedReceiptData.trxId}</span>
                  </div>
                )}
              </div>

              <div className="flex justify-between text-[11px] pt-1 border-t border-slate-200">
                <span>পূর্বের বকেয়া: {currencySymbol}{printedReceiptData.previousDue}</span>
                <span className="font-bold text-rose-600">বর্তমান বকেয়া: {currencySymbol}{printedReceiptData.currentDue}</span>
              </div>

              <div className="pt-6 text-center text-[10px] text-slate-400">
                আদায়কারী: {printedReceiptData.collectedBy}
              </div>
            </div>

            <div className="pt-2 flex justify-end space-x-2">
              <button
                onClick={() => setPrintedReceiptData(null)}
                className="px-4 py-2 bg-slate-100 text-slate-700 text-xs font-bold rounded-xl"
              >
                বন্ধ করুন
              </button>
              <button
                onClick={() => window.print()}
                className="px-5 py-2 bg-slate-900 text-white text-xs font-bold rounded-xl flex items-center space-x-1"
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

