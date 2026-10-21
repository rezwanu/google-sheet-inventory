import React, { useState, useMemo } from 'react';
import {
  X,
  ShieldAlert,
  Search,
  Clock,
  ChevronDown,
  ChevronUp,
  Download,
  Activity,
  Layers,
  ShoppingBag,
  Package,
  Receipt,
  Coins,
  Settings,
  Users
} from 'lucide-react';

const MODULE_ICONS = {
  Sales: ShoppingBag,
  Inventory: Package,
  Products: Layers,
  Customers: Users,
  Suppliers: Users,
  Expenses: Receipt,
  CashRegister: Coins,
  Settings: Settings,
  Core: Activity
};

const ACTION_COLORS = {
  SALE: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  STOCK: 'bg-blue-100 text-blue-800 border-blue-200',
  PRICE: 'bg-amber-100 text-amber-800 border-amber-200',
  EXPENSE: 'bg-rose-100 text-rose-800 border-rose-200',
  REGISTER: 'bg-purple-100 text-purple-800 border-purple-200',
  DELETE: 'bg-red-100 text-red-800 border-red-200',
  PAYMENT: 'bg-cyan-100 text-cyan-800 border-cyan-200',
  GENERAL: 'bg-slate-100 text-slate-800 border-slate-200'
};

