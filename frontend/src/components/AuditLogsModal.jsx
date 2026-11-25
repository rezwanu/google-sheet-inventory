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
  SALE: 'bg-emerald-50 text-[#15803D] border-emerald-200/80',
  STOCK: 'bg-[#F5F5F5] text-[#111111] border-neutral-200/80',
  PRICE: 'bg-amber-50 text-[#B45309] border-amber-200/80',
  EXPENSE: 'bg-red-50 text-[#B91C1C] border-red-200/80',
  REGISTER: 'bg-slate-100 text-[#0F172A] border-slate-200/80',
  DELETE: 'bg-red-50 text-[#B91C1C] border-red-200/80',
  PAYMENT: 'bg-emerald-50 text-[#15803D] border-emerald-200/80',
  GENERAL: 'bg-[#F5F5F5] text-[#525252] border-neutral-200/80'
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
      className={embedded ? "w-full flex-1 flex flex-col min-h-0 bg-transparent" : "fixed inset-0 bg-neutral-900/40 flex items-center justify-center p-3 sm:p-5 z-[100]"}
      style={embedded ? {} : { zIndex: 100 }}
    >
      <div className={embedded ? "bg-white w-full flex-1 min-h-[calc(100vh-6.5rem)] rounded-lg flex flex-col overflow-hidden border border-neutral-200/80" : "bg-white w-full max-w-4xl rounded-lg flex flex-col max-h-[92vh] overflow-hidden border border-neutral-200/80"}>
        
        {/* মোডাল হেডার */}
        <div className="bg-[#FAFAFA] border-b border-neutral-200/80 text-[#111111] px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-md bg-[#F5F5F5] flex items-center justify-center border border-neutral-200/80 text-[#0F172A]">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-semibold tracking-tight text-[#111111]">অ্যাক্টিভিটি ও সিকিউরিটি অডিট ট্রেইল</h2>
              <p className="text-xs text-[#525252]">বিক্রি, স্টক হ্রাস-বৃদ্ধি, খরচ ও ব্যবহারকারীদের সকল কার্যক্রমের অডিট ইতিহাস</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`transition-colors cursor-pointer flex items-center space-x-1 rounded-md min-h-[44px] sm:min-h-[36px] border border-neutral-200/80 ${
              embedded
                ? 'px-3 py-1.5 bg-white hover:bg-[#F5F5F5] text-[#111111] font-medium text-xs'
                : 'min-w-[44px] sm:min-w-[36px] bg-white hover:bg-[#F5F5F5] text-[#737373] hover:text-[#111111] justify-center'
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

        {/* কেপিআই সামারি স্ট্রিপ */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-[#FAFAFA] border-b border-neutral-200/80 shrink-0">
          <div className="bg-white p-3 rounded-lg border border-neutral-200/80">
            <p className="text-xs font-medium text-[#525252]">মোট অডিট রেকর্ড</p>
            <p className="text-lg font-semibold font-mono tabular-nums text-[#111111] mt-0.5">{stats.total} টি</p>
          </div>
          <div className="bg-white p-3 rounded-lg border border-neutral-200/80">
            <p className="text-xs font-medium text-[#525252]">আজকের কার্যক্রম</p>
            <p className="text-lg font-semibold font-mono tabular-nums text-[#0F172A] mt-0.5">{stats.today} টি</p>
          </div>
          <div className="bg-white p-3 rounded-lg border border-neutral-200/80">
            <p className="text-xs font-medium text-[#525252]">অ্যাক্টিভ স্টাফ সংখ্যা</p>
            <p className="text-lg font-semibold font-mono tabular-nums text-[#15803D] mt-0.5">{stats.usersCount} জন</p>
          </div>
          <div className="bg-white p-3 rounded-lg border border-neutral-200/80">
            <p className="text-xs font-medium text-[#525252]">সংবেদনশীল অ্যাকশন</p>
            <p className="text-lg font-semibold font-mono tabular-nums text-[#B45309] mt-0.5">{stats.critical} টি</p>
          </div>
        </div>

        {/* ফিল্টার কন্ট্রোল বার */}
        <div className="p-4 bg-white border-b border-neutral-200/80 flex flex-wrap gap-2.5 items-center justify-between shrink-0">
          
          {/* সার্চ বক্স */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-[#737373] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="বিবরণ, ইউজার বা অ্যাকশন দিয়ে খুঁজুন..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs sm:text-sm rounded-md border border-neutral-200/80 bg-[#FAFAFA] focus:bg-white text-[#111111] focus:outline-none focus:border-[#0F172A] min-h-[44px] sm:min-h-[36px]"
            />
          </div>

          {/* মডিউল ফিল্টার */}
          <select
            value={selectedModule}
            onChange={(e) => setSelectedModule(e.target.value)}
            className="text-xs sm:text-sm px-3 py-1.5 rounded-md border border-neutral-200/80 bg-white text-[#111111] focus:outline-none focus:border-[#0F172A] cursor-pointer min-h-[44px] sm:min-h-[36px]"
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
            className="text-xs sm:text-sm px-3 py-1.5 rounded-md border border-neutral-200/80 bg-white text-[#111111] focus:outline-none focus:border-[#0F172A] cursor-pointer min-h-[44px] sm:min-h-[36px]"
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
            className="px-3 py-1.5 bg-white border border-neutral-200/80 hover:bg-[#F5F5F5] text-[#111111] rounded-md text-xs font-medium transition-colors flex items-center space-x-1.5 cursor-pointer min-h-[44px] sm:min-h-[36px]"
            title="JSON হিসেবে ডাউনলোড করুন"
          >
            <Download className="w-3.5 h-3.5" />
            <span>এক্সপোর্ট</span>
          </button>
        </div>

        {/* বডি টাইমলাইন ভিউ */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-[#FAFAFA]">
          {filteredLogs.length === 0 ? (
            <div className="bg-white rounded-lg border border-dashed border-neutral-200/80 p-12 text-center">
              <div className="w-12 h-12 mx-auto rounded-md bg-[#F5F5F5] border border-neutral-200/80 text-[#0F172A] flex items-center justify-center mb-3">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <h3 className="text-base font-semibold tracking-tight text-[#111111]">কোনো অডিট রেকর্ড পাওয়া যায়নি</h3>
              <p className="text-xs text-[#525252] mt-1 max-w-sm mx-auto">
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
                    className="bg-white rounded-lg border border-neutral-200/80 p-4 hover:border-neutral-300 transition-colors"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-start space-x-3">
                        <div className="w-9 h-9 rounded-md bg-[#F5F5F5] border border-neutral-200/80 flex items-center justify-center text-[#525252] shrink-0 mt-0.5">
                          <IconComp className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="flex items-center space-x-2 flex-wrap gap-1">
                            <span className={`px-2 py-0.5 rounded-md text-[11px] font-mono font-medium border ${actionBadgeClass}`}>
                              {log.ActionType || 'ACTION'}
                            </span>
                            <span className="text-xs font-medium text-[#525252] bg-[#F5F5F5] border border-neutral-200/80 px-2 py-0.5 rounded-md">
                              {log.Module || 'Core'}
                            </span>
                            <span className="text-xs font-semibold text-[#111111]">
                              {log.UserName || 'System'}
                            </span>
                            <span className="text-[11px] text-[#737373]">
                              ({log.UserRole || 'Admin'})
                            </span>
                          </div>
                          <p className="text-xs sm:text-sm text-[#111111] mt-1 font-medium">
                            {log.Description}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-3 self-end sm:self-center shrink-0">
                        <span className="text-xs text-[#737373] font-mono tabular-nums flex items-center space-x-1">
                          <Clock className="w-3.5 h-3.5" />
                          <span>{log.Timestamp ? new Date(log.Timestamp).toLocaleString('bn-BD') : 'N/A'}</span>
                        </span>

                        {formattedDetails && (
                          <button
                            onClick={() => setExpandedLogId(isExpanded ? null : log.LogID)}
                            className="p-1.5 rounded-md hover:bg-[#F5F5F5] text-[#525252] hover:text-[#111111] border border-transparent hover:border-neutral-200/80 transition-colors cursor-pointer min-h-[44px] min-w-[44px] sm:min-h-[36px] sm:min-w-[36px] flex items-center justify-center"
                            title="বিস্তারিত দেখুন"
                          >
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* এক্সপ্যান্ডেবল ডিটেইলস */}
                    {isExpanded && formattedDetails && (
                      <div className="mt-3 pt-3 border-t border-neutral-200/80">
                        <p className="text-[11px] font-medium text-[#525252] mb-1">অ্যাকশন ডাটা পে-লোড:</p>
                        <pre className="bg-[#0F172A] text-emerald-400 p-3 rounded-md text-xs font-mono overflow-x-auto max-h-48">
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
        <div className="bg-[#FAFAFA] px-6 py-3 border-t border-neutral-200/80 flex items-center justify-between text-xs text-[#525252] shrink-0">
          <p>অডিট ট্রেইল অপরিবর্তনীয় এবং স্বচ্ছ হিসাব নিশ্চিত করতে ক্লাউড ডাটাবেসের সাথে সিঙ্ক থাকে।</p>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-white border border-neutral-200/80 hover:bg-[#F5F5F5] text-[#111111] rounded-md font-medium cursor-pointer min-h-[44px] sm:min-h-[36px]"
          >
            বন্ধ করুন
          </button>
        </div>

      </div>
    </div>
  );
}

