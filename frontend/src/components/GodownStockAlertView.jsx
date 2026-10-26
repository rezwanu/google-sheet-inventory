import React, { useState, useMemo } from 'react';
import {
  AlertTriangle,
  Search,
  Printer,
  FileSpreadsheet,
  ArrowLeft,
  PackageX,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Palette
} from 'lucide-react';

export default function GodownStockAlertView({
  onClose,
  products = [],
  currencySymbol = '৳',
  settings = {},
  onQuickRestock
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('ALL'); // 'ALL' | 'OUT_OF_STOCK' | 'LOW_STOCK'
  const [isPrintMode, setIsPrintMode] = useState(false);

  // পণ্য থেকে ভ্যারিয়েন্ট তালিকা নিরাপদ এক্সট্র্যাক্ট
  const getVariants = (p) => {
    if (!p) return [];
    if (Array.isArray(p.Variants) && p.Variants.length > 0) return p.Variants;
    if (Array.isArray(p.variants) && p.variants.length > 0) return p.variants;
    const raw = p.VariantsJSON || p.variantsJSON || p.Variants || p.variants;
    if (typeof raw === 'string' && raw.trim()) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {
        return [];
      }
    }
    return [];
  };

  // গোডাউনে কম স্টক বা স্টক শেষ থাকা সকল ভ্যারিয়েন্ট ও সাধারণ পণ্যের তালিকা প্রস্তুতকরণ
  const alertList = useMemo(() => {
    const list = [];

    products.forEach((p) => {
      const vars = getVariants(p);
      const minAlert = Number(p.MinStockAlert || 5);

      if (vars.length > 0) {
        vars.forEach((v, vIdx) => {
          const vGStock = Number(v.GodownStock !== undefined ? v.GodownStock : (v.godownStock !== undefined ? v.godownStock : 0));
          const vColor = v.Attributes?.Color || v.Color || '';
          const vSize = v.Attributes?.Size || v.Size || '';
          const otherAttrs = v.Attributes
            ? Object.entries(v.Attributes)
                .filter(([k]) => k !== 'Color' && k !== 'Size')
                .map(([k, val]) => `${k}: ${val}`)
                .join(', ')
            : '';
          const varLabelParts = [vColor && `রং: ${vColor}`, vSize && `সাইজ: ${vSize}`, otherAttrs].filter(Boolean);
          const variantDesc = varLabelParts.length > 0 ? varLabelParts.join(' • ') : `ভ্যারিয়েন্ট #${vIdx + 1}`;

          // ভ্যারিয়েন্ট গোডাউন স্টক যদি ০ হয় অথবা ২ বা তার কম হয় (অথবা মূল alert লিমিটের কম)
          const isOut = vGStock <= 0;
          const isLow = vGStock > 0 && vGStock <= Math.min(minAlert, 3);

          if (isOut || isLow) {
            const neededQty = Math.max(10, (minAlert * 2) - vGStock);
            list.push({
              key: `${p.ProductID}_${v.VariantID || vIdx}`,
              productId: p.ProductID,
              productName: p.ProductName,
              isVariant: true,
              variantDesc,
              barcode: v.Barcode || p.Barcode || '—',
              currentQty: vGStock,
              isOut,
              isLow,
              alertStatusText: isOut ? '🚨 সম্পূর্ণ স্টক শেষ' : '⚠️ সংকটজনক কম',
              recommendedRestockQty: `+${neededQty}`,
              parentProduct: p,
              variant: v
            });
          }
        });
      } else {
        const gStock = Number(p.GodownStock || 0);
        const isOut = gStock <= 0;
        const isLow = gStock > 0 && gStock <= minAlert;

        if (isOut || isLow) {
          const neededQty = Math.max(10, (minAlert * 2) - gStock);
          list.push({
            key: `${p.ProductID}_single`,
            productId: p.ProductID,
            productName: p.ProductName,
            isVariant: false,
            variantDesc: 'সাধারণ পণ্য (ভ্যারিয়েন্ট নেই)',
            barcode: p.Barcode || '—',
            currentQty: gStock,
            isOut,
            isLow,
            alertStatusText: isOut ? '🚨 সম্পূর্ণ স্টক শেষ' : '⚠️ সংকটজনক কম',
            recommendedRestockQty: `+${neededQty}`,
            parentProduct: p,
            variant: null
          });
        }
      }
    });

    return list;
  }, [products]);

  // পরিসংখ্যান
  const stats = useMemo(() => {
    let outCount = 0;
    let lowCount = 0;
    alertList.forEach((item) => {
      if (item.isOut) outCount++;
      else lowCount++;
    });
    return {
      totalAlerts: alertList.length,
      outCount,
      lowCount
    };
  }, [alertList]);

  // ফিল্টার ও সার্চ অনুযায়ী প্রদর্শিত তালিকা
  const filteredList = useMemo(() => {
    return alertList.filter((item) => {
      if (filterType === 'OUT_OF_STOCK' && !item.isOut) return false;
      if (filterType === 'LOW_STOCK' && !item.isLow) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.trim().toLowerCase();
      return (
        (item.productName && item.productName.toLowerCase().includes(q)) ||
        (item.variantDesc && item.variantDesc.toLowerCase().includes(q)) ||
        (item.barcode && item.barcode.toLowerCase().includes(q)) ||
        (item.productId && item.productId.toLowerCase().includes(q))
      );
    });
  }, [alertList, filterType, searchQuery]);

  // এক্সেল/সিএসভি ডাউনলোড
  const handleExportCSV = () => {
    if (filteredList.length === 0) {
      alert('এক্সপোর্ট করার মতো কোনো ডাটা নেই!');
      return;
    }
    const headers = ['ক্রমিক', 'পণ্যের নাম', 'ভ্যারিয়েন্ট বিবরণ', 'বারকোড', 'বর্তমান পরিমাণ', 'সতর্কতা / ঘাটতি বিবরণ', 'প্রয়োজনীয় রিস্টক সংখ্যা'];
    const rows = filteredList.map((item, idx) => [
      idx + 1,
      `"${item.productName.replace(/"/g, '""')}"`,
      `"${item.variantDesc.replace(/"/g, '""')}"`,
      `"${item.barcode}"`,
      item.currentQty,
      `"${item.alertStatusText}"`,
      `"${item.recommendedRestockQty}"`
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `godown_stock_alert_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // প্রিন্ট হ্যান্ডলার
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="flex-1 bg-slate-50 min-h-screen p-3 sm:p-6 select-none animate-in fade-in duration-200">
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">

        {/* টপ হেডার বার */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                title="ড্যাশবোর্ডে ফিরে যান"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <div>
              <div className="flex items-center space-x-2">
                <span className="p-1.5 rounded-lg bg-rose-100 text-rose-700">
                  <AlertTriangle className="w-5 h-5" />
                </span>
                <h1 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                  গোডাউন স্টক অ্যালার্ট
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 animate-pulse">
                  {stats.totalAlerts}টি সতর্কতা
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1 font-medium">
                গোডাউনে যেসব পণ্য বা ভ্যারিয়েন্টের মজুত কমে গেছে বা শেষ হয়ে গেছে তাদের তালিকা
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            <button
              type="button"
              onClick={handleExportCSV}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold inline-flex items-center space-x-1.5 shadow-xs transition-colors cursor-pointer"
              title="এক্সেল বা সিএসভি ফাইল ডাউনলোড করুন"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>এক্সেল ডাউনলোড</span>
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold inline-flex items-center space-x-1.5 shadow-xs transition-colors cursor-pointer"
              title="রিপোর্ট প্রিন্ট বা PDF আকারে সংরক্ষণ করুন"
            >
              <Printer className="w-4 h-4" />
              <span>প্রিন্ট / PDF</span>
            </button>
          </div>
        </div>

        {/* পরিসংখ্যান কার্ডসমূহ */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          <div
            onClick={() => setFilterType('ALL')}
            className={`p-4 rounded-2xl border transition-all cursor-pointer ${
              filterType === 'ALL'
                ? 'bg-gradient-to-br from-indigo-50 to-purple-50 border-indigo-300 ring-2 ring-indigo-500/20 shadow-xs'
                : 'bg-white border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-600">মোট সতর্কতা</span>
              <span className="p-2 rounded-xl bg-indigo-100 text-indigo-700">
                <AlertTriangle className="w-4 h-4" />
              </span>
            </div>
            <div className="text-2xl font-black text-indigo-950 mt-2 font-mono">
              {stats.totalAlerts.toLocaleString('bn-BD')} <span className="text-xs font-normal text-slate-500">টি আইটেম</span>
            </div>
          </div>

          <div
            onClick={() => setFilterType('OUT_OF_STOCK')}
            className={`p-4 rounded-2xl border transition-all cursor-pointer ${
              filterType === 'OUT_OF_STOCK'
                ? 'bg-gradient-to-br from-rose-50 to-pink-50 border-rose-300 ring-2 ring-rose-500/20 shadow-xs'
                : 'bg-white border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-rose-700">🚨 সম্পূর্ণ স্টক শেষ</span>
              <span className="p-2 rounded-xl bg-rose-100 text-rose-700">
                <PackageX className="w-4 h-4" />
              </span>
            </div>
            <div className="text-2xl font-black text-rose-950 mt-2 font-mono">
              {stats.outCount.toLocaleString('bn-BD')} <span className="text-xs font-normal text-slate-500">টি আইটেম</span>
            </div>
          </div>

          <div
            onClick={() => setFilterType('LOW_STOCK')}
            className={`p-4 rounded-2xl border transition-all cursor-pointer ${
              filterType === 'LOW_STOCK'
                ? 'bg-gradient-to-br from-amber-50 to-yellow-50 border-amber-300 ring-2 ring-amber-500/20 shadow-xs'
                : 'bg-white border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-700">⚠️ সংকটজনক কম স্টক</span>
              <span className="p-2 rounded-xl bg-amber-100 text-amber-700">
                <AlertCircle className="w-4 h-4" />
              </span>
            </div>
            <div className="text-2xl font-black text-amber-950 mt-2 font-mono">
              {stats.lowCount.toLocaleString('bn-BD')} <span className="text-xs font-normal text-slate-500">টি আইটেম</span>
            </div>
          </div>
        </div>

        {/* সার্চ ও ফিল্টার বার */}
        <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative flex-1 w-full max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="পণ্য, ভ্যারিয়েন্ট, রং বা বারকোড দিয়ে খুঁজুন..."
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center space-x-1.5 w-full sm:w-auto justify-end flex-wrap gap-y-1">
            <button
              type="button"
              onClick={() => setFilterType('ALL')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                filterType === 'ALL'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              সকল ({stats.totalAlerts})
            </button>
            <button
              type="button"
              onClick={() => setFilterType('OUT_OF_STOCK')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                filterType === 'OUT_OF_STOCK'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
              }`}
            >
              🚨 শেষ ({stats.outCount})
            </button>
            <button
              type="button"
              onClick={() => setFilterType('LOW_STOCK')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                filterType === 'LOW_STOCK'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200'
              }`}
            >
              ⚠️ কম ({stats.lowCount})
            </button>
          </div>
        </div>

        {/* ভ্যারিয়েন্ট ভিত্তিক ঘাটতি খতিয়ান টেবিল (ব্যবহারকারীর নির্দিষ্ট রুল অনুযায়ী কোনো অপ্রয়োজনীয় কলাম নেই) */}
        <div className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100 text-slate-700 border-b border-slate-200 font-bold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4 w-12 text-center">ক্রমিক</th>
                  <th className="py-3 px-4">পণ্যের নাম</th>
                  <th className="py-3 px-4">ভ্যারিয়েন্ট বিবরণ</th>
                  <th className="py-3 px-4">বারকোড</th>
                  <th className="py-3 px-4 text-center bg-rose-50/70 text-rose-950 font-black">বর্তমান পরিমাণ</th>
                  <th className="py-3 px-4 text-center">সতর্কতা / ঘাটতি বিবরণ</th>
                  <th className="py-3 px-4 text-center">প্রয়োজনীয় রিস্টক সংখ্যা</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredList.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="py-12 text-center text-slate-400 font-medium">
                      <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
                      <p className="font-bold text-slate-700 text-sm">গোডাউনে কোনো ঘাটতি বা কম স্টক পণ্য নেই!</p>
                      <p className="text-xs text-slate-400 mt-0.5">সবগুলো ভ্যারিয়েন্ট ও পণ্য পর্যাপ্ত মজুতে রয়েছে।</p>
                    </td>
                  </tr>
                ) : (
                  filteredList.map((item, idx) => (
                    <tr
                      key={item.key}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        item.isOut ? 'bg-rose-50/30' : 'bg-white'
                      }`}
                    >
                      <td className="py-3 px-4 text-center font-mono font-bold text-slate-500">
                        {idx + 1}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-900">
                        <div className="flex items-center space-x-2">
                          <span>{item.productName}</span>
                          {item.isVariant && (
                            <span className="p-0.5 rounded text-indigo-600 bg-indigo-50 border border-indigo-200 text-[10px]">
                              <Palette className="w-3 h-3" />
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                          ID: {item.productId}
                        </div>
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-700">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-800 border border-slate-200 font-bold inline-block text-[11px]">
                          {item.variantDesc}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-500">
                        {item.barcode}
                      </td>
                      <td className="py-3 px-4 text-center bg-rose-50/40">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-md font-mono font-black text-xs ${
                            item.isOut
                              ? 'bg-rose-100 text-rose-800 border border-rose-300'
                              : 'bg-amber-100 text-amber-800 border border-amber-300'
                          }`}
                        >
                          {item.currentQty}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                            item.isOut
                              ? 'bg-rose-100 text-rose-800 border border-rose-200'
                              : 'bg-amber-100 text-amber-800 border border-amber-200'
                          }`}
                        >
                          {item.alertStatusText}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-bold text-indigo-700">
                        <span className="px-2 py-0.5 rounded-md bg-indigo-50 border border-indigo-200 text-indigo-800">
                          {item.recommendedRestockQty}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* প্রিন্ট উপযোগী স্টাইল (শুধুমাত্র প্রিন্টের সময় কার্যকর) */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .max-w-7xl, .max-w-7xl * {
            visibility: visible;
          }
          .max-w-7xl {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          button, input, select {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