export default function AuditLogsModal({
  isOpen = false,
  onClose,
  embedded = false,
  auditLogs = []
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedModule, setSelectedModule] = useState('all');
  const [selectedActionType, setSelectedActionType] = useState('all');
  const [expandedLogId, setExpandedLogId] = useState(null);

  // ফিল্টারকৃত লগ তালিকা
  const filteredLogs = useMemo(() => {
    const list = Array.isArray(auditLogs) ? auditLogs : [];

    return list.filter(item => {
      // মডিউল ফিল্টার
      if (selectedModule !== 'all' && item.Module !== selectedModule) {
        return false;
      }

      // অ্যাকশন ফিল্টার
      if (selectedActionType !== 'all' && item.ActionType !== selectedActionType) {
        return false;
      }

      // সার্চ ফিল্টার
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const desc = String(item.Description || '').toLowerCase();
        const user = String(item.UserName || '').toLowerCase();
        const type = String(item.ActionType || '').toLowerCase();
        const mod = String(item.Module || '').toLowerCase();
        return desc.includes(query) || user.includes(query) || type.includes(query) || mod.includes(query);
      }

      return true;
    });
  }, [auditLogs, selectedModule, selectedActionType, searchTerm]);

  // পরিসংখ্যান
  const stats = useMemo(() => {
    const list = Array.isArray(auditLogs) ? auditLogs : [];
    const today = new Date().toISOString().split('T')[0];

    let todayCount = 0;
    const usersSet = new Set();
    let criticalCount = 0;

    list.forEach(item => {
      const time = String(item.Timestamp || '');
      if (time.startsWith(today)) {
        todayCount++;
      }
      if (item.UserName) {
        usersSet.add(item.UserName);
      }
      if (item.ActionType === 'DELETE' || item.ActionType === 'PRICE') {
        criticalCount++;
      }
    });

    return {
      total: list.length,
      today: todayCount,
      usersCount: usersSet.size,
      critical: criticalCount
    };
  }, [auditLogs]);

  // JSON এক্সপোর্ট
  const handleExportJSON = () => {
    const blob = new Blob([JSON.stringify(filteredLogs, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
  };

  if (!isOpen && !embedded) return null;

  return (
    <div
      className={embedded ? "w-full flex-1 flex flex-col min-h-0 bg-transparent animate-in fade-in duration-200" : "fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 z-[100] animate-fadeIn"}
      style={embedded ? {} : { zIndex: 100 }}
    >
      <div className={embedded ? "bg-white w-full flex-1 min-h-[calc(100vh-6.5rem)] rounded-2xl shadow-sm flex flex-col overflow-hidden border border-slate-200/90" : "bg-white w-full max-w-4xl rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden border border-slate-100"}>
        
        {/* মোডাল হেডার */}
        <div className="bg-gradient-to-r from-slate-800 via-indigo-950 to-slate-900 text-white px-6 py-4 flex items-center justify-between shadow-md shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center backdrop-blur-xs border border-white/20">
              <ShieldAlert className="w-5 h-5 text-indigo-300" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">অ্যাক্টিভিটি ও সিকিউরিটি অডিট ট্রেইল</h2>
              <p className="text-xs text-indigo-200">বিক্রি, স্টক হ্রাস-বৃদ্ধি, খরচ ও ব্যবহারকারীদের সকল কার্যক্রমের অডিট ইতিহাস</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`transition-all cursor-pointer flex items-center space-x-1 ${
              embedded
                ? 'px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs border border-white/10 shadow-xs'
                : 'w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white/90 hover:text-white justify-center'
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

        {/* কেপিআই সামারি স্ট্রিপ */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-slate-50 border-b border-slate-200 shrink-0">
          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
            <p className="text-xs font-medium text-slate-500">মোট অডিট রেকর্ড</p>
            <p className="text-lg font-bold text-slate-800 mt-0.5">{stats.total} টি</p>
          </div>
          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
            <p className="text-xs font-medium text-slate-500">আজকের কার্যক্রম</p>
            <p className="text-lg font-bold text-indigo-600 mt-0.5">{stats.today} টি</p>
          </div>
          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
            <p className="text-xs font-medium text-slate-500">অ্যাক্টিভ স্টাফ সংখ্যা</p>
            <p className="text-lg font-bold text-emerald-600 mt-0.5">{stats.usersCount} জন</p>
          </div>
          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
            <p className="text-xs font-medium text-slate-500">সংবেদনশীল অ্যাকশন</p>
            <p className="text-lg font-bold text-amber-600 mt-0.5">{stats.critical} টি</p>
          </div>
        </div>

        {/* ফিল্টার কন্ট্রোল বার */}
        <div className="p-4 bg-white border-b border-slate-200 flex flex-wrap gap-2.5 items-center justify-between shrink-0">
          
          {/* সার্চ বক্স */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="বিবরণ, ইউজার বা অ্যাকশন দিয়ে খুঁজুন..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs sm:text-sm rounded-lg border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>

          {/* মডিউল ফিল্টার */}
          <select
            value={selectedModule}
            onChange={(e) => setSelectedModule(e.target.value)}
            className="text-xs sm:text-sm px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer"
          >
            <option value="all">সকল মডিউল</option>
            <option value="Sales">Sales (বিক্রয়)</option>
            <option value="Inventory">Inventory (স্টক)</option>
            <option value="Products">Products (পণ্য)</option>
            <option value="Customers">Customers (গ্রাহক)</option>
            <option value="Suppliers">Suppliers (সাপ্লায়ার)</option>
            <option value="Expenses">Expenses (খরচের খাতা)</option>
            <option value="CashRegister">CashRegister (ক্যাশ ড্রয়ার)</option>
            <option value="Settings">Settings (সেটিংস)</option>
          </select>

          {/* অ্যাকশন টাইপ ফিল্টার */}
          <select
            value={selectedActionType}
            onChange={(e) => setSelectedActionType(e.target.value)}
            className="text-xs sm:text-sm px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer"
          >
            <option value="all">সকল অ্যাকশন</option>
            <option value="SALE">SALE (বিক্রি)</option>
            <option value="STOCK">STOCK (স্টক পরিবর্তন)</option>
            <option value="PRICE">PRICE (মূল্য পরিবর্তন)</option>
            <option value="EXPENSE">EXPENSE (খরচ)</option>
            <option value="REGISTER">REGISTER (ক্যাশ ক্লোজিং)</option>
            <option value="DELETE">DELETE (মুছে ফেলা)</option>
          </select>

          {/* এক্সপোর্ট বাটন */}
          <button
            onClick={handleExportJSON}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors flex items-center space-x-1 cursor-pointer"
            title="JSON হিসেবে ডাউনলোড করুন"
          >
            <Download className="w-3.5 h-3.5" />
            <span>এক্সপোর্ট</span>
          </button>
        </div>

        {/* বডি টাইমলাইন ভিউ */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50/50">
          {filteredLogs.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center">
              <div className="w-14 h-14 mx-auto rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mb-3">
                <ShieldAlert className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold text-slate-800">কোনো অডিট রেকর্ড পাওয়া যায়নি</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                সিস্টেমে কোনো নতুন বিক্রি, স্টক পরিবর্তন বা ক্যাশ ক্লোজিং সম্পন্ন হলে স্বয়ংক্রিয়ভাবে এখানে লগ প্রদর্শিত হবে।
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredLogs.map((log) => {
                const IconComp = MODULE_ICONS[log.Module] || Activity;
                const actionBadgeClass = ACTION_COLORS[log.ActionType] || ACTION_COLORS.GENERAL;
                const isExpanded = expandedLogId === log.LogID;

                let formattedDetails = null;
                if (log.DetailsJson) {
                  try {
                    const parsed = typeof log.DetailsJson === 'string' ? JSON.parse(log.DetailsJson) : log.DetailsJson;
                    formattedDetails = JSON.stringify(parsed, null, 2);
                  } catch (e) {
                    formattedDetails = String(log.DetailsJson);
                  }
                }

                return (
                  <div
                    key={log.LogID || Math.random()}
                    className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs hover:border-slate-300 transition-all"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-start space-x-3">
                        <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 shrink-0 mt-0.5">
                          <IconComp className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="flex items-center space-x-2 flex-wrap gap-1">
                            <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold border ${actionBadgeClass}`}>
                              {log.ActionType || 'ACTION'}
                            </span>
                            <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                              {log.Module || 'Core'}
                            </span>
                            <span className="text-xs font-bold text-slate-800">
                              {log.UserName || 'System'}
                            </span>
                            <span className="text-[11px] text-slate-400">
                              ({log.UserRole || 'Admin'})
                            </span>
                          </div>
                          <p className="text-xs sm:text-sm text-slate-800 mt-1 font-medium">
                            {log.Description}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-3 self-end sm:self-center shrink-0">
                        <span className="text-xs text-slate-400 font-mono flex items-center space-x-1">
                          <Clock className="w-3.5 h-3.5" />
                          <span>{log.Timestamp ? new Date(log.Timestamp).toLocaleString('bn-BD') : 'N/A'}</span>
                        </span>

                        {formattedDetails && (
                          <button
                            onClick={() => setExpandedLogId(isExpanded ? null : log.LogID)}
                            className="p-1 rounded hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                            title="বিস্তারিত দেখুন"
                          >
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* এক্সপ্যান্ডেবল ডিটেইলস */}
                    {isExpanded && formattedDetails && (
                      <div className="mt-3 pt-3 border-t border-slate-100">
                        <p className="text-[11px] font-semibold text-slate-500 mb-1">অ্যাকশন ডাটা পে-লোড:</p>
                        <pre className="bg-slate-900 text-emerald-400 p-3 rounded-lg text-xs font-mono overflow-x-auto max-h-48">
                          {formattedDetails}
                        </pre>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* মোডাল ফুটার */}
        <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <p>অডিট ট্রেইল অপরিবর্তনীয় এবং স্বচ্ছ হিসাব নিশ্চিত করতে ক্লাউড ডাটাবেসের সাথে সিঙ্ক থাকে।</p>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-lg font-medium cursor-pointer"
          >
            বন্ধ করুন
          </button>
        </div>

      </div>
    </div>
  );
}

