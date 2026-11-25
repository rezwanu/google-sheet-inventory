import React, { useState, useMemo, useEffect } from 'react';
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
  RefreshCw,
  Warehouse,
  Store,
  Info
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
  onOpenSuppliersModal,
  initialPrefill = null
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
  const [receiveLocation, setReceiveLocation] = useState('Godown'); // 'Godown' | 'Shop' (Gap 3-গ)
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Gap 3(খ ও গ): মালামাল গ্রহণ লোকেশন ডায়ালগ স্টেট
  const [receiveModalPO, setReceiveModalPO] = useState(null); // { po, location: 'Godown' }

  // Item Picker in Create Form
  const [selectedProductId, setSelectedProductId] = useState('');
  const [itemQuantity, setItemQuantity] = useState(1);
  const [itemUnitCost, setItemUnitCost] = useState(0);

  // Gap 2: প্রাক-পূরণ প্রপস হ্যান্ডলিং (১-ক্লিক PO ফ্লো)
  useEffect(() => {
    if (initialPrefill && initialPrefill.product) {
      setActiveTab('create');
      const prod = initialPrefill.product;
      const qty = Number(initialPrefill.quantity) || 5;
      const cost = Number(prod.CostPrice) || 0;
      setSelectedProductId(prod.ProductID);
      setItemQuantity(qty);
      setItemUnitCost(cost);
      if (prod.SupplierID) {
        setSelectedSupplierId(prod.SupplierID);
      }
    }
  }, [initialPrefill]);

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
      ReceivingLocation: receiveImmediately ? receiveLocation : 'Godown',
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
          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-50 text-[#15803D] border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-[#15803D]" />
            স্টক রিসিভড
          </span>
        );
      case 'Ordered':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-amber-50 text-[#B45309] border border-amber-200">
            <Clock className="w-3.5 h-3.5 mr-1 text-[#B45309]" />
            অর্ডার্ড (পেন্ডিং)
          </span>
        );
      case 'Cancelled':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-red-50 text-[#B91C1C] border border-red-200">
            <XCircle className="w-3.5 h-3.5 mr-1 text-[#B91C1C]" />
            বাতিলকৃত
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-[#F5F5F5] text-[#111111] border border-neutral-200/80">
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
      className={embedded ? "w-full flex-1 flex flex-col min-h-0 bg-transparent animate-in fade-in duration-200" : "fixed inset-0 z-[100] bg-neutral-900/40 flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-in fade-in duration-200"}
      style={embedded ? {} : { zIndex: 100 }}
    >
      <div className={embedded ? "bg-white rounded-lg border border-neutral-200/80 w-full flex-1 min-h-[calc(100vh-6.5rem)] flex flex-col overflow-hidden relative" : "bg-white rounded-lg border border-neutral-200/80 w-full max-w-6xl max-h-[90vh] my-auto flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 relative"} style={embedded ? {} : { zIndex: 101 }}>
        
        {/* Header */}
        <div className="px-6 py-4 bg-[#0F172A] text-white flex items-center justify-between shrink-0 border-b border-slate-800">
          <div className="flex items-center space-x-3.5">
            <div className="w-10 h-10 rounded-lg bg-white/10 border border-white/15 flex items-center justify-center text-white shrink-0">
              <ShoppingCart className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg sm:text-xl font-semibold tracking-tight text-white">
                  পারচেজ অর্ডার ও স্টক প্রকিউরমেন্ট (Purchase Orders)
                </h2>
                <span className="hidden sm:inline-block px-2.5 py-0.5 rounded-md text-[10px] font-semibold bg-white/10 text-slate-200 border border-white/15">
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
              type="button"
              onClick={onClose}
              className={`min-h-[44px] sm:min-h-[36px] rounded-md transition-colors cursor-pointer flex items-center space-x-1 ${
                embedded
                  ? 'px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white font-semibold text-xs border border-white/15'
                  : 'min-w-[44px] sm:min-w-[36px] w-9 h-9 bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white justify-center'
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

        {/* Tab Buttons & Subheader */}
        <div className="bg-[#FAFAFA] border-b border-neutral-200/80 px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center space-x-1.5 bg-[#F5F5F5] p-1 rounded-md border border-neutral-200/80">
            <button
              type="button"
              onClick={() => setActiveTab('list')}
              className={`min-h-[44px] sm:min-h-[36px] px-4 py-1.5 rounded-md text-xs font-semibold transition-colors flex items-center space-x-1.5 cursor-pointer ${
                activeTab === 'list'
                  ? 'bg-[#0F172A] text-white'
                  : 'text-[#525252] hover:text-[#111111]'
              }`}
            >
              <Layers className={`w-3.5 h-3.5 ${activeTab === 'list' ? 'text-white' : 'text-[#525252]'}`} />
              <span>সকল পারচেজ অর্ডার (<span className="font-mono tabular-nums">{purchaseOrders.length}</span>)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('create')}
              className={`min-h-[44px] sm:min-h-[36px] px-4 py-1.5 rounded-md text-xs font-semibold transition-colors flex items-center space-x-1.5 cursor-pointer ${
                activeTab === 'create'
                  ? 'bg-[#0F172A] text-white'
                  : 'text-[#525252] hover:text-[#111111]'
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
                className="min-h-[44px] sm:min-h-[36px] px-3 py-1.5 rounded-md bg-white border border-neutral-200/80 text-[#111111] hover:bg-[#F5F5F5] font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer"
              >
                <Truck className="w-3.5 h-3.5 text-[#525252]" />
                <span>সাপ্লায়ার খাতা দেখুন (<span className="font-mono tabular-nums">{suppliers.length}</span>)</span>
              </button>
            )}
          </div>
        </div>

        {/* Modal Main Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 bg-[#FAFAFA]">
          
          {/* TAB 1: ALL PURCHASE ORDERS */}
          {activeTab === 'list' && (
            <div className="space-y-6">
              
              {/* Top Financial KPI Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <div className="bg-white border border-neutral-200/80 p-3.5 rounded-lg">
                  <div className="text-[11px] font-semibold text-[#525252] uppercase">মোট অর্ডার</div>
                  <div className="text-xl font-semibold font-mono tabular-nums text-[#111111] mt-1">{kpis.totalPOs} টি</div>
                </div>

                <div className="bg-amber-50/60 border border-amber-200 p-3.5 rounded-lg">
                  <div className="text-[11px] font-semibold text-[#B45309] uppercase">পেন্ডিং মালামাল</div>
                  <div className="text-xl font-semibold font-mono tabular-nums text-[#B45309] mt-1">{kpis.orderedCount} টি</div>
                </div>

                <div className="bg-emerald-50/60 border border-emerald-200 p-3.5 rounded-lg">
                  <div className="text-[11px] font-semibold text-[#15803D] uppercase">গৃহীত স্টক</div>
                  <div className="text-xl font-semibold font-mono tabular-nums text-[#15803D] mt-1">{kpis.receivedCount} টি</div>
                </div>

                <div className="bg-white border border-neutral-200/80 p-3.5 rounded-lg">
                  <div className="text-[11px] font-semibold text-[#525252] uppercase">মোট ক্রয়মূল্য</div>
                  <div className="text-xl font-semibold font-mono tabular-nums text-[#111111] mt-1">{currencySymbol}{kpis.totalValue.toLocaleString()}</div>
                </div>

                <div className="bg-white border border-neutral-200/80 p-3.5 rounded-lg">
                  <div className="text-[11px] font-semibold text-[#525252] uppercase">পরিশোধিত টাকা</div>
                  <div className="text-xl font-semibold font-mono tabular-nums text-[#15803D] mt-1">{currencySymbol}{kpis.totalPaid.toLocaleString()}</div>
                </div>

                <div className="bg-red-50/60 border border-red-200 p-3.5 rounded-lg">
                  <div className="text-[11px] font-semibold text-[#B91C1C] uppercase">মোট বকেয়া দেনা</div>
                  <div className="text-xl font-semibold font-mono tabular-nums text-[#B91C1C] mt-1">{currencySymbol}{kpis.totalDue.toLocaleString()}</div>
                </div>
              </div>

              {/* Filter and Search Bar */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="relative flex-1 w-full">
                  <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#737373]" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="পিও নম্বর (PO No), সাপ্লায়ারের নাম বা নোট লিখে খুঁজুন..."
                    className="w-full min-h-[44px] sm:min-h-[36px] pl-10 pr-8 py-2 bg-white border border-neutral-200/80 rounded-md text-xs sm:text-sm font-medium text-[#111111] focus:outline-none focus:ring-2 focus:ring-[#0F172A]/10 focus:border-[#0F172A]"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#737373] hover:text-[#111111] cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Status Filter Buttons */}
                <div className="flex items-center space-x-1 bg-[#F5F5F5] border border-neutral-200/80 p-1 rounded-md shrink-0 self-stretch sm:self-auto justify-center">
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
                      className={`min-h-[44px] sm:min-h-[36px] px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                        statusFilter === f.id
                          ? 'bg-[#0F172A] text-white'
                          : 'text-[#525252] hover:text-[#111111]'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Purchase Orders Table */}
              {filteredPOs.length === 0 ? (
                <div className="bg-white border border-neutral-200/80 rounded-lg p-12 text-center">
                  <div className="w-12 h-12 bg-[#F5F5F5] text-[#525252] border border-neutral-200/80 rounded-lg flex items-center justify-center mx-auto mb-3">
                    <ShoppingCart className="w-6 h-6" />
                  </div>
                  <h4 className="text-base font-semibold text-[#111111]">কোনো পারচেজ অর্ডার পাওয়া যায়নি</h4>
                  <p className="text-xs text-[#525252] mt-1 max-w-sm mx-auto">
                    {searchQuery || statusFilter !== 'ALL'
                      ? 'সার্চ বা ফিল্টার পরিবর্তন করে পুনরায় চেষ্টা করুন।'
                      : 'নতুন মালামাল ক্রয়ের জন্য উপরের "নতুন পারচেজ অর্ডার তৈরি" বাটনে ক্লিক করুন।'}
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveTab('create')}
                    className="mt-4 min-h-[44px] sm:min-h-[36px] px-4 py-2 rounded-md bg-[#0F172A] text-white font-semibold text-xs hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    + নতুন অর্ডার তৈরি করুন
                  </button>
                </div>
              ) : (
                <div className="bg-white border border-neutral-200/80 rounded-lg overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-[#F5F5F5] text-[#525252] font-semibold uppercase text-[10px] tracking-wider border-b border-neutral-200/80">
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
                      <tbody className="divide-y divide-neutral-200/80">
                        {filteredPOs.map((po) => {
                          const items = parseItems(po.Items);
                          const isOrdered = po.Status === 'Ordered';
                          return (
                            <tr key={po.PONumber} className="hover:bg-[#FAFAFA] transition-colors">
                              <td className="py-3.5 px-4">
                                <div className="font-mono tabular-nums font-semibold text-[#111111] text-xs flex items-center space-x-1.5">
                                  <span>{po.PONumber}</span>
                                </div>
                                <div className="text-[11px] font-mono tabular-nums text-[#525252] flex items-center space-x-1 mt-0.5">
                                  <Calendar className="w-3 h-3 text-[#737373]" />
                                  <span>{po.Date || 'অজানা তারিখ'}</span>
                                </div>
                              </td>

                              <td className="py-3.5 px-4">
                                <div className="font-semibold text-[#111111] text-xs">
                                  {po.SupplierName || 'সাধারণ সাপ্লায়ার'}
                                </div>
                                {po.SupplierPhone && (
                                  <div className="text-[11px] font-mono tabular-nums text-[#525252] flex items-center space-x-1 mt-0.5">
                                    <Phone className="w-3 h-3 text-[#737373]" />
                                    <span>{po.SupplierPhone}</span>
                                  </div>
                                )}
                              </td>

                              <td className="py-3.5 px-4">
                                <div className="font-semibold font-mono tabular-nums text-[#111111] text-xs">
                                  {po.TotalQuantity || items.reduce((s, i) => s + (Number(i.Quantity) || 0), 0)} পিস ({items.length} আইটেম)
                                </div>
                                <div className="text-[10px] text-[#525252] truncate max-w-[180px] mt-0.5" title={items.map(i => `${i.ProductName} (${i.Quantity})`).join(', ')}>
                                  {items.map(i => `${i.ProductName} (${i.Quantity})`).join(', ') || 'বিবরণ নেই'}
                                </div>
                              </td>

                              <td className="py-3.5 px-4 text-right font-mono tabular-nums font-semibold text-[#111111]">
                                {currencySymbol}{Number(po.TotalAmount || 0).toLocaleString()}
                              </td>

                              <td className="py-3.5 px-4 text-right font-mono tabular-nums font-semibold text-[#15803D]">
                                {currencySymbol}{Number(po.PaidAmount || 0).toLocaleString()}
                              </td>

                              <td className="py-3.5 px-4 text-right font-mono tabular-nums font-semibold text-[#B91C1C]">
                                {currencySymbol}{Number(po.DueAmount || 0).toLocaleString()}
                              </td>

                              <td className="py-3.5 px-4 text-center">
                                {renderStatusBadge(po.Status)}
                              </td>

                              <td className="py-3.5 px-4 text-center">
                                <div className="flex items-center justify-center space-x-1.5">
                                  {/* 1-Click Receive Stock Button with Location Selector */}
                                  {isOrdered && onUpdatePOStatus && (
                                    <button
                                      type="button"
                                      onClick={() => setReceiveModalPO({ po, location: 'Godown' })}
                                      className="min-h-[44px] sm:min-h-[36px] px-2.5 py-1 rounded-md bg-[#15803D] text-white font-semibold text-[11px] hover:bg-emerald-800 flex items-center space-x-1 transition-colors cursor-pointer"
                                      title="মালামাল গ্রহণ করে অবস্থান অনুযায়ী স্টক ইন করুন"
                                    >
                                      <PackageCheck className="w-3.5 h-3.5" />
                                      <span className="hidden md:inline">স্টক ইন</span>
                                    </button>
                                  )}

                                  {/* View / Print Memo Button */}
                                  <button
                                    type="button"
                                    onClick={() => setViewingPO(po)}
                                    className="min-h-[44px] sm:min-h-[36px] min-w-[44px] sm:min-w-[36px] p-1.5 rounded-md bg-[#F5F5F5] hover:bg-neutral-200 border border-neutral-200/80 text-[#111111] transition-colors flex items-center justify-center cursor-pointer"
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
                                      className="min-h-[44px] sm:min-h-[36px] min-w-[44px] sm:min-w-[36px] p-1.5 rounded-md bg-[#F5F5F5] hover:bg-red-50 border border-neutral-200/80 text-[#737373] hover:text-[#B91C1C] transition-colors flex items-center justify-center cursor-pointer"
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
                <div className="p-3.5 rounded-lg bg-red-50 border border-red-200 text-[#B91C1C] text-xs font-semibold flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 text-[#B91C1C] shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Supplier & Date Selection Row */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white p-4.5 rounded-lg border border-neutral-200/80">
                {/* Supplier Picker */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-[#111111] flex items-center space-x-1.5">
                      <Building2 className="w-4 h-4 text-[#525252]" />
                      <span>সাপ্লায়ার নির্বাচন করুন *</span>
                    </label>
                    {onOpenSuppliersModal && (
                      <button
                        type="button"
                        onClick={onOpenSuppliersModal}
                        className="text-[11px] text-[#0F172A] hover:underline font-semibold cursor-pointer"
                      >
                        + নতুন সাপ্লায়ার
                      </button>
                    )}
                  </div>
                  <select
                    value={selectedSupplierId}
                    onChange={(e) => setSelectedSupplierId(e.target.value)}
                    required
                    className="w-full min-h-[44px] sm:min-h-[36px] px-3 py-2 bg-[#FAFAFA] border border-neutral-200/80 rounded-md text-xs sm:text-sm font-medium text-[#111111] focus:bg-white focus:ring-2 focus:ring-[#0F172A]/10 focus:border-[#0F172A] focus:outline-none"
                  >
                    <option value="">-- সাপ্লায়ার বেছে নিন --</option>
                    {suppliers.map(s => (
                      <option key={s.SupplierID} value={s.SupplierID}>
                        {s.CompanyName || s.SupplierName} ({s.Phone || 'ফোন নম্বর নেই'}) {Number(s.DueAmount) > 0 ? `[বকেয়া: ৳${Number(s.DueAmount)}]` : ''}
                      </option>
                    ))}
                  </select>

                  {currentSupplier && (
                    <div className="mt-2 text-[11px] text-[#525252] bg-[#FAFAFA] p-2 rounded-md border border-neutral-200/80 space-y-0.5">
                      <div>কোম্পানি: <strong className="text-[#111111]">{currentSupplier.CompanyName}</strong></div>
                      <div>মোবাইল: <strong className="text-[#111111] font-mono tabular-nums">{currentSupplier.Phone}</strong></div>
                      <div>বর্তমান দেনা/বকেয়া: <strong className="text-[#B91C1C] font-mono tabular-nums">৳{Number(currentSupplier.DueAmount || 0).toLocaleString()}</strong></div>
                    </div>
                  )}
                </div>

                {/* PO Date */}
                <div>
                  <label className="text-xs font-semibold text-[#111111] mb-1.5 block">
                    অর্ডারের তারিখ *
                  </label>
                  <input
                    type="date"
                    value={poDate}
                    onChange={(e) => setPoDate(e.target.value)}
                    required
                    className="w-full min-h-[44px] sm:min-h-[36px] px-3 py-2 bg-[#FAFAFA] border border-neutral-200/80 rounded-md text-xs sm:text-sm font-mono tabular-nums font-medium text-[#111111] focus:bg-white focus:ring-2 focus:ring-[#0F172A]/10 focus:border-[#0F172A] focus:outline-none"
                  />
                </div>

                {/* Expected Delivery Date */}
                <div>
                  <label className="text-xs font-semibold text-[#111111] mb-1.5 block">
                    সম্ভাব্য মালামাল পৌঁছানোর তারিখ (ঐচ্ছিক)
                  </label>
                  <input
                    type="date"
                    value={expectedDate}
                    onChange={(e) => setExpectedDate(e.target.value)}
                    className="w-full min-h-[44px] sm:min-h-[36px] px-3 py-2 bg-[#FAFAFA] border border-neutral-200/80 rounded-md text-xs sm:text-sm font-mono tabular-nums font-medium text-[#111111] focus:bg-white focus:ring-2 focus:ring-[#0F172A]/10 focus:border-[#0F172A] focus:outline-none"
                  />
                </div>
              </div>

              {/* Product Selection & Add to Order */}
              <div className="bg-white border border-neutral-200/80 p-4.5 rounded-lg space-y-3">
                <div className="text-xs font-semibold text-[#111111] flex items-center space-x-1.5">
                  <PackageCheck className="w-4 h-4 text-[#0F172A]" />
                  <span>পণ্য নির্বাচন ও অর্ডারে যুক্ত করুন</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                  {/* Product Dropdown */}
                  <div className="sm:col-span-6">
                    <label className="text-[11px] font-semibold text-[#525252] mb-1 block">
                      পণ্য নির্বাচন করুন (ইনভেন্টরি থেকে)
                    </label>
                    <select
                      value={selectedProductId}
                      onChange={(e) => handleProductSelect(e.target.value)}
                      className="w-full min-h-[44px] sm:min-h-[36px] px-3 py-2 bg-[#FAFAFA] border border-neutral-200/80 rounded-md text-xs sm:text-sm font-medium text-[#111111] focus:bg-white focus:ring-2 focus:ring-[#0F172A]/10 focus:border-[#0F172A] focus:outline-none"
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
                    <label className="text-[11px] font-semibold text-[#525252] mb-1 block">
                      পরিমাণ (Qty)
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={itemQuantity}
                      onChange={(e) => setItemQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))}
                      className="w-full min-h-[44px] sm:min-h-[36px] px-3 py-2 bg-[#FAFAFA] border border-neutral-200/80 rounded-md text-xs sm:text-sm font-mono tabular-nums font-semibold text-center text-[#111111] focus:bg-white focus:ring-2 focus:ring-[#0F172A]/10 focus:border-[#0F172A] focus:outline-none"
                    />
                  </div>

                  {/* Unit Purchase Cost */}
                  <div className="sm:col-span-2">
                    <label className="text-[11px] font-semibold text-[#525252] mb-1 block">
                      একক ক্রয়মূল্য (৳)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={itemUnitCost}
                      onChange={(e) => setItemUnitCost(Math.max(0, parseFloat(e.target.value) || 0))}
                      className="w-full min-h-[44px] sm:min-h-[36px] px-3 py-2 bg-[#FAFAFA] border border-neutral-200/80 rounded-md text-xs sm:text-sm font-mono tabular-nums font-semibold text-right text-[#111111] focus:bg-white focus:ring-2 focus:ring-[#0F172A]/10 focus:border-[#0F172A] focus:outline-none"
                    />
                  </div>

                  {/* Add Button */}
                  <div className="sm:col-span-2">
                    <button
                      type="button"
                      onClick={handleAddItem}
                      disabled={!selectedProductId}
                      className="w-full min-h-[44px] sm:min-h-[36px] py-2 bg-[#0F172A] hover:bg-slate-800 disabled:bg-neutral-300 text-white rounded-md text-xs font-semibold transition-colors flex items-center justify-center space-x-1 cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>যোগ করুন</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Order Items Table */}
              <div className="bg-white border border-neutral-200/80 rounded-lg overflow-hidden">
                <div className="bg-[#F5F5F5] px-4 py-2.5 font-semibold text-xs text-[#111111] flex items-center justify-between border-b border-neutral-200/80">
                  <span>অর্ডারের তালিকাভুক্ত মালামাল (<span className="font-mono tabular-nums">{orderItems.length}</span> টি)</span>
                  <span className="text-[#111111] font-mono tabular-nums">সাবটোটাল: {currencySymbol}{itemsSubtotal.toLocaleString()}</span>
                </div>

                {orderItems.length === 0 ? (
                  <div className="py-8 text-center text-xs text-[#737373]">
                    এখনও কোনো পণ্য অর্ডারে যুক্ত করা হয়নি। উপরের ড্রপডাউন থেকে পণ্য সিলেক্ট করে যোগ করুন।
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#FAFAFA] text-[#525252] font-semibold uppercase text-[10px] border-b border-neutral-200/80">
                        <tr>
                          <th className="py-2.5 px-4">#</th>
                          <th className="py-2.5 px-4">পণ্যের নাম</th>
                          <th className="py-2.5 px-4 text-center">পরিমাণ</th>
                          <th className="py-2.5 px-4 text-right">একক ক্রয়মূল্য</th>
                          <th className="py-2.5 px-4 text-right">মোট ক্রয়মূল্য</th>
                          <th className="py-2.5 px-4 text-center">মুছুন</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-200/80">
                        {orderItems.map((item, idx) => (
                          <tr key={idx} className="hover:bg-[#FAFAFA]">
                            <td className="py-2.5 px-4 text-[#737373] font-mono tabular-nums">{idx + 1}</td>
                            <td className="py-2.5 px-4">
                              <div className="font-semibold text-[#111111]">{item.ProductName}</div>
                              {item.SKU && <div className="text-[10px] text-[#737373] font-mono tabular-nums">SKU: {item.SKU}</div>}
                            </td>
                            <td className="py-2.5 px-4 text-center font-mono tabular-nums font-semibold text-[#111111]">
                              {item.Quantity}
                            </td>
                            <td className="py-2.5 px-4 text-right font-mono tabular-nums font-medium text-[#525252]">
                              {currencySymbol}{item.UnitCost.toFixed(2)}
                            </td>
                            <td className="py-2.5 px-4 text-right font-mono tabular-nums font-semibold text-[#111111]">
                              {currencySymbol}{item.TotalCost.toFixed(2)}
                            </td>
                            <td className="py-2.5 px-4 text-center">
                              <button
                                type="button"
                                onClick={() => handleRemoveItem(idx)}
                                className="min-h-[44px] sm:min-h-[36px] min-w-[44px] sm:min-w-[36px] p-1 rounded-md text-[#737373] hover:text-[#B91C1C] hover:bg-red-50 transition-colors inline-flex items-center justify-center cursor-pointer"
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
                    <label className="text-xs font-semibold text-[#111111] mb-1.5 block">
                      অর্ডার সম্পর্কিত নোট / মন্তব্য
                    </label>
                    <textarea
                      rows="3"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="অর্ডার ও সাপ্লায়ার সম্পর্কিত কোনো বিশেষ শর্ত বা মন্তব্য..."
                      className="w-full min-h-[44px] p-3 bg-white border border-neutral-200/80 rounded-md text-xs text-[#111111] focus:ring-2 focus:ring-[#0F172A]/10 focus:border-[#0F172A] focus:outline-none"
                    />
                  </div>

                  {/* Immediate Receive Checkbox (Gap 3-গ) */}
                  <div className="p-3.5 bg-emerald-50/50 border border-emerald-200 rounded-lg space-y-2">
                    <label className="flex items-start space-x-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={receiveImmediately}
                        onChange={(e) => setReceiveImmediately(e.target.checked)}
                        className="mt-1 h-4 w-4 rounded border-neutral-300 text-[#15803D] focus:ring-[#15803D] cursor-pointer"
                      />
                      <div>
                        <span className="text-xs font-semibold text-[#111111] block">
                          মালামাল এখনই ইনভেন্টরিতে সরাসরি যুক্ত করুন (Direct Stock Influx)
                        </span>
                        <span className="text-[11px] text-[#15803D]">
                          চেক করা থাকলে অর্ডার সংরক্ষণ করার সাথে সাথেই ইনভেন্টরিতে স্টক বেড়ে যাবে এবং স্ট্যাটাস "Received" হবে।
                        </span>
                      </div>
                    </label>

                    {receiveImmediately && (
                      <div className="pt-2 border-t border-emerald-200 flex flex-wrap items-center gap-4 text-xs">
                        <span className="font-semibold text-[#111111]">কোথায় স্টক জমা হবে:</span>
                        <label className="flex items-center space-x-1.5 cursor-pointer font-semibold text-[#111111]">
                          <input
                            type="radio"
                            name="createPoLocation"
                            value="Godown"
                            checked={receiveLocation === 'Godown'}
                            onChange={() => setReceiveLocation('Godown')}
                            className="text-[#15803D] focus:ring-[#15803D]"
                          />
                          <span>কেন্দ্রীয় গোডাউন (Godown)</span>
                        </label>
                        <label className="flex items-center space-x-1.5 cursor-pointer font-semibold text-[#111111]">
                          <input
                            type="radio"
                            name="createPoLocation"
                            value="Shop"
                            checked={receiveLocation === 'Shop'}
                            onChange={() => setReceiveLocation('Shop')}
                            className="text-[#15803D] focus:ring-[#15803D]"
                          />
                          <span>বিক্রয় কাউন্টার (Shop)</span>
                        </label>
                      </div>
                    )}
                  </div>
                </div>

                {/* Totals & Payment Calculations */}
                <div className="bg-white border border-neutral-200/80 p-4.5 rounded-lg space-y-3.5">
                  <div className="text-xs font-semibold text-[#111111] uppercase tracking-wider border-b border-neutral-200/80 pb-2">
                    মূল্য ও পেমেন্ট হিসাব
                  </div>

                  <div className="flex justify-between items-center text-xs text-[#525252]">
                    <span>পণ্যের মোট ক্রয়মূল্য (Subtotal):</span>
                    <span className="font-mono tabular-nums font-semibold text-[#111111]">{currencySymbol}{itemsSubtotal.toFixed(2)}</span>
                  </div>

                  <div className="flex justify-between items-center text-xs text-[#525252]">
                    <span>পরিবহন ও আনুষঙ্গিক খরচ (Carrying):</span>
                    <div className="w-28">
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={carryingCost}
                        onChange={(e) => setCarryingCost(Math.max(0, parseFloat(e.target.value) || 0))}
                        className="w-full min-h-[44px] sm:min-h-[36px] px-2 py-1 bg-[#FAFAFA] border border-neutral-200/80 rounded-md text-xs font-mono tabular-nums font-semibold text-right text-[#111111]"
                      />
                    </div>
                  </div>

                  <div className="flex justify-between items-center text-sm font-semibold text-[#111111] border-t border-neutral-200/80 pt-2">
                    <span>সর্বমোট বিল (Grand Total):</span>
                    <span className="text-base font-mono tabular-nums text-[#111111]">{currencySymbol}{grandTotal.toFixed(2)}</span>
                  </div>

                  {/* Payment Inputs */}
                  <div className="space-y-2 pt-2 border-t border-dashed border-neutral-200">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[11px] font-semibold text-[#111111] block mb-1">
                          পরিশোধিত টাকা (Paid)
                        </label>
                        <input
                          type="number"
                          min="0"
                          max={grandTotal}
                          step="any"
                          value={paidAmount}
                          onChange={(e) => setPaidAmount(Math.max(0, Math.min(grandTotal, parseFloat(e.target.value) || 0)))}
                          className="w-full min-h-[44px] sm:min-h-[36px] px-3 py-1.5 bg-[#FAFAFA] border border-neutral-200/80 rounded-md text-xs font-mono tabular-nums font-semibold text-[#15803D] text-right"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-semibold text-[#111111] block mb-1">
                          পেমেন্ট মেথড
                        </label>
                        <select
                          value={paymentMethod}
                          onChange={(e) => setPaymentMethod(e.target.value)}
                          disabled={paidAmount <= 0}
                          className="w-full min-h-[44px] sm:min-h-[36px] px-2 py-1.5 bg-[#FAFAFA] border border-neutral-200/80 rounded-md text-xs font-medium text-[#111111]"
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
                        <label className="text-[10px] font-semibold text-[#525252] block mb-0.5">
                          ট্রানজেকশন আইডি / চেক নং
                        </label>
                        <input
                          type="text"
                          value={reference}
                          onChange={(e) => setReference(e.target.value)}
                          placeholder="TrxID / Cheque Number"
                          className="w-full min-h-[44px] sm:min-h-[36px] px-3 py-1 bg-[#FAFAFA] border border-neutral-200/80 rounded-md text-xs font-mono tabular-nums"
                        />
                      </div>
                    )}

                    <div className="flex justify-between items-center text-xs font-semibold pt-2 text-[#B91C1C] bg-red-50 p-2.5 rounded-md border border-red-200">
                      <span>অবশিষ্ট বকেয়া দেনা (Due):</span>
                      <span className="text-sm font-mono tabular-nums">{currencySymbol}{calculatedDue.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-neutral-200/80">
                <button
                  type="button"
                  onClick={() => {
                    resetCreateForm();
                    setActiveTab('list');
                  }}
                  className="min-h-[44px] sm:min-h-[36px] px-5 py-2 rounded-md border border-neutral-200/80 bg-white text-[#111111] text-xs font-semibold hover:bg-[#F5F5F5] transition-colors cursor-pointer"
                >
                  বাতিল করুন
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting || orderItems.length === 0}
                  className="min-h-[44px] sm:min-h-[36px] px-6 py-2 rounded-md bg-[#0F172A] text-white text-xs font-semibold hover:bg-slate-800 disabled:opacity-50 transition-colors flex items-center space-x-2 cursor-pointer"
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
          className="fixed inset-0 z-[110] bg-neutral-900/40 flex items-center justify-center p-3 overflow-y-auto animate-in fade-in"
          style={{ zIndex: 110 }}
        >
          <div className="bg-white rounded-lg border border-neutral-200/80 max-w-2xl w-full my-auto overflow-hidden flex flex-col max-h-[90vh] relative" style={{ zIndex: 111 }}>
            
            {/* Modal Header */}
            <div className="px-5 py-3.5 bg-[#0F172A] text-white flex items-center justify-between no-print border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <FileText className="w-4 h-4 text-slate-300" />
                <span className="font-semibold text-sm">পারচেজ অর্ডার চালান ভাউচার (<span className="font-mono tabular-nums">#{viewingPO.PONumber}</span>)</span>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="min-h-[44px] sm:min-h-[36px] px-3 py-1.5 rounded-md bg-[#15803D] hover:bg-emerald-800 text-white text-xs font-semibold flex items-center space-x-1 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>প্রিন্ট করুন</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewingPO(null)}
                  className="min-h-[44px] sm:min-h-[36px] min-w-[44px] sm:min-w-[36px] p-1 rounded-md hover:bg-white/10 text-slate-300 hover:text-white flex items-center justify-center cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Printable Memo Content */}
            <div className="p-6 sm:p-8 overflow-y-auto space-y-6 text-[#111111] text-xs printable-voucher">
              
              {/* Store & Header */}
              <div className="border-b-2 border-[#0F172A] pb-4 flex justify-between items-start">
                <div>
                  <h1 className="text-xl font-semibold text-[#111111] uppercase tracking-tight">{storeName}</h1>
                  <p className="text-[#525252] text-[11px] mt-0.5">{storeSettings.Address || 'দোকানের ঠিকানা'}</p>
                  <p className="text-[#525252] text-[11px] font-mono tabular-nums">মোবাইল: {storeSettings.Phone || 'ফোন নম্বর'}</p>
                </div>
                <div className="text-right">
                  <div className="text-xs font-semibold uppercase tracking-wider px-2 py-1 bg-[#F5F5F5] rounded-md border border-neutral-200/80 inline-block mb-1">
                    PURCHASE ORDER
                  </div>
                  <div className="font-mono tabular-nums font-semibold text-sm text-[#111111]">{viewingPO.PONumber}</div>
                  <div className="text-[11px] font-mono tabular-nums text-[#525252] mt-0.5">তারিখ: {viewingPO.Date}</div>
                </div>
              </div>

              {/* Supplier Info Box */}
              <div className="bg-[#FAFAFA] p-3.5 rounded-lg border border-neutral-200/80 flex justify-between items-start">
                <div>
                  <span className="text-[10px] font-semibold text-[#737373] uppercase tracking-wider block">সাপ্লায়ার বিবরণ</span>
                  <div className="font-semibold text-sm text-[#111111] mt-0.5">{viewingPO.SupplierName}</div>
                  {viewingPO.SupplierPhone && <div className="text-[11px] font-mono tabular-nums text-[#525252]">মোবাইল: {viewingPO.SupplierPhone}</div>}
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-semibold text-[#737373] uppercase tracking-wider block">অর্ডার স্ট্যাটাস</span>
                  <div className="mt-1">{renderStatusBadge(viewingPO.Status)}</div>
                </div>
              </div>

              {/* Items Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="border-y-2 border-[#0F172A] bg-[#FAFAFA] font-semibold uppercase text-[10px]">
                    <tr>
                      <th className="py-2 px-2">#</th>
                      <th className="py-2 px-2">পণ্যের নাম</th>
                      <th className="py-2 px-2 text-center">পরিমাণ</th>
                      <th className="py-2 px-2 text-right">একক মূল্য</th>
                      <th className="py-2 px-2 text-right">মোট মূল্য</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200/80">
                    {parseItems(viewingPO.Items).map((item, idx) => (
                      <tr key={idx}>
                        <td className="py-2 px-2 text-[#737373] font-mono tabular-nums">{idx + 1}</td>
                        <td className="py-2 px-2 font-semibold text-[#111111]">
                          {item.ProductName}
                          {item.SKU && <span className="block text-[10px] text-[#737373] font-mono tabular-nums">SKU: {item.SKU}</span>}
                        </td>
                        <td className="py-2 px-2 text-center font-mono tabular-nums font-semibold text-[#111111]">{item.Quantity}</td>
                        <td className="py-2 px-2 text-right font-mono tabular-nums text-[#525252]">{currencySymbol}{Number(item.UnitCost || 0).toFixed(2)}</td>
                        <td className="py-2 px-2 text-right font-mono tabular-nums font-semibold text-[#111111]">{currencySymbol}{Number(item.TotalCost || 0).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totals Summary */}
              <div className="flex justify-end pt-2">
                <div className="w-64 space-y-1.5 border-t border-neutral-200/80 pt-2 text-xs">
                  <div className="flex justify-between text-[#525252]">
                    <span>পণ্যের উপ-মোট:</span>
                    <span className="font-mono tabular-nums font-semibold text-[#111111]">{currencySymbol}{Number(viewingPO.Subtotal || 0).toFixed(2)}</span>
                  </div>
                  {Number(viewingPO.CarryingCost) > 0 && (
                    <div className="flex justify-between text-[#525252]">
                      <span>পরিবহন খরচ:</span>
                      <span className="font-mono tabular-nums font-semibold text-[#111111]">{currencySymbol}{Number(viewingPO.CarryingCost).toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm font-semibold border-y border-[#0F172A] py-1.5 text-[#111111]">
                    <span>সর্বমোট বিল:</span>
                    <span className="font-mono tabular-nums">{currencySymbol}{Number(viewingPO.TotalAmount || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-[#15803D] font-semibold">
                    <span>পরিশোধিত:</span>
                    <span className="font-mono tabular-nums">{currencySymbol}{Number(viewingPO.PaidAmount || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-[#B91C1C] font-semibold">
                    <span>বকেয়া দেনা:</span>
                    <span className="font-mono tabular-nums">{currencySymbol}{Number(viewingPO.DueAmount || 0).toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Notes */}
              {viewingPO.Notes && (
                <div className="p-3 bg-[#FAFAFA] rounded-md border border-neutral-200/80 text-[11px] text-[#525252]">
                  <strong className="text-[#111111]">মন্তব্য / নোট:</strong> {viewingPO.Notes}
                </div>
              )}

              {/* Signature Lines */}
              <div className="grid grid-cols-2 gap-12 pt-14 text-center text-xs text-[#525252]">
                <div className="border-t border-dashed border-neutral-300 pt-1.5">
                  কর্তৃপক্ষের স্বাক্ষর
                </div>
                <div className="border-t border-dashed border-neutral-300 pt-1.5">
                  সাপ্লায়ার / ডেলিভারি প্রতিনিধি
                </div>
              </div>

            </div>

          </div>
        </div>
      )}

      {/* Gap 3(খ ও গ): মালামাল গ্রহণ অবস্থান (Location) নিশ্চিতকরণ মডাল */}
      {receiveModalPO && (
        <div className="fixed inset-0 z-50 bg-neutral-900/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6 border border-neutral-200/80 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center space-x-3">
              <div className="w-11 h-11 rounded-lg bg-emerald-50 border border-emerald-200 text-[#15803D] flex items-center justify-center shrink-0">
                <PackageCheck className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-base font-semibold tracking-tight text-[#111111]">মালামাল গ্রহণ ও স্টক ইন</h4>
                <p className="text-xs text-[#525252] font-mono tabular-nums">অর্ডার: {receiveModalPO.po.PONumber}</p>
              </div>
            </div>

            <p className="text-xs text-[#525252] leading-relaxed">
              আপনি <strong className="text-[#111111]">{receiveModalPO.po.SupplierName}</strong> থেকে পাঠানো মালামাল গ্রহণ করতে যাচ্ছেন। মালামাল কোন অবস্থানে (Location) প্রবেশ করবে তা নির্বাচন করুন:
            </p>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <button
                type="button"
                onClick={() => setReceiveModalPO(prev => ({ ...prev, location: 'Godown' }))}
                className={`min-h-[44px] p-3.5 rounded-lg border text-xs font-semibold transition-colors flex flex-col items-center justify-center space-y-1.5 cursor-pointer ${
                  receiveModalPO.location === 'Godown'
                    ? 'bg-emerald-50 border-[#15803D] text-[#111111]'
                    : 'bg-white border-neutral-200/80 text-[#525252] hover:bg-[#FAFAFA]'
                }`}
              >
                <span className="text-sm font-semibold flex items-center space-x-1.5">
                  <Warehouse className="w-4 h-4 text-[#15803D]" />
                  <span>গোডাউন (Godown)</span>
                </span>
                <span className="text-[10px] text-[#15803D] font-normal">প্রধান ওয়্যারহাউজে লট বৃদ্ধি</span>
              </button>

              <button
                type="button"
                onClick={() => setReceiveModalPO(prev => ({ ...prev, location: 'Shop' }))}
                className={`min-h-[44px] p-3.5 rounded-lg border text-xs font-semibold transition-colors flex flex-col items-center justify-center space-y-1.5 cursor-pointer ${
                  receiveModalPO.location === 'Shop'
                    ? 'bg-[#F5F5F5] border-[#0F172A] text-[#111111]'
                    : 'bg-white border-neutral-200/80 text-[#525252] hover:bg-[#FAFAFA]'
                }`}
              >
                <span className="text-sm font-semibold flex items-center space-x-1.5">
                  <Store className="w-4 h-4 text-[#0F172A]" />
                  <span>দোকান (Shop)</span>
                </span>
                <span className="text-[10px] text-[#525252] font-normal">সরাসরি বিক্রয় কাউন্টারে যোগ</span>
              </button>
            </div>

            <div className="text-[10.5px] text-[#525252] bg-[#FAFAFA] p-2.5 rounded-md border border-neutral-200/80 flex items-start space-x-2">
              <Info className="w-3.5 h-3.5 text-[#525252] shrink-0 mt-0.5" />
              <span>গ্রহণ নিশ্চিত করলে পণ্যের ওয়েইটেড এভারেজ কস্ট (WAC) সমন্বিত হবে এবং অডিট ট্রেইলে <strong>LOT_IN</strong> মুভমেন্ট সংরক্ষিত হবে।</span>
            </div>

            <div className="pt-2 flex items-center space-x-2">
              <button
                type="button"
                onClick={() => setReceiveModalPO(null)}
                className="min-h-[44px] sm:min-h-[36px] flex-1 py-2 rounded-md border border-neutral-200/80 text-[#111111] font-semibold text-xs hover:bg-[#F5F5F5] transition-colors cursor-pointer"
              >
                বাতিল
              </button>
              <button
                type="button"
                onClick={() => {
                  onUpdatePOStatus(receiveModalPO.po.PONumber, 'Received', receiveModalPO.location);
                  setReceiveModalPO(null);
                }}
                className="min-h-[44px] sm:min-h-[36px] flex-1 py-2 rounded-md bg-[#15803D] hover:bg-emerald-800 text-white font-semibold text-xs transition-colors cursor-pointer"
              >
                গ্রহণ নিশ্চিত করুন
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
