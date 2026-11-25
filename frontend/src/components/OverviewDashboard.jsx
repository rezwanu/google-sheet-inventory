import React, { useMemo } from 'react';
import {
  ArrowUpRight,
  ArrowDownRight,
  Printer,
  Plus,
  RefreshCw,
  Lock,
  AlertTriangle,
  Receipt,
  CheckCircle2
} from 'lucide-react';
import { StatusBadge, KpiSkeletonStrip, TableSkeletonRows, EmptyState } from './ui';
import { normalizeSale } from '../services/storage';
import { isAdminUser } from '../utils/permissionUtils';

/**
 * Executive Overview Dashboard (Linear & Stripe Utilitarian Minimalism)
 * - ৪-মেট্রিক KPI স্ট্রিপ (Today's Sales, Total Orders, Net Profit, Low Stock Items + % deltas)
 * - অ্যাসিমেট্রিক ২-কলাম লেআউট: Recent Transactions (65% width) ও Low Stock Alerts (35% width + Restock action)
 */
export default function OverviewDashboard({
  products = [],
  salesHistory = [],
  orders = [],
  expenses = [],
  currencySymbol = '৳',
  activeUser = null,
  isPinAuthorized = false,
  onRequestAdminUnlock,
  isLoading = false,
  onNavigate,
  onQuickRestock,
  onReprintInvoice,
}) {
  const isAdmin = isAdminUser(activeUser) || isPinAuthorized;

  const formatMoney = (val) => {
    const num = Number(val) || 0;
    return `${currencySymbol}${Math.round(num).toLocaleString('en-IN')}`;
  };

  // তারিখ হেল্পার
  const { todayStr, yesterdayStr, monthPrefix } = useMemo(() => {
    const now = new Date();
    const t = now.toISOString().split('T')[0];
    const yDate = new Date(now);
    yDate.setDate(yDate.getDate() - 1);
    const y = yDate.toISOString().split('T')[0];
    return {
      todayStr: t,
      yesterdayStr: y,
      monthPrefix: t.slice(0, 7),
    };
  }, []);

  // ৪টি কোর KPI ও ডেল্টা % হিসাব
  const kpi = useMemo(() => {
    const normalizedSales = (Array.isArray(salesHistory) ? salesHistory : [])
      .map(normalizeSale)
      .filter(Boolean);

    // পণ্যের কস্ট ম্যাপ তৈরি (COGS হিসাবের জন্য)
    const costMap = {};
    (Array.isArray(products) ? products : []).forEach((p) => {
      if (p.ProductID) costMap[p.ProductID] = Number(p.CostPrice) || 0;
    });

    let todaySales = 0;
    let yesterdaySales = 0;
    let todayOrders = 0;
    let yesterdayOrders = 0;
    let todayCogs = 0;
    let yesterdayCogs = 0;

    normalizedSales.forEach((s) => {
      const datePart = String(s.timestamp || s.CreatedAt || '').slice(0, 10);
      const amt = Number(s.grandTotal) || 0;
      let saleCogs = 0;
      (s.items || []).forEach((it) => {
        const unitCost = Number(it.costPrice) || costMap[it.productId] || 0;
        saleCogs += unitCost * (Number(it.quantity) || 1);
      });

      if (datePart === todayStr) {
        todaySales += amt;
        todayOrders += 1;
        todayCogs += saleCogs;
      } else if (datePart === yesterdayStr) {
        yesterdaySales += amt;
        yesterdayOrders += 1;
        yesterdayCogs += saleCogs;
      }
    });

    // অনলাইন অর্ডার (যদি ইন-স্টোর সেলসে ডুপ্লিকেট না থাকে)
    const saleInvSet = new Set(normalizedSales.map((s) => String(s.invoiceNo || '').toLowerCase()));
    (Array.isArray(orders) ? orders : []).forEach((o) => {
      const id = String(o.OrderID || o.OrderNumber || '').toLowerCase();
      if (id && saleInvSet.has(id)) return;
      if (o.Status === 'Cancelled') return;
      const d = String(o.OrderDate || '').slice(0, 10);
      const amt = Number(o.TotalAmount) || 0;
      if (d === todayStr) {
        todaySales += amt;
        todayOrders += 1;
      } else if (d === yesterdayStr) {
        yesterdaySales += amt;
        yesterdayOrders += 1;
      }
    });

    let todayExpenses = 0;
    let yesterdayExpenses = 0;
    (Array.isArray(expenses) ? expenses : []).forEach((e) => {
      const d = String(e.Date || e.date || '').slice(0, 10);
      const amt = Number(e.Amount || e.amount) || 0;
      if (d === todayStr) todayExpenses += amt;
      else if (d === yesterdayStr) yesterdayExpenses += amt;
    });

    const todayNetProfit = todaySales - todayCogs - todayExpenses;
    const yesterdayNetProfit = yesterdaySales - yesterdayCogs - yesterdayExpenses;

    const calcDelta = (cur, prev) => {
      if (prev <= 0) return cur > 0 ? 100 : 0;
      return Math.round(((cur - prev) / prev) * 100);
    };

    const lowStockList = (Array.isArray(products) ? products : [])
      .filter((p) => {
        const stock = Number(p.StockQuantity || 0);
        const minAlert = Number(p.MinStockAlert || 5);
        return stock <= minAlert;
      })
      .sort((a, b) => Number(a.StockQuantity || 0) - Number(b.StockQuantity || 0));

    return {
      todaySales,
      salesDelta: calcDelta(todaySales, yesterdaySales),
      todayOrders,
      ordersDelta: calcDelta(todayOrders, yesterdayOrders),
      todayNetProfit,
      profitDelta: calcDelta(todayNetProfit, yesterdayNetProfit),
      lowStockCount: lowStockList.length,
      outOfStockCount: lowStockList.filter((p) => Number(p.StockQuantity || 0) <= 0).length,
      lowStockList: lowStockList.slice(0, 8),
      recentTransactions: normalizedSales.slice(0, 10),
    };
  }, [products, salesHistory, orders, expenses, todayStr, yesterdayStr]);

  const renderDeltaBadge = (delta) => {
    const isPositive = delta >= 0;
    return (
      <span
        className={`inline-flex items-center gap-0.5 text-[11px] font-mono tabular-nums font-medium ${
          isPositive ? 'text-[#15803D]' : 'text-[#B91C1C]'
        }`}
      >
        {isPositive ? (
          <ArrowUpRight className="w-3 h-3" />
        ) : (
          <ArrowDownRight className="w-3 h-3" />
        )}
        {isPositive ? `+${delta}%` : `${delta}%`} vs yesterday
      </span>
    );
  };

  return (
    <div className="w-full space-y-5">
      {/* হেডার বার */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold font-heading tracking-tight text-[#111111]">
            Executive Overview
          </h1>
          <p className="text-xs text-[#525252] mt-0.5">
            আজকের বিক্রয়, নিট মুনাফা এবং স্টক সতর্কতার তাৎক্ষণিক সারসংক্ষেপ
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onNavigate && onNavigate('analytics')}
            className="min-h-[44px] md:min-h-[36px] px-3.5 py-1.5 rounded-md border border-neutral-200/80 bg-white hover:bg-neutral-100 text-xs font-medium text-[#111111] transition-colors cursor-pointer"
          >
            Detailed P&L Report
          </button>
          <button
            type="button"
            onClick={() => onNavigate && onNavigate('pos')}
            className="min-h-[44px] md:min-h-[36px] px-3.5 py-1.5 rounded-md bg-[#0F172A] hover:bg-slate-800 text-white text-xs font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Open POS Terminal</span>
          </button>
        </div>
      </div>

      {/* ১. ৪-মেট্রিক KPI স্ট্রিপ */}
      {isLoading ? (
        <KpiSkeletonStrip count={4} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Today's Sales */}
          <div className="bg-white border border-neutral-200/80 rounded-lg p-5 space-y-2">
            <div className="flex items-center justify-between text-xs font-medium text-[#525252]">
              <span>Today&apos;s Sales</span>
              <span className="font-mono text-[10px] text-[#737373]">{monthPrefix}</span>
            </div>
            <div className="text-2xl font-semibold font-mono tabular-nums tracking-tight text-[#111111]">
              {formatMoney(kpi.todaySales)}
            </div>
            <div>{renderDeltaBadge(kpi.salesDelta)}</div>
          </div>

          {/* Card 2: Total Orders */}
          <div className="bg-white border border-neutral-200/80 rounded-lg p-5 space-y-2">
            <div className="flex items-center justify-between text-xs font-medium text-[#525252]">
              <span>Total Orders</span>
              <span className="font-mono text-[10px] text-[#737373]">TODAY</span>
            </div>
            <div className="text-2xl font-semibold font-mono tabular-nums tracking-tight text-[#111111]">
              {kpi.todayOrders}
            </div>
            <div>{renderDeltaBadge(kpi.ordersDelta)}</div>
          </div>

          {/* Card 3: Net Profit */}
          <div className="bg-white border border-neutral-200/80 rounded-lg p-5 space-y-2">
            <div className="flex items-center justify-between text-xs font-medium text-[#525252]">
              <span>Net Profit</span>
              {!isAdmin && <Lock className="w-3.5 h-3.5 text-[#737373]" />}
            </div>
            {isAdmin ? (
              <>
                <div className="text-2xl font-semibold font-mono tabular-nums tracking-tight text-[#111111]">
                  {formatMoney(kpi.todayNetProfit)}
                </div>
                <div>{renderDeltaBadge(kpi.profitDelta)}</div>
              </>
            ) : (
              <div className="pt-1">
                <button
                  type="button"
                  onClick={onRequestAdminUnlock}
                  className="text-xs font-medium text-[#0F172A] underline cursor-pointer"
                >
                  Admin PIN দিয়ে দেখুন
                </button>
              </div>
            )}
          </div>

          {/* Card 4: Low Stock Items */}
          <div className="bg-white border border-neutral-200/80 rounded-lg p-5 space-y-2">
            <div className="flex items-center justify-between text-xs font-medium text-[#525252]">
              <span>Low Stock Items</span>
              {kpi.outOfStockCount > 0 && (
                <StatusBadge variant="danger" mono>
                  {kpi.outOfStockCount} Out
                </StatusBadge>
              )}
            </div>
            <div className="text-2xl font-semibold font-mono tabular-nums tracking-tight text-[#111111]">
              {kpi.lowStockCount}
            </div>
            <button
              type="button"
              onClick={() => onNavigate && onNavigate('inventory')}
              className="text-[11px] font-medium text-[#525252] hover:text-[#111111] transition-colors cursor-pointer"
            >
              View inventory alerts →
            </button>
          </div>
        </div>
      )}

      {/* ২. অ্যাসিমেট্রিক ২-কলাম কন্টেন্ট এরিয়া (65% Left / 35% Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* বাম অংশ (~65% = 8 cols): Recent Transactions */}
        <div className="lg:col-span-8 bg-white border border-neutral-200/80 rounded-lg overflow-hidden">
          <div className="px-5 py-4 border-b border-neutral-200/80 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold font-heading tracking-tight text-[#111111]">
                Recent Transactions
              </h2>
              <p className="text-[11px] text-[#737373] mt-0.5">
                সর্বশেষ বিক্রয় ও ইনভয়েস সমূহ
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate && onNavigate('orders')}
              className="text-xs font-medium text-[#525252] hover:text-[#111111] cursor-pointer"
            >
              All Sales →
            </button>
          </div>

          {isLoading ? (
            <div className="p-4">
              <TableSkeletonRows rows={6} cols={5} />
            </div>
          ) : kpi.recentTransactions.length === 0 ? (
            <div className="p-5">
              <EmptyState
                compact
                icon={Receipt}
                title="কোনো লেনদেন এখনো রেকর্ড হয়নি"
                description="POS Terminal থেকে প্রথম বিক্রয় সম্পন্ন করলে এখানে তালিকা প্রদর্শিত হবে।"
                actionLabel="New Sale শুরু করুন"
                onAction={() => onNavigate && onNavigate('pos')}
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-neutral-200/80 bg-[#FAFAFA] text-[#525252] text-[11px] font-medium">
                    <th className="py-2.5 px-4">Invoice</th>
                    <th className="py-2.5 px-4">Customer</th>
                    <th className="py-2.5 px-4">Method</th>
                    <th className="py-2.5 px-4">Status</th>
                    <th className="py-2.5 px-4 text-right">Amount</th>
                    <th className="py-2.5 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200/80">
                  {kpi.recentTransactions.map((sale, idx) => {
                    const isDue = Number(sale.dueAmount || 0) > 0;
                    const dateTxt = sale.timestamp
                      ? new Date(sale.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                      : '--:--';
                    return (
                      <tr key={sale.saleId || sale.invoiceNo || idx} className="hover:bg-[#FAFAFA] transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-mono tabular-nums font-medium text-[#111111]">
                            {sale.invoiceNo || 'INV-LOCAL'}
                          </div>
                          <div className="font-mono tabular-nums text-[10.5px] text-[#737373]">
                            {String(sale.timestamp || '').slice(0, 10)} {dateTxt}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-[#111111] font-medium max-w-[160px] truncate">
                          {sale.customerName || 'Walk-in Customer'}
                        </td>
                        <td className="py-3 px-4 text-[#525252] font-mono text-[11px]">
                          {sale.paymentMethod || 'Cash'}
                        </td>
                        <td className="py-3 px-4">
                          <StatusBadge variant={isDue ? 'warning' : 'success'}>
                            {isDue ? 'Due' : 'Paid'}
                          </StatusBadge>
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold text-[#111111]">
                          {formatMoney(sale.grandTotal)}
                        </td>
                        <td className="py-3 px-4 text-right">
                          {onReprintInvoice && (
                            <button
                              type="button"
                              onClick={() => onReprintInvoice(sale)}
                              title="Print Invoice"
                              className="inline-flex items-center justify-center min-w-[36px] min-h-[32px] px-2 py-1 rounded-md border border-neutral-200/80 bg-white hover:bg-neutral-100 text-[#525252] hover:text-[#111111] transition-colors cursor-pointer"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ডান অংশ (~35% = 4 cols): Low Stock Alerts */}
        <div className="lg:col-span-4 bg-white border border-neutral-200/80 rounded-lg overflow-hidden">
          <div className="px-5 py-4 border-b border-neutral-200/80 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-[#B45309]" />
              <h2 className="text-sm font-semibold font-heading tracking-tight text-[#111111]">
                Low Stock Alerts
              </h2>
            </div>
            <StatusBadge variant={kpi.lowStockCount > 0 ? 'warning' : 'success'} mono>
              {kpi.lowStockCount}
            </StatusBadge>
          </div>

          <div className="divide-y divide-neutral-200/80">
            {kpi.lowStockList.length === 0 ? (
              <div className="p-6 text-center space-y-1.5">
                <CheckCircle2 className="w-6 h-6 text-[#15803D] mx-auto" />
                <p className="text-xs font-medium text-[#111111]">সব পণ্যের স্টক পর্যাপ্ত</p>
                <p className="text-[11px] text-[#737373]">কোনো জরুরি রিস্টক প্রয়োজন নেই</p>
              </div>
            ) : (
              kpi.lowStockList.map((prod) => {
                const qty = Number(prod.StockQuantity || 0);
                const isOut = qty <= 0;
                return (
                  <div
                    key={prod.ProductID}
                    className="px-5 py-3 flex items-center justify-between gap-3 hover:bg-[#FAFAFA] transition-colors"
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-medium text-[#111111] truncate">
                        {prod.ProductName}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10.5px] font-mono tabular-nums text-[#737373]">
                          {prod.ProductID}
                        </span>
                        <StatusBadge variant={isOut ? 'danger' : 'warning'} mono>
                          {isOut ? 'Out (0)' : `${qty} ${prod.Unit || 'Pcs'}`}
                        </StatusBadge>
                      </div>
                    </div>

                    {onQuickRestock && (
                      <button
                        type="button"
                        onClick={() => onQuickRestock(prod)}
                        className="min-h-[36px] px-2.5 py-1 rounded-md border border-neutral-200/80 bg-white hover:bg-[#0F172A] hover:text-white hover:border-[#0F172A] text-xs font-medium text-[#111111] transition-colors shrink-0 inline-flex items-center gap-1 cursor-pointer"
                      >
                        <RefreshCw className="w-3 h-3" />
                        <span>Restock</span>
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
