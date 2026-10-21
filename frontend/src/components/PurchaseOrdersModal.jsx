import React, { useState, useMemo } from 'react';
import {
  X,
  Plus,
  Search,
  ShoppingCart,
  PackageCheck,
  Truck,
  CheckCircle2,
  Clock,
  XCircle,
  FileText,
  Printer,
  Trash2,
  AlertCircle,
  Building2,
  Calendar,
  Layers,
  Phone,
  RefreshCw
} from 'lucide-react';

export default function PurchaseOrdersModal({
  isOpen,
  onClose,
  embedded = false,
  purchaseOrders = [],
  suppliers = [],
  products = [],
  currencySymbol = '৳',
  storeName = 'Pabna Bostraloy',
  storeSettings = {},
  onCreatePO,
  onUpdatePOStatus,
  onOpenSuppliersModal
}) {
  const [activeTab, setActiveTab] = useState('list'); // 'list' | 'create'
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'Ordered' | 'Received' | 'Cancelled'
  
  // Create PO Form State
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [poDate, setPoDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [expectedDate, setExpectedDate] = useState('');
  const [orderItems, setOrderItems] = useState([]);
  const [carryingCost, setCarryingCost] = useState(0);
  const [paidAmount, setPaidAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [receiveImmediately, setReceiveImmediately] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Item Picker in Create Form
  const [selectedProductId, setSelectedProductId] = useState('');
  const [itemQuantity, setItemQuantity] = useState(1);
  const [itemUnitCost, setItemUnitCost] = useState(0);

  // Voucher / Printable Memo Preview State
  const [viewingPO, setViewingPO] = useState(null);

  // Filtered Suppliers Map for quick lookup
  const suppliersMap = useMemo(() => {
    const map = {};
    (suppliers || []).forEach(s => {
      map[s.SupplierID] = s;
    });
    return map;
  }, [suppliers]);

  // Selected supplier details
  const currentSupplier = useMemo(() => {
    return suppliers.find(s => String(s.SupplierID) === String(selectedSupplierId));
  }, [suppliers, selectedSupplierId]);

  // Filtered POs
  const filteredPOs = useMemo(() => {
    return (purchaseOrders || []).filter(po => {
      const matchesStatus = statusFilter === 'ALL' || po.Status === statusFilter;
      const q = searchQuery.toLowerCase();
      const matchesSearch = !q ||
        (po.PONumber && String(po.PONumber).toLowerCase().includes(q)) ||
        (po.SupplierName && String(po.SupplierName).toLowerCase().includes(q)) ||
        (po.SupplierID && String(po.SupplierID).toLowerCase().includes(q)) ||
        (po.Notes && String(po.Notes).toLowerCase().includes(q));
      return matchesStatus && matchesSearch;
    }).sort((a, b) => new Date(b.CreatedAt || b.Date || 0) - new Date(a.CreatedAt || a.Date || 0));
  }, [purchaseOrders, statusFilter, searchQuery]);

  // Financial KPIs
  const kpis = useMemo(() => {
    let totalValue = 0;
    let totalPaid = 0;
    let totalDue = 0;
    let orderedCount = 0;
    let receivedCount = 0;

    (purchaseOrders || []).forEach(po => {
      if (po.Status !== 'Cancelled') {
        totalValue += Number(po.TotalAmount || 0);
        totalPaid += Number(po.PaidAmount || 0);
        totalDue += Number(po.DueAmount || 0);
      }
      if (po.Status === 'Ordered') orderedCount++;
      if (po.Status === 'Received') receivedCount++;
    });

    return {
      totalPOs: (purchaseOrders || []).length,
      orderedCount,
      receivedCount,
      totalValue,
      totalPaid,
      totalDue
    };
  }, [purchaseOrders]);

  // Product Selection Change
  const handleProductSelect = (prodId) => {
    setSelectedProductId(prodId);
    if (!prodId) return;
    const prod = products.find(p => String(p.ProductID) === String(prodId));
    if (prod) {
      setItemUnitCost(Number(prod.CostPrice || 0));
      setItemQuantity(1);
    }
  };

  // Add Item to Order
  const handleAddItem = () => {
    if (!selectedProductId) return;
    const prod = products.find(p => String(p.ProductID) === String(selectedProductId));
    if (!prod) return;

    if (itemQuantity <= 0) {
      alert('সঠিক সংখ্যা (Quantity) দিন!');
      return;
    }
    if (itemUnitCost < 0) {
      alert('সঠিক ক্রয়মূল্য দিন!');
      return;
    }

    // Check if already in orderItems
    const existingIndex = orderItems.findIndex(i => String(i.ProductID) === String(selectedProductId));
    if (existingIndex >= 0) {
      const updated = [...orderItems];
      updated[existingIndex].Quantity += Number(itemQuantity);
      updated[existingIndex].UnitCost = Number(itemUnitCost);
      updated[existingIndex].TotalCost = updated[existingIndex].Quantity * Number(itemUnitCost);
      setOrderItems(updated);
    } else {
      setOrderItems([
        ...orderItems,
        {
          ProductID: prod.ProductID,
          ProductName: prod.ProductName,
          SKU: prod.SKU || '',
          Barcode: prod.Barcode || '',
          Quantity: Number(itemQuantity),
          UnitCost: Number(itemUnitCost),
          TotalCost: Number(itemQuantity) * Number(itemUnitCost)
        }
      ]);
    }

    // Reset inputs
    setSelectedProductId('');
    setItemQuantity(1);
    setItemUnitCost(0);
  };

  // Remove Item from Order
  const handleRemoveItem = (index) => {
    setOrderItems(orderItems.filter((_, i) => i !== index));
  };

  // Calculated Order Totals
  const itemsSubtotal = useMemo(() => {
    return orderItems.reduce((sum, item) => sum + (Number(item.TotalCost) || 0), 0);
  }, [orderItems]);

  const grandTotal = useMemo(() => {
    return itemsSubtotal + (Number(carryingCost) || 0);
  }, [itemsSubtotal, carryingCost]);

  const calculatedDue = useMemo(() => {
    return Math.max(0, grandTotal - (Number(paidAmount) || 0));
  }, [grandTotal, paidAmount]);

  // Reset Create Form
  const resetCreateForm = () => {
    setSelectedSupplierId('');
    setPoDate(new Date().toISOString().split('T')[0]);
    setExpectedDate('');
    setOrderItems([]);
    setCarryingCost(0);
    setPaidAmount(0);
    setPaymentMethod('Cash');
    setReference('');
    setNotes('');
    setReceiveImmediately(false);
    setErrorMsg('');
    setSelectedProductId('');
  };

  // Submit New PO
  const handleSubmitPO = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!selectedSupplierId) {
      setErrorMsg('অনুগ্রহ করে একজন সাপ্লায়ার নির্বাচন করুন!');
      return;
    }
    if (orderItems.length === 0) {
      setErrorMsg('কমপক্ষে একটি পণ্য অর্ডারে যুক্ত করুন!');
      return;
    }

    const supp = suppliers.find(s => String(s.SupplierID) === String(selectedSupplierId));
    const now = new Date();
    const poNum = `PO-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${String(Math.floor(100 + Math.random() * 900))}`;

    const newPO = {
      PONumber: poNum,
      SupplierID: supp ? supp.SupplierID : selectedSupplierId,
      SupplierName: supp ? (supp.CompanyName || supp.SupplierName) : 'Unknown Supplier',
      SupplierPhone: supp ? supp.Phone : '',
      Date: poDate,
      ExpectedDate: expectedDate || '',
      Status: receiveImmediately ? 'Received' : 'Ordered',
      Items: orderItems,
      TotalQuantity: orderItems.reduce((acc, i) => acc + (Number(i.Quantity) || 0), 0),
      Subtotal: itemsSubtotal,
      CarryingCost: Number(carryingCost) || 0,
      TotalAmount: grandTotal,
      PaidAmount: Number(paidAmount) || 0,
      DueAmount: calculatedDue,
      PaymentMethod: Number(paidAmount) > 0 ? paymentMethod : 'Due',
      Reference: reference || '',
      Notes: notes || '',
      ReceivedAt: receiveImmediately ? new Date().toISOString() : '',
      CreatedAt: new Date().toISOString()
    };

    setIsSubmitting(true);
    try {
      if (onCreatePO) {
        await onCreatePO(newPO, receiveImmediately);
      }
      resetCreateForm();
      setActiveTab('list');
    } catch (err) {
      console.error('PO Creation error:', err);
      setErrorMsg('পারচেজ অর্ডার তৈরি করতে সমস্যা হয়েছে: ' + (err.message || 'Error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Status Badge Helper
  const renderStatusBadge = (status) => {
    switch (status) {
      case 'Received':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-600" />
            স্টক রিসিভড
          </span>
        );
      case 'Ordered':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
            <Clock className="w-3.5 h-3.5 mr-1 text-amber-600" />
            অর্ডার্ড (পেন্ডিং)
          </span>
        );
      case 'Cancelled':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
            <XCircle className="w-3.5 h-3.5 mr-1 text-rose-600" />
            বাতিলকৃত
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-800">
            {status}
          </span>
        );
    }
  };

  // Parse Items Helper
  const parseItems = (items) => {
    if (!items) return [];
    if (Array.isArray(items)) return items;
    try {
      return JSON.parse(items);
    } catch {
      return [];
    }
  };

  if (!isOpen && !embedded) return null;

  return (
    <div
      className={embedded ? "w-full flex-1 flex flex-col min-h-0 bg-transparent animate-in fade-in duration-200" : "fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-in fade-in duration-200"}
      style={embedded ? {} : { zIndex: 100 }}
    >
      <div className={embedded ? "bg-white rounded-2xl shadow-sm border border-slate-200 w-full flex-1 min-h-[calc(100vh-6.5rem)] flex flex-col overflow-hidden relative" : "bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-6xl max-h-[90vh] my-auto flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 relative"} style={embedded ? {} : { zIndex: 101 }}>
        
        {/* Header */}
        <div className="px-6 py-4.5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3.5">
            <div className="w-11 h-11 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300 shadow-inner">
              <ShoppingCart className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg sm:text-xl font-black tracking-tight">
                  পারচেজ অর্ডার ও স্টক প্রকিউরমেন্ট (Purchase Orders)
                </h2>
                <span className="hidden sm:inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
                  Procurement & Auto-Restock
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                সাপ্লায়ারদের থেকে মালামাল ক্রয়ের ইনভয়েস তৈরি, খরচ হিসাব ও ১-ক্লিকে ইনভেন্টরিতে স্টক ইন করুন
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={onClose}
              className={`rounded-xl transition-all cursor-pointer flex items-center space-x-1 ${
                embedded
                  ? 'px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white font-bold text-xs border border-white/10 shadow-xs'
                  : 'w-9 h-9 bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white justify-center'
              }`}
              title={embedded ? "সেলস ক্যাটালগে ফিরে যান" : "বন্ধ করুন"}
            >
              {embedded ? (
                <>
                  <span className="text-sm font-bold">←</span>
                  <span className="hidden sm:inline">ক্যাটালগে ফিরুন</span>
                </>
              ) : (
                <X className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>

        {/* Tab Buttons & Subheader */}
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center space-x-2 bg-slate-200/70 p-1 rounded-2xl">
            <button
              type="button"
              onClick={() => setActiveTab('list')}
              className={`px-4 py-1.5 rounded-xl text-xs font-black transition-all flex items-center space-x-1.5 cursor-pointer ${
                activeTab === 'list'
                  ? 'bg-white text-indigo-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-indigo-600" />
              <span>সকল পারচেজ অর্ডার ({purchaseOrders.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('create')}
              className={`px-4 py-1.5 rounded-xl text-xs font-black transition-all flex items-center space-x-1.5 cursor-pointer ${
                activeTab === 'create'
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>নতুন পারচেজ অর্ডার তৈরি</span>
            </button>
          </div>

          <div className="flex items-center space-x-2 text-xs">
            {onOpenSuppliersModal && (
              <button
                type="button"
                onClick={onOpenSuppliersModal}
                className="px-3 py-1.5 rounded-xl bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 font-bold flex items-center space-x-1.5 shadow-2xs transition-all cursor-pointer"
              >
                <Truck className="w-3.5 h-3.5 text-indigo-600" />
                <span>সাপ্লায়ার খাতা দেখুন ({suppliers.length})</span>
              </button>
            )}
          </div>
        </div>

        {/* Modal Main Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          
          {/* TAB 1: ALL PURCHASE ORDERS */}
          {activeTab === 'list' && (
            <div className="space-y-6">
              
              {/* Top Financial KPI Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-2xl">
                  <div className="text-[11px] font-bold text-slate-500 uppercase">মোট অর্ডার</div>
                  <div className="text-xl font-black text-slate-900 mt-1">{kpis.totalPOs} টি</div>
                </div>

                <div className="bg-amber-50 border border-amber-200 p-3.5 rounded-2xl">
                  <div className="text-[11px] font-bold text-amber-700 uppercase">পেন্ডিং মালামাল</div>
                  <div className="text-xl font-black text-amber-900 mt-1">{kpis.orderedCount} টি</div>
                </div>

                <div className="bg-emerald-50 border border-emerald-200 p-3.5 rounded-2xl">
                  <div className="text-[11px] font-bold text-emerald-700 uppercase">গৃহীত স্টক</div>
                  <div className="text-xl font-black text-emerald-900 mt-1">{kpis.receivedCount} টি</div>
                </div>

                <div className="bg-indigo-50 border border-indigo-200 p-3.5 rounded-2xl">
                  <div className="text-[11px] font-bold text-indigo-700 uppercase">মোট ক্রয়মূল্য</div>
                  <div className="text-xl font-black text-indigo-950 mt-1">{currencySymbol}{kpis.totalValue.toLocaleString()}</div>
                </div>

                <div className="bg-blue-50 border border-blue-200 p-3.5 rounded-2xl">
                  <div className="text-[11px] font-bold text-blue-700 uppercase">পরিশোধিত টাকা</div>
                  <div className="text-xl font-black text-blue-900 mt-1">{currencySymbol}{kpis.totalPaid.toLocaleString()}</div>
                </div>

                <div className="bg-rose-50 border border-rose-200 p-3.5 rounded-2xl">
                  <div className="text-[11px] font-bold text-rose-700 uppercase">মোট বকেয়া দেনা</div>
                  <div className="text-xl font-black text-rose-900 mt-1">{currencySymbol}{kpis.totalDue.toLocaleString()}</div>
                </div>
              </div>

              {/* Filter and Search Bar */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="relative flex-1 w-full">
                  <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="পিও নম্বর (PO No), সাপ্লায়ারের নাম বা নোট লিখে খুঁজুন..."
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-2xl text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Status Filter Buttons */}
                <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-2xl shrink-0 self-stretch sm:self-auto justify-center">
                  {[
                    { id: 'ALL', label: 'সকল' },
                    { id: 'Ordered', label: 'পেন্ডিং' },
                    { id: 'Received', label: 'রিসিভড' },
                    { id: 'Cancelled', label: 'বাতিল' }
                  ].map(f => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setStatusFilter(f.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        statusFilter === f.id
                          ? 'bg-white text-indigo-900 shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Purchase Orders Table */}
              {filteredPOs.length === 0 ? (
                <div className="bg-slate-50 border border-slate-200 rounded-3xl p-12 text-center">
                  <div className="w-14 h-14 bg-indigo-50 text-indigo-400 rounded-2xl flex items-center justify-center mx-auto mb-3">
                    <ShoppingCart className="w-7 h-7" />
                  </div>
                  <h4 className="text-base font-bold text-slate-800">কোনো পারচেজ অর্ডার পাওয়া যায়নি</h4>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                    {searchQuery || statusFilter !== 'ALL'
                      ? 'সার্চ বা ফিল্টার পরিবর্তন করে পুনরায় চেষ্টা করুন।'
                      : 'নতুন মালামাল ক্রয়ের জন্য উপরের "নতুন পারচেজ অর্ডার তৈরি" বাটনে ক্লিক করুন।'}
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveTab('create')}
                    className="mt-4 px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold text-xs hover:bg-indigo-700 transition-colors cursor-pointer"
                  >
                    + নতুন অর্ডার তৈরি করুন
                  </button>
                </div>
              ) : (
                <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                        <tr>
                          <th className="py-3 px-4">অর্ডার বিবরণ</th>
                          <th className="py-3 px-4">সাপ্লায়ার</th>
                          <th className="py-3 px-4">আইটেম ও পরিমাণ</th>
                          <th className="py-3 px-4 text-right">মোট মূল্য</th>
                          <th className="py-3 px-4 text-right">পরিশোধ</th>
                          <th className="py-3 px-4 text-right">বকেয়া</th>
                          <th className="py-3 px-4 text-center">স্ট্যাটাস</th>
                          <th className="py-3 px-4 text-center">একশন</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredPOs.map((po) => {
                          const items = parseItems(po.Items);
                          const isOrdered = po.Status === 'Ordered';
                          return (
                            <tr key={po.PONumber} className="hover:bg-slate-50/80 transition-colors">
                              <td className="py-3.5 px-4">
                                <div className="font-black text-slate-900 text-xs flex items-center space-x-1.5">
                                  <span>{po.PONumber}</span>
                                </div>
                                <div className="text-[11px] text-slate-500 flex items-center space-x-1 mt-0.5">
                                  <Calendar className="w-3 h-3 text-slate-400" />
                                  <span>{po.Date || 'অজানা তারিখ'}</span>
                                </div>
                              </td>

                              <td className="py-3.5 px-4">
                                <div className="font-bold text-slate-800 text-xs">
                                  {po.SupplierName || 'সাধারণ সাপ্লায়ার'}
                                </div>
                                {po.SupplierPhone && (
                                  <div className="text-[11px] text-slate-500 flex items-center space-x-1 mt-0.5">
                                    <Phone className="w-3 h-3 text-slate-400" />
                                    <span>{po.SupplierPhone}</span>
                                  </div>
                                )}
                              </td>

                              <td className="py-3.5 px-4">
                                <div className="font-bold text-slate-700 text-xs">
                                  {po.TotalQuantity || items.reduce((s, i) => s + (Number(i.Quantity) || 0), 0)} পিস ({items.length} আইটেম)
                                </div>
                                <div className="text-[10px] text-slate-500 truncate max-w-[180px] mt-0.5" title={items.map(i => `${i.ProductName} (${i.Quantity})`).join(', ')}>
                                  {items.map(i => `${i.ProductName} (${i.Quantity})`).join(', ') || 'বিবরণ নেই'}
                                </div>
                              </td>

                              <td className="py-3.5 px-4 text-right font-black text-slate-900">
                                {currencySymbol}{Number(po.TotalAmount || 0).toLocaleString()}
                              </td>

                              <td className="py-3.5 px-4 text-right font-bold text-emerald-700">
                                {currencySymbol}{Number(po.PaidAmount || 0).toLocaleString()}
                              </td>

                              <td className="py-3.5 px-4 text-right font-black text-rose-600">
                                {currencySymbol}{Number(po.DueAmount || 0).toLocaleString()}
                              </td>

                              <td className="py-3.5 px-4 text-center">
                                {renderStatusBadge(po.Status)}
                              </td>

                              <td className="py-3.5 px-4 text-center">
                                <div className="flex items-center justify-center space-x-1.5">
                                  {/* 1-Click Receive Stock Button */}
                                  {isOrdered && onUpdatePOStatus && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (window.confirm(`আপনি কি নিশ্চিত যে "${po.PONumber}" অর্ডারের সমস্ত মালামাল গ্রহণ করেছেন? এটি স্বয়ংক্রিয়ভাবে ইনভেন্টরিতে স্টক বাড়িয়ে দেবে!`)) {
                                          onUpdatePOStatus(po.PONumber, 'Received');
                                        }
                                      }}
                                      className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white font-bold text-[11px] hover:bg-emerald-700 flex items-center space-x-1 shadow-2xs transition-colors cursor-pointer"
                                      title="মালামাল গ্রহণ করে স্টক ইন করুন"
                                    >
                                      <PackageCheck className="w-3.5 h-3.5" />
                                      <span className="hidden md:inline">স্টক ইন</span>
                                    </button>
                                  )}

                                  {/* View / Print Memo Button */}
                                  <button
                                    type="button"
                                    onClick={() => setViewingPO(po)}
                                    className="p-1.5 rounded-lg bg-slate-100 hover:bg-indigo-50 text-slate-700 hover:text-indigo-600 transition-colors cursor-pointer"
                                    title="চালান / ভাউচার দেখুন ও প্রিন্ট করুন"
                                  >
                                    <FileText className="w-4 h-4" />
                                  </button>

                                  {/* Cancel Button */}
                                  {isOrdered && onUpdatePOStatus && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (window.confirm(`আপনি কি নিশ্চিত যে "${po.PONumber}" অর্ডারটি বাতিল করতে চান?`)) {
                                          onUpdatePOStatus(po.PONumber, 'Cancelled');
                                        }
                                      }}
                                      className="p-1.5 rounded-lg bg-slate-100 hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                                      title="অর্ডার বাতিল করুন"
                                    >
                                      <X className="w-4 h-4" />
                                    </button>
                                  )}
                                </div>
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
          )}

          {/* TAB 2: CREATE NEW PURCHASE ORDER */}
          {activeTab === 'create' && (
            <form onSubmit={handleSubmitPO} className="space-y-6">
              {errorMsg && (
                <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Supplier & Date Selection Row */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-4.5 rounded-2xl border border-slate-200">
                {/* Supplier Picker */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-slate-800 flex items-center space-x-1.5">
                      <Building2 className="w-4 h-4 text-indigo-600" />
                      <span>সাপ্লায়ার নির্বাচন করুন *</span>
                    </label>
                    {onOpenSuppliersModal && (
                      <button
                        type="button"
                        onClick={onOpenSuppliersModal}
                        className="text-[11px] text-indigo-600 hover:underline font-bold"
                      >
                        + নতুন সাপ্লায়ার
                      </button>
                    )}
                  </div>
                  <select
                    value={selectedSupplierId}
                    onChange={(e) => setSelectedSupplierId(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    <option value="">-- সাপ্লায়ার বেছে নিন --</option>
                    {suppliers.map(s => (
                      <option key={s.SupplierID} value={s.SupplierID}>
                        {s.CompanyName || s.SupplierName} ({s.Phone || 'ফোন নম্বর নেই'}) {Number(s.DueAmount) > 0 ? `[বকেয়া: ৳${Number(s.DueAmount)}]` : ''}
                      </option>
                    ))}
                  </select>

                  {currentSupplier && (
                    <div className="mt-2 text-[11px] text-slate-600 bg-white p-2 rounded-lg border border-slate-200 space-y-0.5">
                      <div>কোম্পানি: <strong className="text-slate-800">{currentSupplier.CompanyName}</strong></div>
                      <div>মোবাইল: <strong className="text-slate-800">{currentSupplier.Phone}</strong></div>
                      <div>বর্তমান দেনা/বকেয়া: <strong className="text-rose-600">৳{Number(currentSupplier.DueAmount || 0).toLocaleString()}</strong></div>
                    </div>
                  )}
                </div>

                {/* PO Date */}
                <div>
                  <label className="text-xs font-bold text-slate-800 mb-1.5 block">
                    অর্ডারের তারিখ *
                  </label>
                  <input
                    type="date"
                    value={poDate}
                    onChange={(e) => setPoDate(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                {/* Expected Delivery Date */}
                <div>
                  <label className="text-xs font-bold text-slate-800 mb-1.5 block">
                    সম্ভাব্য মালামাল পৌঁছানোর তারিখ (ঐচ্ছিক)
                  </label>
                  <input
                    type="date"
                    value={expectedDate}
                    onChange={(e) => setExpectedDate(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Product Selection & Add to Order */}
              <div className="bg-indigo-50/50 border border-indigo-100 p-4.5 rounded-2xl space-y-3">
                <div className="text-xs font-bold text-indigo-950 flex items-center space-x-1.5">
                  <PackageCheck className="w-4 h-4 text-indigo-600" />
                  <span>পণ্য নির্বাচন ও অর্ডারে যুক্ত করুন</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                  {/* Product Dropdown */}
                  <div className="sm:col-span-6">
                    <label className="text-[11px] font-bold text-slate-700 mb-1 block">
                      পণ্য নির্বাচন করুন (ইনভেন্টরি থেকে)
                    </label>
                    <select
                      value={selectedProductId}
                      onChange={(e) => handleProductSelect(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    >
                      <option value="">-- পণ্য সিলেক্ট করুন --</option>
                      {products.map(p => (
                        <option key={p.ProductID} value={p.ProductID}>
                          {p.ProductName} (বর্তমান স্টক: {p.StockQuantity || 0} {p.Unit || 'পিস'} | ক্রয়মূল্য: ৳{p.CostPrice || 0})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Quantity */}
                  <div className="sm:col-span-2">
                    <label className="text-[11px] font-bold text-slate-700 mb-1 block">
                      পরিমাণ (Qty)
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={itemQuantity}
                      onChange={(e) => setItemQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm font-bold text-center focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>

                  {/* Unit Purchase Cost */}
                  <div className="sm:col-span-2">
                    <label className="text-[11px] font-bold text-slate-700 mb-1 block">
                      একক ক্রয়মূল্য (৳)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={itemUnitCost}
                      onChange={(e) => setItemUnitCost(Math.max(0, parseFloat(e.target.value) || 0))}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm font-bold text-right focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>

                  {/* Add Button */}
                  <div className="sm:col-span-2">
                    <button
                      type="button"
                      onClick={handleAddItem}
                      disabled={!selectedProductId}
                      className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white rounded-xl text-xs font-bold transition-all shadow-2xs flex items-center justify-center space-x-1 cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>যোগ করুন</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Order Items Table */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
                <div className="bg-slate-100 px-4 py-2.5 font-bold text-xs text-slate-700 flex items-center justify-between">
                  <span>অর্ডারের তালিকাভুক্ত মালামাল ({orderItems.length} টি)</span>
                  <span className="text-indigo-700">সাবটোটাল: {currencySymbol}{itemsSubtotal.toLocaleString()}</span>
                </div>

                {orderItems.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-400">
                    এখনও কোনো পণ্য অর্ডারে যুক্ত করা হয়নি। উপরের ড্রপডাউন থেকে পণ্য সিলেক্ট করে যোগ করুন।
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-[10px] border-b border-slate-200">
                        <tr>
                          <th className="py-2.5 px-4">#</th>
                          <th className="py-2.5 px-4">পণ্যের নাম</th>
                          <th className="py-2.5 px-4 text-center">পরিমাণ</th>
                          <th className="py-2.5 px-4 text-right">একক ক্রয়মূল্য</th>
                          <th className="py-2.5 px-4 text-right">মোট ক্রয়মূল্য</th>
                          <th className="py-2.5 px-4 text-center">মুছুন</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {orderItems.map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="py-2.5 px-4 text-slate-400 font-mono">{idx + 1}</td>
                            <td className="py-2.5 px-4">
                              <div className="font-bold text-slate-800">{item.ProductName}</div>
                              {item.SKU && <div className="text-[10px] text-slate-400 font-mono">SKU: {item.SKU}</div>}
                            </td>
                            <td className="py-2.5 px-4 text-center font-black text-slate-900">
                              {item.Quantity}
                            </td>
                            <td className="py-2.5 px-4 text-right font-medium text-slate-700">
                              {currencySymbol}{item.UnitCost.toFixed(2)}
                            </td>
                            <td className="py-2.5 px-4 text-right font-black text-indigo-950">
                              {currencySymbol}{item.TotalCost.toFixed(2)}
                            </td>
                            <td className="py-2.5 px-4 text-center">
                              <button
                                type="button"
                                onClick={() => handleRemoveItem(idx)}
                                className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Financial Breakdown & Payment Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                {/* Notes and Options */}
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-slate-700 mb-1.5 block">
                      অর্ডার সম্পর্কিত নোট / মন্তব্য
                    </label>
                    <textarea
                      rows="3"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="অর্ডার ও সাপ্লায়ার সম্পর্কিত কোনো বিশেষ শর্ত বা মন্তব্য..."
                      className="w-full p-3 bg-white border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>

                  {/* Immediate Receive Checkbox */}
                  <label className="flex items-start space-x-3 p-3.5 bg-emerald-50/60 border border-emerald-200 rounded-2xl cursor-pointer">
                    <input
                      type="checkbox"
                      checked={receiveImmediately}
                      onChange={(e) => setReceiveImmediately(e.target.checked)}
                      className="mt-1 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                    />
                    <div>
                      <span className="text-xs font-bold text-emerald-950 block">
                        মালামাল এখনই ইনভেন্টরিতে সরাসরি যুক্ত করুন (Direct Stock Influx)
                      </span>
                      <span className="text-[11px] text-emerald-700">
                        চেক করা থাকলে অর্ডার সংরক্ষণ করার সাথে সাথেই ইনভেন্টরিতে স্টক বেড়ে যাবে এবং স্ট্যাটাস "Received" হবে।
                      </span>
                    </div>
                  </label>
                </div>

                {/* Totals & Payment Calculations */}
                <div className="bg-slate-50 border border-slate-200 p-4.5 rounded-2xl space-y-3.5">
                  <div className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-200 pb-2">
                    মূল্য ও পেমেন্ট হিসাব
                  </div>

                  <div className="flex justify-between items-center text-xs text-slate-600">
                    <span>পণ্যের মোট ক্রয়মূল্য (Subtotal):</span>
                    <span className="font-bold text-slate-900">{currencySymbol}{itemsSubtotal.toFixed(2)}</span>
                  </div>

                  <div className="flex justify-between items-center text-xs text-slate-600">
                    <span>পরিবহন ও আনুষঙ্গিক খরচ (Carrying):</span>
                    <div className="w-28">
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={carryingCost}
                        onChange={(e) => setCarryingCost(Math.max(0, parseFloat(e.target.value) || 0))}
                        className="w-full px-2 py-1 bg-white border border-slate-300 rounded-lg text-xs font-bold text-right"
                      />
                    </div>
                  </div>

                  <div className="flex justify-between items-center text-sm font-black text-indigo-950 border-t border-slate-200 pt-2">
                    <span>সর্বমোট বিল (Grand Total):</span>
                    <span className="text-base text-indigo-600">{currencySymbol}{grandTotal.toFixed(2)}</span>
                  </div>

                  {/* Payment Inputs */}
                  <div className="space-y-2 pt-2 border-t border-dashed border-slate-200">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[11px] font-bold text-slate-700 block mb-1">
                          পরিশোধিত টাকা (Paid)
                        </label>
                        <input
                          type="number"
                          min="0"
                          max={grandTotal}
                          step="any"
                          value={paidAmount}
                          onChange={(e) => setPaidAmount(Math.max(0, Math.min(grandTotal, parseFloat(e.target.value) || 0)))}
                          className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-black text-emerald-700 text-right"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-slate-700 block mb-1">
                          পেমেন্ট মেথড
                        </label>
                        <select
                          value={paymentMethod}
                          onChange={(e) => setPaymentMethod(e.target.value)}
                          disabled={paidAmount <= 0}
                          className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium"
                        >
                          <option value="Cash">নগদ (Cash)</option>
                          <option value="Bank">ব্যাংক (Bank)</option>
                          <option value="bKash">বিকাশ (bKash)</option>
                          <option value="Nagad">নগদ (Nagad)</option>
                          <option value="Due">বাকি (Due)</option>
                        </select>
                      </div>
                    </div>

                    {paidAmount > 0 && paymentMethod !== 'Cash' && (
                      <div>
                        <label className="text-[10px] font-bold text-slate-600 block mb-0.5">
                          ট্রানজেকশন আইডি / চেক নং
                        </label>
                        <input
                          type="text"
                          value={reference}
                          onChange={(e) => setReference(e.target.value)}
                          placeholder="TrxID / Cheque Number"
                          className="w-full px-3 py-1 bg-white border border-slate-300 rounded-lg text-xs"
                        />
                      </div>
                    )}

                    <div className="flex justify-between items-center text-xs font-black pt-2 text-rose-600 bg-rose-50/70 p-2.5 rounded-xl border border-rose-100">
                      <span>অবশিষ্ট বকেয়া দেনা (Due):</span>
                      <span className="text-sm">{currencySymbol}{calculatedDue.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    resetCreateForm();
                    setActiveTab('list');
                  }}
                  className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  বাতিল করুন
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting || orderItems.length === 0}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 text-white text-xs font-black hover:from-indigo-700 hover:to-indigo-800 disabled:opacity-50 transition-all shadow-md shadow-indigo-200 flex items-center space-x-2 cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>সংরক্ষণ হচ্ছে...</span>
                    </>
                  ) : (
                    <>
                      <PackageCheck className="w-4 h-4" />
                      <span>পারচেজ অর্ডার কনফার্ম ও সংরক্ষণ</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

        </div>
      </div>

      {/* PO Printable Invoice / Voucher Modal Preview */}
      {viewingPO && (
        <div
          className="fixed inset-0 z-[110] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 overflow-y-auto animate-in fade-in"
          style={{ zIndex: 110 }}
        >
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-2xl w-full my-auto overflow-hidden flex flex-col max-h-[90vh] relative" style={{ zIndex: 111 }}>
            
            {/* Modal Header */}
            <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between no-print">
              <div className="flex items-center space-x-2">
                <FileText className="w-4 h-4 text-indigo-400" />
                <span className="font-bold text-sm">পারচেজ অর্ডার চালান ভাউচার (#{viewingPO.PONumber})</span>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center space-x-1 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>প্রিন্ট করুন</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewingPO(null)}
                  className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Printable Memo Content */}
            <div className="p-6 sm:p-8 overflow-y-auto space-y-6 text-slate-900 text-xs printable-voucher">
              
              {/* Store & Header */}
              <div className="border-b-2 border-slate-900 pb-4 flex justify-between items-start">
                <div>
                  <h1 className="text-xl font-black text-slate-950 uppercase tracking-tight">{storeName}</h1>
                  <p className="text-slate-500 text-[11px] mt-0.5">{storeSettings.Address || 'দোকানের ঠিকানা'}</p>
                  <p className="text-slate-500 text-[11px]">মোবাইল: {storeSettings.Phone || 'ফোন নম্বর'}</p>
                </div>
                <div className="text-right">
                  <div className="text-xs font-black uppercase tracking-wider px-2 py-1 bg-slate-100 rounded border border-slate-300 inline-block mb-1">
                    PURCHASE ORDER
                  </div>
                  <div className="font-mono font-bold text-sm text-indigo-900">{viewingPO.PONumber}</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">তারিখ: {viewingPO.Date}</div>
                </div>
              </div>

              {/* Supplier Info Box */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 flex justify-between items-start">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">সাপ্লায়ার বিবরণ</span>
                  <div className="font-bold text-sm text-slate-900 mt-0.5">{viewingPO.SupplierName}</div>
                  {viewingPO.SupplierPhone && <div className="text-[11px] text-slate-600">মোবাইল: {viewingPO.SupplierPhone}</div>}
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">অর্ডার স্ট্যাটাস</span>
                  <div className="mt-1">{renderStatusBadge(viewingPO.Status)}</div>
                </div>
              </div>

              {/* Items Table */}
              <table className="w-full text-left text-xs border-collapse">
                <thead className="border-y-2 border-slate-800 bg-slate-50 font-bold uppercase text-[10px]">
                  <tr>
                    <th className="py-2 px-2">#</th>
                    <th className="py-2 px-2">পণ্যের নাম</th>
                    <th className="py-2 px-2 text-center">পরিমাণ</th>
                    <th className="py-2 px-2 text-right">একক মূল্য</th>
                    <th className="py-2 px-2 text-right">মোট মূল্য</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {parseItems(viewingPO.Items).map((item, idx) => (
                    <tr key={idx}>
                      <td className="py-2 px-2 text-slate-400 font-mono">{idx + 1}</td>
                      <td className="py-2 px-2 font-bold text-slate-900">
                        {item.ProductName}
                        {item.SKU && <span className="block text-[10px] text-slate-400 font-mono">SKU: {item.SKU}</span>}
                      </td>
                      <td className="py-2 px-2 text-center font-bold text-slate-900">{item.Quantity}</td>
                      <td className="py-2 px-2 text-right text-slate-700">{currencySymbol}{Number(item.UnitCost || 0).toFixed(2)}</td>
                      <td className="py-2 px-2 text-right font-black text-slate-950">{currencySymbol}{Number(item.TotalCost || 0).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Totals Summary */}
              <div className="flex justify-end pt-2">
                <div className="w-64 space-y-1.5 border-t border-slate-200 pt-2 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>পণ্যের উপ-মোট:</span>
                    <span className="font-bold text-slate-900">{currencySymbol}{Number(viewingPO.Subtotal || 0).toFixed(2)}</span>
                  </div>
                  {Number(viewingPO.CarryingCost) > 0 && (
                    <div className="flex justify-between text-slate-600">
                      <span>পরিবহন খরচ:</span>
                      <span className="font-bold text-slate-900">{currencySymbol}{Number(viewingPO.CarryingCost).toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm font-black border-y border-slate-800 py-1.5 text-slate-950">
                    <span>সর্বমোট বিল:</span>
                    <span>{currencySymbol}{Number(viewingPO.TotalAmount || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-emerald-700 font-bold">
                    <span>পরিশোধিত:</span>
                    <span>{currencySymbol}{Number(viewingPO.PaidAmount || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-rose-700 font-black">
                    <span>বকেয়া দেনা:</span>
                    <span>{currencySymbol}{Number(viewingPO.DueAmount || 0).toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Notes */}
              {viewingPO.Notes && (
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-[11px] text-slate-600">
                  <strong>মন্তব্য / নোট:</strong> {viewingPO.Notes}
                </div>
              )}

              {/* Signature Lines */}
              <div className="grid grid-cols-2 gap-12 pt-14 text-center text-xs text-slate-600">
                <div className="border-t border-dashed border-slate-400 pt-1.5">
                  কর্তৃপক্ষের স্বাক্ষর
                </div>
                <div className="border-t border-dashed border-slate-400 pt-1.5">
                  সাপ্লায়ার / ডেলিভারি প্রতিনিধি
                </div>
              </div>

            </div>

          </div>
        </div>
      )}

    </div>
  );
}

