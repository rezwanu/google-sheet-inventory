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
  ChevronDown,
  ChevronRight,
  Palette,
  CornerDownRight,
  Package,
  Layers,
  FileText,
  Download,
  Eye,
  X
} from 'lucide-react';
import { getProductDisplayUnit } from '../services/storage';

export default function GodownStockAlertView({
  onClose,
  products = [],
  currencySymbol = '৳',
  settings = {},
  onQuickRestock
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('ALL'); // 'ALL' | 'OUT_OF_STOCK' | 'LOW_STOCK'
  const [expandedProductIds, setExpandedProductIds] = useState({});
  const [isPdfPreviewMode, setIsPdfPreviewMode] = useState(false);

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

  // ভ্যারিয়েন্ট টাইপ ও মান কমা দিয়ে সাজানো (যেমন: রং: নীল, কালো, সাদা...)
  const getVariantTypeAndValues = (alertVariants = []) => {
    if (!alertVariants || alertVariants.length === 0) return { type: '', text: '' };

    const colors = alertVariants
      .map(v => v.color?.trim() || v.rawVariant?.Color?.trim() || v.rawVariant?.Attributes?.Color?.trim())
      .filter(Boolean);

    const sizes = alertVariants
      .map(v => v.size?.trim() || v.rawVariant?.Size?.trim() || v.rawVariant?.Attributes?.Size?.trim())
      .filter(Boolean);

    // ১. শুধুমাত্র রং থাকলে (যেমন কাপড়/পোশাকের কালার)
    if (colors.length > 0 && sizes.length === 0) {
      return {
        type: 'রং',
        text: colors.join(', ')
      };
    }

    // ২. শুধুমাত্র সাইজ থাকলে
    if (sizes.length > 0 && colors.length === 0) {
      return {
        type: 'সাইজ',
        text: sizes.join(', ')
      };
    }

    // ৩. রং ও সাইজ উভয়ই থাকলে (যেমন: নীল (XL), কালো (L))
    if (colors.length > 0 && sizes.length > 0) {
      const combined = alertVariants.map(v => {
        const c = v.color?.trim() || v.rawVariant?.Color?.trim() || '';
        const s = v.size?.trim() || v.rawVariant?.Size?.trim() || '';
        if (c && s) return `${c} (${s})`;
        return c || s || v.variantDesc;
      }).filter(Boolean);

      return {
        type: 'রং (সাইজ)',
        text: combined.join(', ')
      };
    }

    // ৪. অন্যান্য কাস্টম অ্যাট্রিবিউট থাকলে
    const otherKeys = new Set();
    alertVariants.forEach(v => {
      const attrs = v.rawVariant?.Attributes;
      if (attrs && typeof attrs === 'object') {
        Object.keys(attrs).forEach(k => {
          if (k !== 'Color' && k !== 'Size') otherKeys.add(k);
        });
      }
    });

    if (otherKeys.size > 0) {
      const key = Array.from(otherKeys)[0];
      const keyLabel = key === 'Weight' ? 'ওজন' : key === 'Fabric' ? 'কাপড়' : key;
      const vals = alertVariants.map(v => v.rawVariant?.Attributes?.[key]).filter(Boolean);
      if (vals.length > 0) {
        return {
          type: keyLabel,
          text: vals.join(', ')
        };
      }
    }

    // ৫. ফলব্যাক
    const cleanVals = alertVariants.map(v => {
      let desc = v.variantDesc || '';
      desc = desc.replace(/^(রং|সাইজ|ভ্যারিয়েন্ট|কালার):\s*/i, '').trim();
      return desc;
    }).filter(Boolean);

    return {
      type: 'বিবরণ',
      text: cleanVals.join(', ')
    };
  };

  // গোডাউনে কম স্টক বা স্টক শেষ থাকা পণ্য ও তাদের ভ্যারিয়েন্ট তালিকা গ্রুপড আকারে প্রস্তুতকরণ
  const groupedAlertProducts = useMemo(() => {
    const list = [];

    products.forEach((p) => {
      const vars = getVariants(p);
      const minAlert = Number(p.MinStockAlert || 5);
      const unit = getProductDisplayUnit(p);
      const isThan = /than|থান/i.test(unit);
      const yardsPerThan = isThan ? (Number(p.YardsPerThan || p.yardsPerThan || 0) || 25) : 0;
      const hasVars = vars.length > 0;

      if (hasVars) {
        const alertingVariants = [];
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

          // ভ্যারিয়েন্ট গোডাউন স্টক যদি ০ হয় অথবা ৩ বা তার কম হয় (অথবা মূল alert লিমিটের কম)
          const isOut = vGStock <= 0;
          const isLow = vGStock > 0 && vGStock <= Math.min(minAlert, 3);

          if (isOut || isLow) {
            const neededQty = Math.max(10, (minAlert * 2) - vGStock);
            alertingVariants.push({
              key: `${p.ProductID}_${v.VariantID || vIdx}`,
              variantId: v.VariantID || `var-${vIdx}`,
              variantDesc,
              color: vColor,
              size: vSize,
              barcode: v.Barcode || p.Barcode || '—',
              currentQty: vGStock,
              isOut,
              isLow,
              alertStatusText: isOut ? '🚨 সম্পূর্ণ স্টক শেষ' : '⚠️ সংকটজনক কম',
              recommendedRestockQty: `+${neededQty}`,
              rawVariant: v
            });
          }
        });

        if (alertingVariants.length > 0) {
          const totalGodownStock = vars.reduce(
            (sum, v) => sum + (Number(v.GodownStock !== undefined ? v.GodownStock : (v.godownStock || 0)) || 0),
            0
          );
          list.push({
            productId: p.ProductID,
            productName: p.ProductName,
            category: p.Category || '',
            unit,
            isThan,
            yardsPerThan,
            barcode: p.Barcode || '—',
            hasVariants: true,
            totalVariantsCount: vars.length,
            alertVariants: alertingVariants,
            totalGodownStock,
            parentProduct: p
          });
        }
      } else {
        const gStock = Number(p.GodownStock || 0);
        const isOut = gStock <= 0;
        const isLow = gStock > 0 && gStock <= minAlert;

        if (isOut || isLow) {
          const neededQty = Math.max(10, (minAlert * 2) - gStock);
          list.push({
            productId: p.ProductID,
            productName: p.ProductName,
            category: p.Category || '',
            unit,
            isThan,
            yardsPerThan,
            barcode: p.Barcode || '—',
            hasVariants: false,
            totalVariantsCount: 0,
            alertVariants: [],
            totalGodownStock: gStock,
            currentQty: gStock,
            isOut,
            isLow,
            alertStatusText: isOut ? '🚨 সম্পূর্ণ স্টক শেষ' : '⚠️ সংকটজনক কম',
            recommendedRestockQty: `+${neededQty}`,
            parentProduct: p
          });
        }
      }
    });

    return list;
  }, [products]);

  // ফিল্টার ও সার্চ অনুযায়ী প্রদর্শিত তালিকা
  const filteredProducts = useMemo(() => {
    return groupedAlertProducts.map((prod) => {
      if (prod.hasVariants) {
        // ফিল্টার অনুযায়ী ভ্যারিয়েন্ট ফিল্টার করা
        const filteredVars = prod.alertVariants.filter((v) => {
          if (filterType === 'OUT_OF_STOCK' && !v.isOut) return false;
          if (filterType === 'LOW_STOCK' && !v.isLow) return false;

          if (!searchQuery.trim()) return true;
          const q = searchQuery.trim().toLowerCase();
          return (
            (prod.productName && prod.productName.toLowerCase().includes(q)) ||
            (v.variantDesc && v.variantDesc.toLowerCase().includes(q)) ||
            (v.barcode && v.barcode.toLowerCase().includes(q)) ||
            (prod.productId && prod.productId.toLowerCase().includes(q))
          );
        });

        if (filteredVars.length === 0) return null;
        return {
          ...prod,
          alertVariants: filteredVars
        };
      } else {
        // সাধারণ পণ্য
        if (filterType === 'OUT_OF_STOCK' && !prod.isOut) return null;
        if (filterType === 'LOW_STOCK' && !prod.isLow) return null;

        if (!searchQuery.trim()) return prod;
        const q = searchQuery.trim().toLowerCase();
        const matches = (
          (prod.productName && prod.productName.toLowerCase().includes(q)) ||
          (prod.barcode && prod.barcode.toLowerCase().includes(q)) ||
          (prod.productId && prod.productId.toLowerCase().includes(q))
        );
        return matches ? prod : null;
      }
    }).filter(Boolean);
  }, [groupedAlertProducts, filterType, searchQuery]);

  // পরিসংখ্যান
  const stats = useMemo(() => {
    let outCount = 0;
    let lowCount = 0;
    let totalItems = 0;

    groupedAlertProducts.forEach((p) => {
      if (p.hasVariants) {
        p.alertVariants.forEach((v) => {
          totalItems++;
          if (v.isOut) outCount++;
          else lowCount++;
        });
      } else {
        totalItems++;
        if (p.isOut) outCount++;
        else lowCount++;
      }
    });

    return {
      totalAlertProducts: groupedAlertProducts.length,
      totalAlertItems: totalItems,
      outCount,
      lowCount
    };
  }, [groupedAlertProducts]);

  // বিস্তার ও সংক্ষেপ টগল
  const toggleExpand = (productId) => {
    setExpandedProductIds((prev) => ({
      ...prev,
      [productId]: prev[productId] === undefined ? false : !prev[productId]
    }));
  };

  const isExpanded = (productId) => {
    // ডিফল্টভাবে true (সবসময় বিস্তার করা থাকবে যেন সরাসরি ভ্যারিয়েন্টগুলো দেখা যায়)
    return expandedProductIds[productId] !== false;
  };

  const expandAll = () => {
    const all = {};
    filteredProducts.forEach((p) => {
      if (p.hasVariants) all[p.productId] = true;
    });
    setExpandedProductIds(all);
  };

  const collapseAll = () => {
    const all = {};
    filteredProducts.forEach((p) => {
      if (p.hasVariants) all[p.productId] = false;
    });
    setExpandedProductIds(all);
  };

  // এক্সেল/সিএসভি ডাউনলোড
  const handleExportCSV = () => {
    if (filteredProducts.length === 0) {
      alert('এক্সপোর্ট করার মতো কোনো ডাটা নেই!');
      return;
    }
    const headers = ['ক্রমিক', 'মূল পণ্যের নাম', 'পণ্যের ধরন', 'ভ্যারিয়েন্ট বিবরণ', 'বারকোড', 'বর্তমান গোডাউন পরিমাণ', 'অবস্থা', 'প্রয়োজনীয় রিস্টক'];
    const rows = [];
    let rowNum = 1;

    filteredProducts.forEach((p) => {
      if (p.hasVariants) {
        p.alertVariants.forEach((v) => {
          rows.push([
            rowNum++,
            `"${p.productName.replace(/"/g, '""')}"`,
            '"ভ্যারিয়েন্ট পণ্য"',
            `"${v.variantDesc.replace(/"/g, '""')}"`,
            `"${v.barcode}"`,
            `${v.currentQty} ${p.unit}`,
            `"${v.alertStatusText}"`,
            `"${v.recommendedRestockQty} ${p.unit}"`
          ]);
        });
      } else {
        rows.push([
          rowNum++,
          `"${p.productName.replace(/"/g, '""')}"`,
          '"সাধারণ পণ্য"',
          '"—"',
          `"${p.barcode}"`,
          `${p.currentQty} ${p.unit}`,
          `"${p.alertStatusText}"`,
          `"${p.recommendedRestockQty} ${p.unit}"`
        ]);
      }
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `godown_stock_alert_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // সরাসরি পপআপ উইন্ডো খুলে নিখুঁত A4 সাইজের PDF জেনারেট ও প্রিন্ট
  const handleDirectPDFWindow = () => {
    if (filteredProducts.length === 0) {
      alert('পিডিএফ তৈরির জন্য কোনো ডাটা নেই!');
      return;
    }
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('পপআপ উইন্ডো ব্লক করা রয়েছে। অনুগ্রহ করে ব্রাউজারের পপআপ অ্যালাউ করুন।');
      return;
    }

    const storeName = settings?.StoreName || 'পাবনা বস্ত্রালয়';
    const storeAddress = settings?.Address || 'বসিলা রোড, মোহাম্মদপুর, ঢাকা';
    const storePhone = settings?.Phone || '০১৬৭৫৯৩৪৯১৯';
    const dateStr = new Date().toLocaleString('bn-BD');

    let tableRowsHtml = '';
    let rowNumber = 1;

    filteredProducts.forEach((p, idx) => {
      const rowNum = idx + 1;
      const parentBarcode = (p.barcode && p.barcode !== '—') ? p.barcode : (p.parentProduct?.Barcode || p.parentProduct?.barcode || '—');

      if (p.hasVariants) {
        const variantData = getVariantTypeAndValues(p.alertVariants);

        tableRowsHtml += `
          <tr style="border-top: 1px solid #cbd5e1;">
            <td style="text-align: center; padding: 8px 6px; font-weight: bold; color: #334155; font-size: 11px;">${rowNum}</td>
            <td style="padding: 8px 12px;">
              <div style="font-size: 13px; font-weight: 900; color: #0f172a;">${p.productName}</div>
              <div style="font-size: 10px; color: #64748b; margin-top: 2px;">
                ID: ${p.productId} ${p.category ? `| ক্যাটাগরি: ${p.category}` : ''} | মোট ঘাটতি: ${p.alertVariants.length}টি
              </div>
              <div style="margin-top: 5px; font-size: 11px; color: #1e293b; line-height: 1.5;">
                <strong style="color: #4338ca;">${variantData.type}:</strong> ${variantData.text}
              </div>
            </td>
            <td style="text-align: center; font-family: monospace; font-size: 11px; color: #334155; padding: 8px 10px; word-break: break-word;">
              ${parentBarcode}
            </td>
          </tr>
        `;
      } else {
        tableRowsHtml += `
          <tr style="border-top: 1px solid #cbd5e1;">
            <td style="text-align: center; padding: 8px 6px; font-weight: bold; color: #334155; font-size: 11px;">${rowNum}</td>
            <td style="padding: 8px 12px;">
              <div style="font-size: 13px; font-weight: 900; color: #0f172a;">
                ${p.productName} 
                <span style="font-size: 9.5px; font-weight: normal; background: #f1f5f9; color: #475569; padding: 1px 6px; border-radius: 4px; border: 1px solid #e2e8f0; margin-left: 6px;">সাধারণ পণ্য</span>
              </div>
              <div style="font-size: 10px; color: #64748b; margin-top: 2px;">
                ID: ${p.productId} ${p.category ? `| ক্যাটাগরি: ${p.category}` : ''}
              </div>
            </td>
            <td style="text-align: center; font-family: monospace; font-size: 11px; color: #334155; padding: 8px 10px; word-break: break-word;">
              ${p.barcode || '—'}
            </td>
          </tr>
        `;
      }
    });

    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="bn">
        <head>
          <meta charset="utf-8" />
          <title>গোডাউন স্টক অ্যালার্ট ও ঘাটতি রিপোর্ট - ${dateStr}</title>
          <style>
            @page {
              size: A4 portrait;
              margin: 10mm 10mm 15mm 10mm;
            }
            body {
              font-family: system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
              color: #0f172a;
              background: #fff;
              margin: 0;
              padding: 0;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .report-header {
              text-align: center;
              border-bottom: 2px solid #0f172a;
              padding-bottom: 10px;
              margin-bottom: 14px;
            }
            .store-name {
              font-size: 22px;
              font-weight: 900;
              color: #0f172a;
              margin: 0;
            }
            .store-meta {
              font-size: 11px;
              color: #475569;
              margin-top: 3px;
            }
            .report-badge {
              display: inline-block;
              margin-top: 8px;
              padding: 3px 14px;
              background: #0f172a;
              color: #ffffff;
              border-radius: 9999px;
              font-size: 11px;
              font-weight: bold;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            .meta-grid {
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 8px;
              background: #f8fafc;
              border: 1px solid #e2e8f0;
              border-radius: 8px;
              padding: 8px 12px;
              font-size: 11px;
              margin-bottom: 14px;
            }
            .meta-item span {
              display: block;
              color: #64748b;
              font-size: 10px;
            }
            .meta-item strong {
              color: #0f172a;
              font-size: 11.5px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              font-size: 11px;
            }
            th {
              background: #f1f5f9;
              color: #334155;
              font-weight: 800;
              border: 1px solid #cbd5e1;
              padding: 7px 6px;
              text-align: left;
            }
            td {
              border: 1px solid #e2e8f0;
            }
            tr {
              page-break-inside: avoid;
              break-inside: avoid;
            }
            .summary-box {
              margin-top: 14px;
              display: flex;
              justify-content: space-between;
              padding: 8px 12px;
              background: #f8fafc;
              border: 1px solid #e2e8f0;
              border-radius: 8px;
              font-size: 11px;
              font-weight: bold;
            }
            .signatures {
              margin-top: 36px;
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 40px;
              text-align: center;
              font-size: 11px;
              color: #475569;
            }
            .signature-line {
              border-top: 1px dashed #64748b;
              padding-top: 6px;
              font-weight: bold;
            }
          </style>
        </head>
        <body onload="window.print();">
          <div class="report-header">
            <h1 class="store-name">${storeName}</h1>
            <div class="store-meta">${storeAddress} • মোবাইল: ${storePhone}</div>
            <div class="report-badge">গোডাউন স্টক অ্যালার্ট ও ঘাটতি খতিয়ান রিপোর্ট (A4 PDF)</div>
          </div>

          <div class="meta-grid">
            <div class="meta-item">
              <span>রিপোর্ট তৈরির সময়:</span>
              <strong>${dateStr}</strong>
            </div>
            <div class="meta-item">
              <span>ফিল্টার স্ট্যাটাস:</span>
              <strong>${filterType === 'ALL' ? 'সকল ঘাটতি' : filterType === 'OUT_OF_STOCK' ? 'সম্পূর্ণ স্টক শেষ' : 'সংকটজনক কম'}</strong>
            </div>
            <div class="meta-item">
              <span>মোট ঘাটতি পণ্য:</span>
              <strong>${stats.totalAlertProducts}টি মূল পণ্য</strong>
            </div>
            <div class="meta-item">
              <span>মোট ঘাটতি আইটেম:</span>
              <strong style="color: #b91c1c;">${stats.totalAlertItems}টি (শেষ: ${stats.outCount}, কম: ${stats.lowCount})</strong>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th style="width: 45px; text-align: center;">ক্রমিক</th>
                <th>মূল পণ্য ও ভ্যারিয়েন্ট বিবরণ</th>
                <th style="width: 140px; text-align: center;">বারকোড</th>
              </tr>
            </thead>
            <tbody>
              ${tableRowsHtml}
            </tbody>
          </table>

          <div class="summary-box">
            <span>সর্বমোট ঘাটতি আইটেম: ${stats.totalAlertItems}টি</span>
            <span style="color: #b91c1c;">🚨 সম্পূর্ণ স্টক শেষ: ${stats.outCount}টি</span>
            <span style="color: #b45309;">⚠️ সংকটজনক কম স্টক: ${stats.lowCount}টি</span>
            <span>সিস্টেম অডিট কপি</span>
          </div>

          <div class="signatures">
            <div>
              <div class="signature-line">গোডাউন ইনচার্জ / অডিটর স্বাক্ষর</div>
            </div>
            <div>
              <div class="signature-line">ম্যানেজার / স্বত্বাধিকারী স্বাক্ষর</div>
            </div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // ব্রাউজার প্রিন্ট হ্যান্ডলার (A4 ফরম্যাট)
  const handlePrint = () => {
    window.print();
  };

  // ==========================================
  // ১. A4 PDF প্রিভিউ মোড (যদি সক্রিয় থাকে)
  // ==========================================
  if (isPdfPreviewMode) {
    const storeName = settings?.StoreName || 'পাবনা বস্ত্রালয়';
    const storeAddress = settings?.Address || 'বসিলা রোড, মোহাম্মদপুর, ঢাকা';
    const storePhone = settings?.Phone || '০১৬৭৫৯৩৪৯১৯';

    return (
      <div className="flex-1 bg-slate-200 min-h-screen p-3 sm:p-6 overflow-y-auto animate-in fade-in duration-200 select-none">
        <div className="max-w-4xl mx-auto space-y-4">

          {/* পিডিএফ কন্ট্রোল বার (প্রিন্টে অদৃশ্য) */}
          <div className="bg-white p-4 rounded-2xl border border-slate-300 shadow-md flex flex-wrap items-center justify-between gap-3 print:hidden">
            <div className="flex items-center space-x-3">
              <button
                type="button"
                onClick={() => setIsPdfPreviewMode(false)}
                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                title="সাধারণ তালিকায় ফিরে যান"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h3 className="text-sm font-black text-slate-900 flex items-center space-x-1.5">
                  <FileText className="w-4 h-4 text-rose-600" />
                  <span>গোডাউন স্টক অ্যালার্ট - A4 PDF প্রিভিউ</span>
                </h3>
                <p className="text-[11px] text-slate-500">
                  ব্রাউজারের প্রিন্ট ডায়ালগ থেকে সরাসরি <strong className="text-slate-800">"Save as PDF"</strong> নির্বাচন করে ডাউনলোড করুন
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={handlePrint}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black inline-flex items-center space-x-1.5 shadow-md shadow-rose-600/20 transition-all cursor-pointer active:scale-95"
                title="PDF আকারে সেভ বা প্রিন্ট করুন"
              >
                <Printer className="w-4 h-4" />
                <span>প্রিন্ট / PDF ডাউনলোড</span>
              </button>

              <button
                type="button"
                onClick={handleDirectPDFWindow}
                className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold inline-flex items-center space-x-1.5 shadow-xs transition-colors cursor-pointer"
                title="নতুন ট্যাবে সরাসরি PDF উইন্ডো খুলুন"
              >
                <FileText className="w-4 h-4" />
                <span>নতুন ট্যাবে PDF</span>
              </button>

              <button
                type="button"
                onClick={handleExportCSV}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold inline-flex items-center space-x-1.5 shadow-xs transition-colors cursor-pointer"
                title="এক্সেল সিএসভি ফাইল ডাউনলোড করুন"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>এক্সেল</span>
              </button>

              <button
                type="button"
                onClick={() => setIsPdfPreviewMode(false)}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer"
              >
                বন্ধ করুন
              </button>
            </div>
          </div>

          {/* বাস্তব A4 কাগজের মতো দৃশ্যমান শীট (A4 Printable Document Container) */}
          <div
            id="godown-alert-a4-sheet"
            className="bg-white rounded-2xl shadow-xl border border-slate-300 p-6 sm:p-10 mx-auto print:p-0 print:border-none print:shadow-none print:m-0 print:rounded-none"
            style={{ minHeight: '297mm' }}
          >
            {/* অফিশিয়াল রিপোর্ট হেডার */}
            <div className="text-center pb-4 border-b-2 border-slate-900 mb-5">
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                {storeName}
              </h1>
              <p className="text-xs text-slate-600 mt-1">{storeAddress} • মোবাইল: {storePhone}</p>
              <div className="inline-block mt-3 px-5 py-1.5 bg-slate-900 text-white rounded-full text-xs font-black uppercase tracking-wider">
                গোডাউন স্টক অ্যালার্ট ও ঘাটতি খতিয়ান অডিট রিপোর্ট
              </div>
            </div>

            {/* রিপোর্ট মেটা ইনফো গ্রিড */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs mb-5">
              <div>
                <span className="text-slate-500 block text-[10.5px]">রিপোর্ট তৈরির সময়:</span>
                <span className="font-bold text-slate-800 font-mono">{new Date().toLocaleString('bn-BD')}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10.5px]">ফিল্টার স্ট্যাটাস:</span>
                <span className="font-bold text-slate-800">
                  {filterType === 'ALL' ? 'সকল ঘাটতি পণ্য' : filterType === 'OUT_OF_STOCK' ? 'সম্পূর্ণ স্টক শেষ' : 'সংকটজনক কম স্টক'}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10.5px]">আক্রান্ত মূল পণ্য:</span>
                <span className="font-bold text-slate-800">{stats.totalAlertProducts}টি মূল পণ্য</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10.5px]">মোট ঘাটতি আইটেম:</span>
                <span className="font-bold text-rose-700 font-mono">
                  {stats.totalAlertItems}টি (শেষ: {stats.outCount}, কম: {stats.lowCount})
                </span>
              </div>
            </div>

            {/* ৩ কলাম বিশিষ্ট স্টক অ্যালার্ট টেবিল */}
            <div className="border border-slate-300 rounded-xl overflow-hidden mb-6">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="bg-slate-100 text-slate-800 font-bold uppercase text-[11px] border-b border-slate-300">
                  <tr>
                    <th className="py-2.5 px-3 w-14 text-center border-r border-slate-200">ক্রমিক</th>
                    <th className="py-2.5 px-4 border-r border-slate-200">মূল পণ্য ও ভ্যারিয়েন্ট বিবরণ</th>
                    <th className="py-2.5 px-3 w-40 text-center">বারকোড</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredProducts.length === 0 ? (
                    <tr>
                      <td colSpan="3" className="py-8 text-center text-slate-400 font-bold">
                        কোনো ঘাটতি বা স্টক সতর্কতা পাওয়া যায়নি।
                      </td>
                    </tr>
                  ) : (
                    filteredProducts.map((p, idx) => {
                      const rowNum = idx + 1;
                      const parentBarcode = (p.barcode && p.barcode !== '—') ? p.barcode : (p.parentProduct?.Barcode || p.parentProduct?.barcode || '—');

                      if (p.hasVariants) {
                        const variantData = getVariantTypeAndValues(p.alertVariants);

                        return (
                          <tr key={p.productId} className="bg-white hover:bg-slate-50 border-t border-slate-200">
                            <td className="py-3 px-3 text-center text-slate-700 font-mono font-bold border-r border-slate-200">
                              {rowNum}
                            </td>
                            <td className="py-3 px-4 border-r border-slate-200">
                              <div className="text-sm font-black text-slate-900">{p.productName}</div>
                              <div className="text-[10px] text-slate-500 font-normal mt-0.5">
                                ID: {p.productId} {p.category ? `| ক্যাটাগরি: ${p.category}` : ''} | মোট ঘাটতি: {p.alertVariants.length}টি
                              </div>
                              <div className="mt-2 text-xs text-slate-800 leading-relaxed">
                                <span className="font-bold text-indigo-700">{variantData.type}: </span>
                                <span className="font-medium text-slate-700">{variantData.text}</span>
                              </div>
                            </td>
                            <td className="py-3 px-3 text-center font-mono text-slate-700 text-xs break-all">
                              {parentBarcode}
                            </td>
                          </tr>
                        );
                      }

                      // সাধারণ পণ্য (ভ্যারিয়েন্ট ছাড়া)
                      return (
                        <tr key={p.productId} className="bg-white hover:bg-slate-50 border-t border-slate-200">
                          <td className="py-3 px-3 text-center text-slate-700 font-mono font-bold border-r border-slate-200">
                            {rowNum}
                          </td>
                          <td className="py-3 px-4 border-r border-slate-200">
                            <div className="text-sm font-black text-slate-900 flex items-center space-x-2">
                              <span>{p.productName}</span>
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-normal bg-slate-100 text-slate-600 border border-slate-200">
                                সাধারণ পণ্য
                              </span>
                            </div>
                            <div className="text-[10px] text-slate-500 font-normal mt-0.5">
                              ID: {p.productId} {p.category ? `| ক্যাটাগরি: ${p.category}` : ''}
                            </div>
                          </td>
                          <td className="py-3 px-3 text-center font-mono text-slate-700 text-xs break-all">
                            {p.barcode || '—'}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* সামারি ফুটার বক্স */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs font-bold text-slate-700 mb-8">
              <span>সর্বমোট ঘাটতি আইটেম: <strong className="text-slate-900 font-mono">{stats.totalAlertItems}টি</strong></span>
              <span className="text-rose-700">🚨 সম্পূর্ণ স্টক শেষ: <strong className="font-mono">{stats.outCount}টি</strong></span>
              <span className="text-amber-700">⚠️ সংকটজনক কম স্টক: <strong className="font-mono">{stats.lowCount}টি</strong></span>
              <span className="text-slate-400 font-normal">সিস্টেম স্বয়ংক্রিয় অডিট কপি</span>
            </div>

            {/* অফিশিয়াল স্বাক্ষর ব্লক */}
            <div className="grid grid-cols-2 gap-16 pt-10 text-center text-xs text-slate-600">
              <div>
                <div className="border-t border-dashed border-slate-400 pt-2 font-bold text-slate-800">
                  গোডাউন ইনচার্জ / অডিটর স্বাক্ষর
                </div>
                <span className="text-[10px] text-slate-400 mt-0.5 block">তারিখ সহ</span>
              </div>
              <div>
                <div className="border-t border-dashed border-slate-400 pt-2 font-bold text-slate-800">
                  স্টোর ম্যানেজার / প্রোপ্রাইটর স্বাক্ষর
                </div>
                <span className="text-[10px] text-slate-400 mt-0.5 block">অনুমোদন সীল সহ</span>
              </div>
            </div>

          </div>

        </div>

        {/* প্রিন্ট উপযোগী স্টাইল */}
        <style>{`
          @media print {
            body {
              background: #ffffff !important;
              color: #000000 !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            .print\\:hidden {
              display: none !important;
            }
            #godown-alert-a4-sheet {
              border: none !important;
              box-shadow: none !important;
              padding: 0 !important;
              margin: 0 !important;
              width: 100% !important;
              max-width: 100% !important;
            }
            tr {
              break-inside: avoid !important;
              page-break-inside: avoid !important;
            }
            @page {
              size: A4 portrait;
              margin: 10mm 10mm 15mm 10mm;
            }
          }
        `}</style>
      </div>
    );
  }

  // ==========================================
  // ২. সাধারণ ড্যাশবোর্ড মোড (স্বাভাবিক ভিউ)
  // ==========================================
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
                  {stats.totalAlertItems}টি ঘাটতি ({stats.totalAlertProducts}টি পণ্যে)
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1 font-medium">
                গোডাউনে যেসব পণ্যের মূল নামের অধীনে ভ্যারিয়েন্টগুলোর মজুত শেষ বা কমে গেছে তাদের খতিয়ান
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 shrink-0 flex-wrap gap-y-1">
            {/* পিডিএফ জেনারেট বাটন */}
            <button
              type="button"
              onClick={() => setIsPdfPreviewMode(true)}
              className="px-3.5 py-2 bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-700 hover:to-pink-700 text-white rounded-xl text-xs font-black inline-flex items-center space-x-1.5 shadow-md shadow-rose-600/20 transition-all cursor-pointer active:scale-95"
              title="A4 পিডিএফ রিপোর্ট তৈরি ও প্রিভিউ দেখুন"
            >
              <FileText className="w-4 h-4" />
              <span>পিডিএফ রিপোর্ট তৈরি</span>
            </button>

            {/* সরাসরি পপআপ উইন্ডো PDF বাটন */}
            <button
              type="button"
              onClick={handleDirectPDFWindow}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold inline-flex items-center space-x-1.5 transition-colors cursor-pointer"
              title="নতুন ট্যাবে সরাসরি PDF ডাউনলোড ডায়ালগ খুলুন"
            >
              <Printer className="w-4 h-4 text-slate-600" />
              <span className="hidden sm:inline">দ্রুত প্রিন্ট / PDF</span>
            </button>

            {/* এক্সেল ডাউনলোড */}
            <button
              type="button"
              onClick={handleExportCSV}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold inline-flex items-center space-x-1.5 shadow-xs transition-colors cursor-pointer"
              title="এক্সেল বা সিএসভি ফাইল ডাউনলোড করুন"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>এক্সেল</span>
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
              <span className="text-xs font-bold text-slate-600">মোট ঘাটতি আইটেম</span>
              <span className="p-2 rounded-xl bg-indigo-100 text-indigo-700">
                <AlertTriangle className="w-4 h-4" />
              </span>
            </div>
            <div className="text-2xl font-black text-indigo-950 mt-2 font-mono">
              {stats.totalAlertItems.toLocaleString('bn-BD')} <span className="text-xs font-normal text-slate-500">টি আইটেম ({stats.totalAlertProducts}টি মূল পণ্যে)</span>
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
              placeholder="মূল পণ্য, ভ্যারিয়েন্ট, রং, সাইজ বা বারকোড দিয়ে খুঁজুন..."
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center space-x-2 w-full sm:w-auto justify-between sm:justify-end flex-wrap gap-y-2">
            {/* বিস্তার ও সংক্ষেপ টগল বাটন */}
            <div className="flex items-center space-x-1 text-xs">
              <button
                type="button"
                onClick={expandAll}
                className="px-2.5 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold transition-all flex items-center space-x-1 cursor-pointer"
                title="সকল ভ্যারিয়েন্ট বিস্তার করে দেখুন"
              >
                <span>সব বিস্তার</span>
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={collapseAll}
                className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-all flex items-center space-x-1 cursor-pointer"
                title="ভ্যারিয়েন্টগুলো সংক্ষেপ করুন"
              >
                <span>সংক্ষেপ</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* ফিল্টার সুইচ বাটন */}
            <div className="flex items-center space-x-1.5">
              <button
                type="button"
                onClick={() => setFilterType('ALL')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  filterType === 'ALL'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                সকল ({stats.totalAlertItems})
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
        </div>

        {/* পণ্য ভিত্তিক ও ভ্যারিয়েন্ট খতিয়ান টেবিল (প্যারেন্ট প্রডাক্ট নামের অধীনে ভ্যারিয়েন্ট তালিকা) */}
        <div className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100 text-slate-700 border-b border-slate-200 font-bold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4 w-14 text-center">ক্রমিক</th>
                  <th className="py-3 px-4">পণ্য ও ভ্যারিয়েন্ট বিবরণ</th>
                  <th className="py-3 px-4">বারকোড</th>
                  <th className="py-3 px-4 text-center bg-rose-50/70 text-rose-950 font-black">বর্তমান পরিমাণ</th>
                  <th className="py-3 px-4 text-center">সতর্কতা / অবস্থা</th>
                  <th className="py-3 px-4 text-center">প্রয়োজনীয় রিস্টক</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="py-12 text-center text-slate-400 font-medium">
                      <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
                      <p className="font-bold text-slate-700 text-sm">গোডাউনে কোনো ঘাটতি বা কম স্টক পণ্য নেই!</p>
                      <p className="text-xs text-slate-400 mt-0.5">সবগুলো ভ্যারিয়েন্ট ও পণ্য পর্যাপ্ত মজুতে রয়েছে।</p>
                    </td>
                  </tr>
                ) : (
                  filteredProducts.map((p, idx) => {
                    const expanded = isExpanded(p.productId);

                    if (p.hasVariants) {
                      return (
                        <React.Fragment key={p.productId}>
                          {/* মূল প্যারেন্ট পণ্য রো */}
                          <tr className="bg-slate-50/90 hover:bg-slate-100 border-t border-slate-200 transition-colors">
                            <td className="py-3 px-4 text-center font-mono font-bold text-slate-600">
                              {idx + 1}
                            </td>
                            <td className="py-3 px-4 font-bold text-slate-900">
                              <div className="flex items-center space-x-2">
                                <button
                                  type="button"
                                  onClick={() => toggleExpand(p.productId)}
                                  className="p-1 rounded-md text-indigo-600 hover:bg-indigo-100 transition-all cursor-pointer"
                                  title={expanded ? 'সংক্ষেপ করুন' : 'ভ্যারিয়েন্ট তালিকা বিস্তার করুন'}
                                >
                                  {expanded ? (
                                    <ChevronDown className="w-4 h-4 stroke-[2.5]" />
                                  ) : (
                                    <ChevronRight className="w-4 h-4 stroke-[2.5]" />
                                  )}
                                </button>
                                <span className="text-sm font-black text-slate-900 tracking-tight">
                                  {p.productName}
                                </span>
                                <span
                                  onClick={() => toggleExpand(p.productId)}
                                  className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-700 hover:bg-indigo-200 cursor-pointer shadow-2xs"
                                >
                                  <Palette className="w-2.5 h-2.5 mr-1" />
                                  {p.alertVariants.length}টি ভ্যারিয়েন্ট ঘাটতি
                                  {p.totalVariantsCount > p.alertVariants.length ? ` (মোট ${p.totalVariantsCount}টির মধ্যে)` : ''}
                                </span>
                                {p.category && (
                                  <span className="px-2 py-0.5 rounded-md text-[10px] bg-slate-200/80 text-slate-700 font-medium">
                                    {p.category}
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] font-mono text-slate-400 mt-0.5 ml-7">
                                ID: {p.productId} {p.barcode && p.barcode !== '—' ? `| #${p.barcode}` : ''}
                              </div>
                            </td>
                            <td className="py-3 px-4 font-mono text-slate-400 text-center text-xs">
                              —
                            </td>
                            <td className="py-3 px-4 text-center bg-rose-50/20">
                              <span className="text-xs font-mono font-bold text-slate-700">
                                মোট গোডাউন: {p.totalGodownStock} {p.unit}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-center">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10.5px] font-bold ${
                                p.alertVariants.some(v => v.isOut)
                                  ? 'bg-rose-100 text-rose-800 border border-rose-200'
                                  : 'bg-amber-100 text-amber-800 border border-amber-200'
                              }`}>
                                {p.alertVariants.some(v => v.isOut)
                                  ? '🚨 কিছু ভ্যারিয়েন্টে স্টক শেষ'
                                  : '⚠️ কিছু ভ্যারিয়েন্টে কম স্টক'}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-center text-slate-400 text-xs font-bold">
                              নিচে বিস্তারিত দেখুন ↓
                            </td>
                          </tr>

                          {/* প্যারেন্ট পণ্যের নামের অধীনে প্রতিটি ভ্যারিয়েন্ট সাব-রো */}
                          {expanded && p.alertVariants.map((v, vIdx) => (
                            <tr
                              key={v.key}
                              className={`hover:bg-indigo-50/40 transition-colors border-t border-slate-100 ${
                                v.isOut ? 'bg-rose-50/20' : 'bg-white'
                              }`}
                            >
                              <td className="py-2.5 px-4 text-center text-slate-400 font-mono text-[11px]">
                                {idx + 1}.{vIdx + 1}
                              </td>
                              <td className="py-2.5 px-4 pl-10">
                                <div className="flex items-center space-x-2">
                                  <CornerDownRight className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                                  <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-indigo-50/90 text-indigo-900 border border-indigo-200/80 font-bold text-xs shadow-2xs">
                                    <Palette className="w-3 h-3 text-indigo-600 mr-1.5" />
                                    {v.variantDesc}
                                  </span>
                                </div>
                              </td>
                              <td className="py-2.5 px-4 font-mono font-bold text-slate-600 text-xs">
                                {v.barcode}
                              </td>
                              <td className="py-2.5 px-4 text-center bg-rose-50/30">
                                <span
                                  className={`inline-block px-2.5 py-0.5 rounded-lg font-mono font-black text-xs ${
                                    v.isOut
                                      ? 'bg-rose-100 text-rose-800 border border-rose-300'
                                      : 'bg-amber-100 text-amber-800 border border-amber-300'
                                  }`}
                                >
                                  {v.currentQty} {p.unit}
                                </span>
                              </td>
                              <td className="py-2.5 px-4 text-center">
                                <span
                                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10.5px] font-bold ${
                                    v.isOut
                                      ? 'bg-rose-100 text-rose-800 border border-rose-200'
                                      : 'bg-amber-100 text-amber-800 border border-amber-200'
                                  }`}
                                >
                                  {v.alertStatusText}
                                </span>
                              </td>
                              <td className="py-2.5 px-4 text-center font-mono font-bold text-indigo-700">
                                <span className="px-2.5 py-0.5 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-800 text-xs shadow-2xs">
                                  {v.recommendedRestockQty} {p.unit}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </React.Fragment>
                      );
                    }

                    // সাধারণ পণ্য (কোনো ভ্যারিয়েন্ট নেই)
                    return (
                      <tr
                        key={p.productId}
                        className={`hover:bg-slate-50/80 transition-colors border-t border-slate-200 ${
                          p.isOut ? 'bg-rose-50/30' : 'bg-white'
                        }`}
                      >
                        <td className="py-3 px-4 text-center font-mono font-bold text-slate-600">
                          {idx + 1}
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-900">
                          <div className="flex items-center space-x-2">
                            <span className="text-sm font-black text-slate-900">{p.productName}</span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                              সাধারণ পণ্য
                            </span>
                            {p.category && (
                              <span className="px-2 py-0.5 rounded-md text-[10px] bg-slate-200/80 text-slate-700 font-medium">
                                {p.category}
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                            ID: {p.productId}
                          </div>
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-slate-600 text-xs">
                          {p.barcode}
                        </td>
                        <td className="py-3 px-4 text-center bg-rose-50/40">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-lg font-mono font-black text-xs ${
                              p.isOut
                                ? 'bg-rose-100 text-rose-800 border border-rose-300'
                                : 'bg-amber-100 text-amber-800 border border-amber-300'
                            }`}
                          >
                            {p.currentQty} {p.unit}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10.5px] font-bold ${
                              p.isOut
                                ? 'bg-rose-100 text-rose-800 border border-rose-200'
                                : 'bg-amber-100 text-amber-800 border border-amber-200'
                            }`}
                          >
                            {p.alertStatusText}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center font-mono font-bold text-indigo-700">
                          <span className="px-2.5 py-0.5 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-800 text-xs shadow-2xs">
                            {p.recommendedRestockQty} {p.unit}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
