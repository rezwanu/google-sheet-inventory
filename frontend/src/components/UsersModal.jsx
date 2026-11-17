import React, { useState, useMemo, useRef } from 'react';
import {
  X,
  Users,
  UserPlus,
  ShieldCheck,
  UserCheck,
  ShoppingBag,
  Briefcase,
  KeyRound,
  Phone,
  Mail,
  MapPin,
  Search,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Edit2,
  Trash2,
  RefreshCw,
  Power,
  Sparkles,
  Loader2,
  Crown,
  Upload,
  User,
  Copy,
  Check,
  LayoutGrid,
  List,
  Printer,
  Calendar,
  Clock,
  Award,
  ChevronRight,
  FileText,
  Heart,
  Shield,
  Activity,
  TrendingUp,
  CreditCard,
  UserX,
  BadgePercent,
  Wallet,
  PhoneCall
} from 'lucide-react';
import {
  formatImageUrl,
  getLocalStaffAttendance,
  clockInStaffLocally,
  clockOutStaffLocally
} from '../services/storage';

export const ROLES = [
  {
    id: 'Admin',
    name: 'এডমিন (Admin)',
    tag: 'সুপার এক্সেস',
    icon: Crown,
    badgeColor: 'bg-indigo-100 text-indigo-800 border-indigo-200/90',
    cardBorder: 'border-indigo-500 bg-gradient-to-b from-indigo-50/90 to-white text-indigo-950 ring-2 ring-indigo-500/30 shadow-md shadow-indigo-500/10',
    avatarGradient: 'from-indigo-600 via-indigo-700 to-violet-800',
    description: 'সম্পূর্ণ সিস্টেম, সেটিংস, রিপোর্ট ও ব্যবহারকারী নিয়ন্ত্রণ',
    defaultPermissions: ['canGiveDiscount', 'canViewBuyingPrice', 'canDeleteOrders', 'canTransferStock', 'canManageExpenses', 'canViewReports']
  },
  {
    id: 'Manager',
    name: 'ম্যানেজার (Manager)',
    tag: 'ইনভেন্টরি কন্ট্রোল',
    icon: ShieldCheck,
    badgeColor: 'bg-blue-100 text-blue-800 border-blue-200/90',
    cardBorder: 'border-blue-500 bg-gradient-to-b from-blue-50/90 to-white text-blue-950 ring-2 ring-blue-500/30 shadow-md shadow-blue-500/10',
    avatarGradient: 'from-blue-600 via-blue-700 to-indigo-700',
    description: 'ইনভেন্টরি, পণ্য স্টক, ক্রয়-বিক্রয় ও হিস্ট্রি ব্যবস্থাপনা',
    defaultPermissions: ['canGiveDiscount', 'canTransferStock', 'canManageExpenses', 'canViewReports']
  },
  {
    id: 'Cashier',
    name: 'ক্যাশিয়ার (Cashier)',
    tag: 'কাউন্টার বিলিং',
    icon: Briefcase,
    badgeColor: 'bg-amber-100 text-amber-900 border-amber-200/90',
    cardBorder: 'border-amber-500 bg-gradient-to-b from-amber-50/90 to-white text-amber-950 ring-2 ring-amber-500/30 shadow-md shadow-amber-500/10',
    avatarGradient: 'from-amber-500 via-orange-600 to-amber-700',
    description: 'POS কাউন্টারে দ্রুত বিক্রয় এবং ইনভয়েস মেমো তৈরি',
    defaultPermissions: ['canGiveDiscount']
  },
  {
    id: 'Salesman',
    name: 'সেলসম্যান (Salesman)',
    tag: 'সেলস ও বুকিং',
    icon: UserCheck,
    badgeColor: 'bg-purple-100 text-purple-900 border-purple-200/90',
    cardBorder: 'border-purple-500 bg-gradient-to-b from-purple-50/90 to-white text-purple-950 ring-2 ring-purple-500/30 shadow-md shadow-purple-500/10',
    avatarGradient: 'from-purple-600 via-fuchsia-600 to-indigo-700',
    description: 'কাউন্টার ও ফিল্ড সেলস, পণ্য অর্ডার নেওয়া ও ক্যাটালগ প্রদর্শন',
    defaultPermissions: []
  },
  {
    id: 'Customer',
    name: 'গ্রাহক (Customer)',
    tag: 'অনলাইন শপ',
    icon: ShoppingBag,
    badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200/90',
    cardBorder: 'border-emerald-500 bg-gradient-to-b from-emerald-50/90 to-white text-emerald-950 ring-2 ring-emerald-500/30 shadow-md shadow-emerald-500/10',
    avatarGradient: 'from-emerald-500 via-teal-600 to-emerald-700',
    description: 'অনলাইন শপ ক্যাটালগ ব্রাউজ, শপিং কার্ট ও নিজস্ব অর্ডার ট্র্যাক',
    defaultPermissions: []
  },
];

const PERMISSION_DEFINITIONS = [
  { id: 'canGiveDiscount', label: 'ডিসকাউন্ট ও বিশেষ ছাড়', desc: 'বিল কাটার সময় কুপন ছাড়াও ম্যানুয়াল ডিসকাউন্ট দেওয়ার অনুমতি' },
  { id: 'canViewBuyingPrice', label: 'পণ্যের কেনা দাম (Cost Price)', desc: 'পণ্যের পাইকারি কেনা দর ও লাভ-ক্ষতির গোপনীয় হিসাব দেখার অনুমতি' },
  { id: 'canDeleteOrders', label: 'অর্ডার ও ইনভয়েস বাতিল/মুছুন', desc: 'পূর্ববর্তী ইনভয়েস বা ভাউচার মুছে ফেলার প্রশাসনিক ক্ষমতা' },
  { id: 'canTransferStock', label: 'গোডাউন স্টক ট্রান্সফার ও চালান', desc: 'গোডাউন থেকে দোকানে পণ্য আনা-নেওয়া ও চালান প্রস্তুতের ক্ষমতা' },
  { id: 'canManageExpenses', label: 'খরচের খাতা এন্ট্রি', desc: 'দোকানের দৈনন্দিন নাস্তা, বিল ও অন্যান্য খরচের ভাউচার এন্ট্রি' },
  { id: 'canViewReports', label: 'P&L লাভ-ক্ষতি ও অডিট রিপোর্ট', desc: 'মালিকানা রিপোর্ট, অডিট হিস্ট্রি ও ক্যাশ ড্রয়ার EOD রিপোর্ট' },
];

export default function UsersModal({
  isOpen,
  onClose,
  embedded = false,
  users = [],
  activeUser = null,
  onAddUser,
  onUpdateUser,
  onDeleteUser,
  onRefreshUsers,
  isLoading = false,
  salesHistory = [],
  expenses = [],
  auditLogs = [],
  settings = {},
  currencySymbol = '৳'
}) {
  const [activeMainTab, setActiveMainTab] = useState('users'); // 'users' | 'attendance'
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState('All');
  const [sortBy, setSortBy] = useState('default');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'table'

  // নতুন/এডিট ফর্ম স্টেট
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState(null);
  const [formActiveTab, setFormActiveTab] = useState('basic'); // 'basic' | 'finance' | 'kyc' | 'permissions'

  // সাব-মোডালসমূহ (ID Card, Deep Profile)
  const [selectedStaffForIdCard, setSelectedStaffForIdCard] = useState(null);
  const [selectedStaffForProfile, setSelectedStaffForProfile] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  const [revealedPinId, setRevealedPinId] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  // হাজিরা স্টেট
  const [attendanceRecords, setAttendanceRecords] = useState(() => getLocalStaffAttendance());

  // ফর্ম ফিল্ড স্টেট
  const [formData, setFormData] = useState({
    FullName: '',
    Phone: '',
    Email: '',
    Role: 'Cashier',
    PIN: '',
    Address: '',
    AvatarUrl: '',
    Status: 'Active',
    BaseSalary: '',
    CommissionRate: '',
    NID: '',
    EmergencyContact: '',
    EmergencyPhone: '',
    BloodGroup: '',
    Permissions: ['canGiveDiscount']
  });

  // ছবি আপলোড
  const fileInputRef = useRef(null);
  const [avatarPreview, setAvatarPreview] = useState('');
  const [avatarBase64, setAvatarBase64] = useState('');
  const [avatarMimeType, setAvatarMimeType] = useState('');
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // হাজিরা রিফ্রেশ
  const refreshAttendance = () => {
    setAttendanceRecords(getLocalStaffAttendance());
  };

  // স্টোরের মেটাডাটা
  const storeName = settings?.StoreName || 'Pabna Bostraloy';
  const storePhone = settings?.Phone || settings?.StorePhone || '';
  const storeAddress = settings?.Address || settings?.StoreAddress || 'Pabna, Bangladesh';

  // ইউজার ও স্টাফ মেট্রিক্স হিসাব
  const metrics = useMemo(() => {
    const list = users || [];
    const total = list.length;
    const adminOnly = list.filter((u) => u.Role === 'Admin').length;
    const managers = list.filter((u) => u.Role === 'Manager').length;
    const admins = adminOnly + managers;
    const cashiers = list.filter((u) => u.Role === 'Cashier').length;
    const salesmen = list.filter((u) => u.Role === 'Salesman').length;
    const staff = cashiers + salesmen + list.filter((u) => u.Role === 'Staff').length;
    const customers = list.filter((u) => u.Role === 'Customer').length;
    const active = list.filter((u) => u.Status !== 'Inactive').length;
    const inactive = total - active;

    const todayStr = new Date().toISOString().split('T')[0];
    const todayPresentCount = attendanceRecords.filter(r => r.Date === todayStr).length;

    return { total, adminOnly, managers, admins, cashiers, salesmen, staff, customers, active, inactive, todayPresentCount };
  }, [users, attendanceRecords]);

  // ফিল্টারকৃত ইউজার তালিকা
  const filteredUsers = useMemo(() => {
    let list = [...(users || [])];
    const q = searchQuery.trim().toLowerCase();

    if (selectedRoleFilter !== 'All') {
      if (selectedRoleFilter === 'AdminGroup') {
        list = list.filter((u) => u.Role === 'Admin' || u.Role === 'Manager');
      } else if (selectedRoleFilter === 'StaffGroup') {
        list = list.filter((u) => u.Role === 'Cashier' || u.Role === 'Salesman' || u.Role === 'Staff');
      } else {
        list = list.filter((u) => u.Role === selectedRoleFilter);
      }
    }

    if (q) {
      list = list.filter((user) => {
        return (
          (user.FullName && user.FullName.toLowerCase().includes(q)) ||
          (user.Phone && user.Phone.toLowerCase().includes(q)) ||
          (user.Email && user.Email.toLowerCase().includes(q)) ||
          (user.UserID && user.UserID.toLowerCase().includes(q)) ||
          (user.Address && user.Address.toLowerCase().includes(q)) ||
          (user.NID && user.NID.toLowerCase().includes(q))
        );
      });
    }

    if (sortBy === 'name-asc') {
      list.sort((a, b) => String(a.FullName || '').localeCompare(String(b.FullName || '')));
    } else if (sortBy === 'newest') {
      list.sort((a, b) => new Date(b.CreatedAt || 0) - new Date(a.CreatedAt || 0));
    } else if (sortBy === 'role') {
      const order = { Admin: 1, Manager: 2, Cashier: 3, Salesman: 4, Customer: 5 };
      list.sort((a, b) => (order[a.Role] || 6) - (order[b.Role] || 6));
    }

    return list;
  }, [users, searchQuery, selectedRoleFilter, sortBy]);

  // স্টাফ পারফরম্যান্স হিসাব ফাংশন
  const getStaffSalesMetrics = (user) => {
    if (!user) return { totalSales: 0, orderCount: 0, commissionEarned: 0, aov: 0 };
    const uName = String(user.FullName || '').trim().toLowerCase();
    const uId = String(user.UserID || '').trim().toLowerCase();

    const staffOrders = salesHistory.filter(s => {
      const createdBy = String(s.CreatedBy || s.createdBy || '').trim().toLowerCase();
      const userId = String(s.UserID || s.userId || '').trim().toLowerCase();
      return (createdBy && createdBy === uName) || (userId && userId === uId);
    });

    const totalSales = staffOrders.reduce((sum, o) => sum + (Number(o.Total || o.GrandTotal || o.total) || 0), 0);
    const orderCount = staffOrders.length;
    const aov = orderCount > 0 ? Math.round(totalSales / orderCount) : 0;
    const commRate = Number(user.CommissionRate) || 0;
    const commissionEarned = commRate > 0 ? Math.round((totalSales * commRate) / 100) : 0;

    return { totalSales, orderCount, commissionEarned, aov, staffOrders };
  };

  // স্টাফ বেতন ও অগ্রিম হিসাব
  const getStaffSalaryMetrics = (user) => {
    if (!user) return { baseSalary: 0, paidThisMonth: 0, balanceDue: 0 };
    const uName = String(user.FullName || '').trim().toLowerCase();
    const uId = String(user.UserID || '').trim().toLowerCase();
    const baseSalary = Number(user.BaseSalary) || 0;
    const currentMonthStr = new Date().toISOString().slice(0, 7);

    const salaryExpenses = expenses.filter(exp => {
      const cat = String(exp.Category || '');
      const payee = String(exp.Payee || '').trim().toLowerCase();
      const desc = String(exp.Description || '').trim().toLowerCase();
      const dateStr = String(exp.Date || exp.date || '');

      const isMatchingStaff = (payee && (payee === uName || payee === uId)) || (desc && desc.includes(uName));
      return isMatchingStaff && dateStr.startsWith(currentMonthStr);
    });

    const paidThisMonth = salaryExpenses.reduce((sum, e) => sum + (Number(e.Amount) || 0), 0);
    const balanceDue = Math.max(0, baseSalary - paidThisMonth);

    return { baseSalary, paidThisMonth, balanceDue, salaryExpenses };
  };

  // ছবি হ্যান্ডলার
  const handleAvatarFileChange = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setFormError('অনুগ্রহ করে একটি বৈধ ইমেজ ফাইল নির্বাচন করুন (JPG, PNG, WebP)।');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setFormError('ছবির আকার সর্বোচ্চ ৫ মেগাবাইট হতে পারবে।');
      return;
    }

    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const dataUrl = uploadEvent.target.result;
      setAvatarPreview(dataUrl);

      const parts = String(dataUrl).split(',');
      const meta = parts[0];
      const base64Data = parts[1] || '';
      const mimeMatch = meta.match(/:(.*?);/);
      const mime = mimeMatch ? mimeMatch[1] : file.type || 'image/jpeg';

      setAvatarBase64(base64Data);
      setAvatarMimeType(mime);
      setFormData((prev) => ({ ...prev, AvatarUrl: dataUrl }));
      setFormError('');
    };
    reader.readAsDataURL(file);
  };

  const handleGeneratePin = () => {
    const randomPin = Math.floor(1000 + Math.random() * 9000).toString();
    setFormData((prev) => ({ ...prev, PIN: randomPin }));
  };

  const handleCopyText = (text, id) => {
    if (!text) return;
    try {
      navigator.clipboard?.writeText?.(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (e) {
      // Fallback
    }
  };

  // নতুন ইউজার ফর্ম ওপেন
  const handleOpenNewUserForm = () => {
    setEditingUserId(null);
    setAvatarPreview('');
    setAvatarBase64('');
    setAvatarMimeType('');
    if (fileInputRef.current) fileInputRef.current.value = '';
    setFormData({
      FullName: '',
      Phone: '',
      Email: '',
      Role: 'Salesman',
      PIN: '1234',
      Address: '',
      AvatarUrl: '',
      Status: 'Active',
      BaseSalary: '',
      CommissionRate: '',
      NID: '',
      EmergencyContact: '',
      EmergencyPhone: '',
      BloodGroup: '',
      Permissions: ['canGiveDiscount']
    });
    setFormActiveTab('basic');
    setFormError('');
    setFormSuccess('');
    setIsFormOpen(true);
  };

  // এডিট ইউজার ফর্ম ওপেন
  const handleOpenEditUserForm = (user) => {
    setEditingUserId(user.UserID);
    const av = user.AvatarUrl || user.avatarUrl || '';
    setAvatarPreview(av);
    setAvatarBase64('');
    setAvatarMimeType('');
    if (fileInputRef.current) fileInputRef.current.value = '';

    const roleDef = ROLES.find(r => r.id === user.Role);
    const perms = Array.isArray(user.Permissions) ? user.Permissions : (roleDef ? roleDef.defaultPermissions : []);

    setFormData({
      FullName: user.FullName || '',
      Phone: user.Phone || '',
      Email: user.Email || '',
      Role: user.Role || 'Customer',
      PIN: user.PIN || '',
      Address: user.Address || '',
      AvatarUrl: av,
      Status: user.Status || 'Active',
      BaseSalary: user.BaseSalary !== undefined ? String(user.BaseSalary) : '',
      CommissionRate: user.CommissionRate !== undefined ? String(user.CommissionRate) : '',
      NID: user.NID || '',
      EmergencyContact: user.EmergencyContact || '',
      EmergencyPhone: user.EmergencyPhone || '',
      BloodGroup: user.BloodGroup || '',
      Permissions: perms
    });
    setFormActiveTab('basic');
    setFormError('');
    setFormSuccess('');
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingUserId(null);
    setAvatarPreview('');
    setAvatarBase64('');
    setAvatarMimeType('');
    setFormError('');
    setFormSuccess('');
  };

  // পারমিশন টগল হ্যান্ডলার
  const handleTogglePermission = (permId) => {
    setFormData(prev => {
      const cur = Array.isArray(prev.Permissions) ? [...prev.Permissions] : [];
      if (cur.includes(permId)) {
        return { ...prev, Permissions: cur.filter(p => p !== permId) };
      } else {
        return { ...prev, Permissions: [...cur, permId] };
      }
    });
  };

  // ফর্ম সাবমিশন
  const handleSubmitForm = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    if (!formData.FullName.trim()) {
      setFormError('ব্যবহারকারীর পুরো নাম প্রদান করুন।');
      return;
    }
    if (!formData.Phone.trim() && !formData.Email.trim()) {
      setFormError('মোবাইল নম্বর অথবা ইমেইল যেকোনো একটি প্রদান করা আবশ্যক।');
      return;
    }
    if (!formData.PIN.trim() || formData.PIN.trim().length < 4) {
      setFormError('কমপক্ষে ৪ ডিজিটের পিন কোড বা পাসওয়ার্ড দিন।');
      return;
    }

    setIsSubmitting(true);
    try {
      const userPayload = {
        ...formData,
        BaseSalary: Number(formData.BaseSalary) || 0,
        CommissionRate: Number(formData.CommissionRate) || 0,
        AvatarUrl: formData.AvatarUrl || avatarPreview,
        avatarUrl: formData.AvatarUrl || avatarPreview,
        imageBase64: avatarBase64,
        imageMimeType: avatarMimeType,
      };

      if (editingUserId) {
        if (onUpdateUser) {
          await onUpdateUser({
            UserID: editingUserId,
            ...userPayload,
          });
        }
        setFormSuccess('ব্যবহারকারীর তথ্য সফলভাবে আপডেট হয়েছে!');
      } else {
        if (onAddUser) {
          await onAddUser(userPayload);
        }
        setFormSuccess('নতুন ব্যবহারকারী সফলভাবে তৈরি হয়েছে!');
      }
      setTimeout(() => {
        handleCloseForm();
      }, 700);
    } catch (err) {
      setFormError(err.message || 'ইউজার সংরক্ষণ করতে ব্যর্থ হয়েছে।');
    } finally {
      setIsSubmitting(false);
    }
  };

  // হাজিরা ক্লক-ইন / ক্লক-আউট হ্যান্ডলার
  const handleStaffClockIn = (user) => {
    clockInStaffLocally(user.UserID, user.FullName, 'স্বয়ংক্রিয় শিফট শুরু');
    refreshAttendance();
  };

  const handleStaffClockOut = (user) => {
    clockOutStaffLocally(user.UserID, 'শিফট সমাপ্ত');
    refreshAttendance();
  };

  if (!isOpen && !embedded) return null;

  return (
    <div
      className={
        embedded
          ? "w-full flex-1 flex flex-col min-h-0 bg-transparent animate-in fade-in duration-200"
          : "fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 z-[100] animate-fadeIn"
      }
      style={embedded ? {} : { zIndex: 100 }}
    >
      <div
        className={
          embedded
            ? "bg-white w-full flex-1 min-h-[calc(100vh-6.5rem)] rounded-2xl shadow-sm flex flex-col overflow-hidden border border-slate-200"
            : "bg-white w-full max-w-6xl rounded-2xl shadow-2xl flex flex-col max-h-[94vh] overflow-hidden border border-slate-100"
        }
      >
        {/* =========================================================================
            ১. এক্সিকিউটিভ হেডার
            ========================================================================= */}
        <div className="bg-slate-900 text-white px-5 sm:px-6 py-4 flex items-center justify-between border-b border-slate-800 shrink-0 shadow-md">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-700 to-violet-800 flex items-center justify-center shadow-sm">
              <Users className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white">
                  ইউজার ও স্টাফ ম্যানেজমেন্ট সুইট
                </h2>
                <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  রোল ও পারমিশন কন্ট্রোল
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                দোকানের কর্মী একাউন্ট, পারফরম্যান্স, কমিশন, বেতন লেজার ও ডিজিটাল হাজিরা ব্যবস্থাপনা
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {!isFormOpen && (
              <>
                {onRefreshUsers && (
                  <button
                    onClick={onRefreshUsers}
                    disabled={isLoading}
                    className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer shadow-xs disabled:opacity-50"
                    title="গুগল শিট থেকে রিফ্রেশ করুন"
                  >
                    <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-indigo-400' : ''}`} />
                  </button>
                )}
                <button
                  onClick={handleOpenNewUserForm}
                  className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-xs font-bold transition-all shadow-sm cursor-pointer"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>নতুন স্টাফ</span>
                </button>
              </>
            )}

            <button
              onClick={onClose}
              className={`transition-all cursor-pointer flex items-center justify-center ${
                embedded
                  ? 'px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700'
                  : 'w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white'
              }`}
              title={embedded ? "ক্যাটালগে ফিরে যান" : "বন্ধ করুন"}
            >
              {embedded ? (
                <>
                  <span className="text-sm font-bold mr-1">←</span>
                  <span>ক্যাটালগ</span>
                </>
              ) : (
                <X className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>

        {/* =========================================================================
            ২. এক্সিকিউটিভ KPI স্ট্রিপ
            ========================================================================= */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-2.5 p-3.5 bg-slate-50 border-b border-slate-200 shrink-0">
          
          <div
            onClick={() => setSelectedRoleFilter('All')}
            className={`p-3 rounded-xl border transition-all cursor-pointer shadow-xs ${
              selectedRoleFilter === 'All' ? 'bg-white border-indigo-500 ring-2 ring-indigo-500/20' : 'bg-white border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
              <span>মোট ব্যবহারকারী</span>
              <Users className="w-3.5 h-3.5 text-slate-400" />
            </div>
            <p className="text-lg font-bold text-slate-900 mt-0.5">{metrics.total} জন</p>
            <p className="text-[10px] text-emerald-600 font-medium mt-0.5">{metrics.active} সক্রিয় একাউন্ট</p>
          </div>

          <div
            onClick={() => setSelectedRoleFilter('AdminGroup')}
            className={`p-3 rounded-xl border transition-all cursor-pointer shadow-xs ${
              selectedRoleFilter === 'AdminGroup' ? 'bg-white border-indigo-500 ring-2 ring-indigo-500/20' : 'bg-white border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
              <span>এডমিন ও ম্যানেজার</span>
              <Crown className="w-3.5 h-3.5 text-indigo-500" />
            </div>
            <p className="text-lg font-bold text-indigo-700 mt-0.5">{metrics.admins} জন</p>
            <p className="text-[10px] text-slate-500 mt-0.5">পূর্ণ ব্যবস্থাপনা权限</p>
          </div>

          <div
            onClick={() => setSelectedRoleFilter('StaffGroup')}
            className={`p-3 rounded-xl border transition-all cursor-pointer shadow-xs ${
              selectedRoleFilter === 'StaffGroup' ? 'bg-white border-indigo-500 ring-2 ring-indigo-500/20' : 'bg-white border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
              <span>ক্যাশিয়ার ও সেলসম্যান</span>
              <Briefcase className="w-3.5 h-3.5 text-amber-500" />
            </div>
            <p className="text-lg font-bold text-amber-700 mt-0.5">{metrics.staff} জন</p>
            <p className="text-[10px] text-slate-500 mt-0.5">কাউন্টার ও সেলস টিম</p>
          </div>

          <div
            onClick={() => setSelectedRoleFilter('Customer')}
            className={`p-3 rounded-xl border transition-all cursor-pointer shadow-xs ${
              selectedRoleFilter === 'Customer' ? 'bg-white border-indigo-500 ring-2 ring-indigo-500/20' : 'bg-white border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
              <span>অনলাইন কাস্টমার</span>
              <ShoppingBag className="w-3.5 h-3.5 text-emerald-500" />
            </div>
            <p className="text-lg font-bold text-emerald-700 mt-0.5">{metrics.customers} জন</p>
            <p className="text-[10px] text-slate-500 mt-0.5">অনলাইন সেলফ-অর্ডার</p>
          </div>

          <div
            onClick={() => setActiveMainTab('attendance')}
            className={`hidden lg:block p-3 rounded-xl border transition-all cursor-pointer shadow-xs ${
              activeMainTab === 'attendance' ? 'bg-white border-indigo-500 ring-2 ring-indigo-500/20' : 'bg-white border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
              <span>আজকের ডিজিটাল হাজিরা</span>
              <Clock className="w-3.5 h-3.5 text-blue-500" />
            </div>
            <p className="text-lg font-bold text-blue-700 mt-0.5">{metrics.todayPresentCount} জন উপস্থিত</p>
            <p className="text-[10px] text-slate-500 mt-0.5">শিফট ক্লক-ইন রেকর্ড</p>
          </div>

        </div>

        {/* =========================================================================
            ৩. মেইন ভিউ নেভিগেশন ট্যাব
            ========================================================================= */}
        <div className="flex items-center justify-between border-b border-slate-200 px-5 sm:px-6 bg-white shrink-0">
          <div className="flex space-x-2">
            <button
              onClick={() => {
                setActiveMainTab('users');
                if (isFormOpen) handleCloseForm();
              }}
              className={`py-3 px-4 font-bold text-xs sm:text-sm transition-all border-b-2 flex items-center space-x-2 cursor-pointer ${
                activeMainTab === 'users' && !isFormOpen
                  ? 'border-indigo-600 text-indigo-700'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>স্টাফ ও ইউজার তালিকা ({filteredUsers.length})</span>
            </button>
            <button
              onClick={() => {
                setActiveMainTab('attendance');
                if (isFormOpen) handleCloseForm();
              }}
              className={`py-3 px-4 font-bold text-xs sm:text-sm transition-all border-b-2 flex items-center space-x-2 cursor-pointer ${
                activeMainTab === 'attendance' && !isFormOpen
                  ? 'border-indigo-600 text-indigo-700'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Clock className="w-4 h-4" />
              <span>ডিজিটাল হাজিরা খাতা ({metrics.todayPresentCount}/{metrics.staff + metrics.admins})</span>
            </button>
          </div>

          {isFormOpen && (
            <span className="text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-3 py-1 rounded-full">
              {editingUserId ? `সম্পাদনা মোড (#${editingUserId})` : 'নতুন ব্যবহারকারী এন্ট্রি'}
            </span>
          )}
        </div>

        {/* =========================================================================
            ৪. বডি কন্টেন্ট (লিস্ট মোড বনাম ফর্ম মোড)
            ========================================================================= */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 bg-slate-50/70">
          
          {/* -----------------------------------------------------------------
              ফর্ম মোড: নতুন ইউজার তৈরি বা এডিট
              ----------------------------------------------------------------- */}
          {isFormOpen ? (
            <div className="max-w-4xl mx-auto bg-white rounded-2xl border border-slate-200 shadow-sm p-5 sm:p-7">
              
              <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                    <UserPlus className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      {editingUserId ? 'স্টাফ তথ্য ও পারমিশন সম্পাদনা' : 'নতুন স্টাফ / ইউজার একাউন্ট তৈরি'}
                    </h3>
                    <p className="text-xs text-slate-500">
                      মৌলিক তথ্য, বেতন-কমিশন, কেওয়াইসি এবং কাস্টম পারমিশন নির্ধারণ করুন
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleCloseForm}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  ফিরে যান
                </button>
              </div>

              {/* ফর্ম সাব-ট্যাবস */}
              <div className="flex flex-wrap gap-2 mb-5 p-1 bg-slate-100 rounded-xl text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setFormActiveTab('basic')}
                  className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                    formActiveTab === 'basic' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  ১. মৌলিক তথ্য ও রোল
                </button>
                <button
                  type="button"
                  onClick={() => setFormActiveTab('finance')}
                  className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                    formActiveTab === 'finance' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  ২. বেতন ও কমিশন
                </button>
                <button
                  type="button"
                  onClick={() => setFormActiveTab('kyc')}
                  className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                    formActiveTab === 'kyc' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  ৩. NID ও জরুরি যোগাযোগ
                </button>
                <button
                  type="button"
                  onClick={() => setFormActiveTab('permissions')}
                  className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                    formActiveTab === 'permissions' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  ৪. পারমিশন ম্যাট্রিক্স
                </button>
              </div>

              {formError && (
                <div className="p-3 rounded-xl mb-4 text-xs bg-rose-50 border border-rose-200 text-rose-800 flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}
              {formSuccess && (
                <div className="p-3 rounded-xl mb-4 text-xs bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{formSuccess}</span>
                </div>
              )}

              <form onSubmit={handleSubmitForm} className="space-y-4">
                
                {/* ট্যাব ১: মৌলিক তথ্য ও রোল */}
                {formActiveTab === 'basic' && (
                  <div className="space-y-4">
                    {/* রোল সিলেক্টর */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-2">
                        ব্যবহারকারীর ভূমিকা / পদবী (Role) নির্বাচন করুন *
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                        {ROLES.map((r) => {
                          const IconComp = r.icon;
                          const isSelected = formData.Role === r.id;
                          return (
                            <button
                              key={r.id}
                              type="button"
                              onClick={() => {
                                setFormData(prev => ({
                                  ...prev,
                                  Role: r.id,
                                  Permissions: r.defaultPermissions
                                }));
                              }}
                              className={`p-2.5 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                                isSelected
                                  ? 'border-indigo-600 bg-indigo-50/80 text-indigo-950 ring-2 ring-indigo-500/20 font-bold shadow-xs'
                                  : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                              }`}
                            >
                              <div className="flex items-center justify-between mb-1.5">
                                <IconComp className={`w-4 h-4 ${isSelected ? 'text-indigo-600' : 'text-slate-400'}`} />
                                <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold ${r.badgeColor}`}>
                                  {r.tag}
                                </span>
                              </div>
                              <span className="text-xs truncate font-bold">{r.name.split(' ')[0]}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          পুরো নাম (Full Name) *
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="যেমন: মোঃ রফিকুল ইসলাম"
                          value={formData.FullName}
                          onChange={(e) => setFormData(prev => ({ ...prev, FullName: e.target.value }))}
                          className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          মোবাইল নম্বর (Phone / Login ID) *
                        </label>
                        <input
                          type="tel"
                          placeholder="017XXXXXXXX"
                          value={formData.Phone}
                          onChange={(e) => setFormData(prev => ({ ...prev, Phone: e.target.value }))}
                          className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          ইমেইল এড্রেস (ঐচ্ছিক)
                        </label>
                        <input
                          type="email"
                          placeholder="staff@pabna.com"
                          value={formData.Email}
                          onChange={(e) => setFormData(prev => ({ ...prev, Email: e.target.value }))}
                          className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                        />
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-xs font-bold text-slate-700">
                            ৪ ডিজিটের পিন (Login PIN) *
                          </label>
                          <button
                            type="button"
                            onClick={handleGeneratePin}
                            className="text-[10px] text-indigo-600 hover:text-indigo-800 font-bold cursor-pointer"
                          >
                            র‍্যান্ডম পিন
                          </button>
                        </div>
                        <input
                          type="text"
                          required
                          maxLength={6}
                          placeholder="যেমন: 1234"
                          value={formData.PIN}
                          onChange={(e) => setFormData(prev => ({ ...prev, PIN: e.target.value }))}
                          className="w-full px-3 py-2 text-sm font-mono font-bold text-indigo-700 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          একাউন্ট স্ট্যাটাস (Status)
                        </label>
                        <select
                          value={formData.Status}
                          onChange={(e) => setFormData(prev => ({ ...prev, Status: e.target.value }))}
                          className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white"
                        >
                          <option value="Active">Active (সক্রিয়)</option>
                          <option value="Inactive">Inactive (নিষ্ক্রিয় / সাসপেন্ড)</option>
                        </select>
                      </div>
                    </div>

                    {/* ঠিকানা ও ছবি আপলোড */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          বর্তমান ঠিকানা (Address)
                        </label>
                        <textarea
                          rows={2}
                          placeholder="বাসা/গ্রাম, থানা, জেলা..."
                          value={formData.Address}
                          onChange={(e) => setFormData(prev => ({ ...prev, Address: e.target.value }))}
                          className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          প্রোফাইল ছবি (Profile Photo)
                        </label>
                        <div className="flex items-center space-x-3">
                          <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden shrink-0">
                            {avatarPreview ? (
                              <img src={formatImageUrl(avatarPreview)} alt="Avatar" className="w-full h-full object-cover" />
                            ) : (
                              <User className="w-6 h-6 text-slate-400" />
                            )}
                          </div>
                          <div className="flex-1">
                            <label className="px-3 py-1.5 rounded-xl border border-dashed border-slate-300 hover:border-indigo-400 bg-slate-50 text-slate-700 text-xs font-semibold flex items-center justify-center space-x-1.5 cursor-pointer">
                              <Upload className="w-3.5 h-3.5 text-slate-500" />
                              <span>{avatarPreview ? 'ছবি বদলান' : 'ছবি আপলোড (গুগল ড্রাইভ)'}</span>
                              <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                onChange={handleAvatarFileChange}
                                className="hidden"
                              />
                            </label>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* ট্যাব ২: বেতন ও কমিশন */}
                {formActiveTab === 'finance' && (
                  <div className="space-y-4">
                    <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-800 flex items-center space-x-2">
                      <Wallet className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>
                        বেতন ও কমিশন নির্ধারণ করলে এটি স্বয়ংক্রিয়ভাবে দোকানের খরচের খাতা এবং সেলস পারফরম্যান্সের সাথে সমন্বয় করবে।
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          মাসিক মূল বেতন (Monthly Base Salary in {currencySymbol})
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">
                            {currencySymbol}
                          </span>
                          <input
                            type="number"
                            min="0"
                            placeholder="যেমন: 15000"
                            value={formData.BaseSalary}
                            onChange={(e) => setFormData(prev => ({ ...prev, BaseSalary: e.target.value }))}
                            className="w-full pl-8 pr-3 py-2 text-sm font-bold text-slate-800 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                          />
                        </div>
                        <p className="text-[10px] text-slate-500 mt-1">
                          খরচের খাতায় "বেতন" বা "অগ্রিম" এন্ট্রি দিলে স্বয়ংক্রিয়ভাবে সমন্বিত হবে।
                        </p>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          বিক্রয় কমিশন হার (Sales Commission Rate %)
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold">
                            %
                          </span>
                          <input
                            type="number"
                            min="0"
                            max="50"
                            step="0.1"
                            placeholder="যেমন: 1.5"
                            value={formData.CommissionRate}
                            onChange={(e) => setFormData(prev => ({ ...prev, CommissionRate: e.target.value }))}
                            className="w-full pl-8 pr-3 py-2 text-sm font-bold text-indigo-700 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                          />
                        </div>
                        <p className="text-[10px] text-slate-500 mt-1">
                          এই স্টাফ যত টাকার পণ্য বিক্রি করবেন তার ওপর কমিশন হিসেব হবে।
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* ট্যাব ৩: KYC ও জরুরি যোগাযোগ */}
                {formActiveTab === 'kyc' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          জাতীয় পরিচয়পত্র / জন্ম নিবন্ধন (NID No)
                        </label>
                        <input
                          type="text"
                          placeholder="যেমন: 199XXXXXXXXXX"
                          value={formData.NID}
                          onChange={(e) => setFormData(prev => ({ ...prev, NID: e.target.value }))}
                          className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          রক্তের গ্রুপ (Blood Group)
                        </label>
                        <select
                          value={formData.BloodGroup}
                          onChange={(e) => setFormData(prev => ({ ...prev, BloodGroup: e.target.value }))}
                          className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white"
                        >
                          <option value="">নির্বাচন করুন</option>
                          <option value="A+">A+ (A Positive)</option>
                          <option value="A-">A- (A Negative)</option>
                          <option value="B+">B+ (B Positive)</option>
                          <option value="B-">B- (B Negative)</option>
                          <option value="O+">O+ (O Positive)</option>
                          <option value="O-">O- (O Negative)</option>
                          <option value="AB+">AB+ (AB Positive)</option>
                          <option value="AB-">AB- (AB Negative)</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          জরুরি যোগাযোগের ব্যক্তি ও সম্পর্ক
                        </label>
                        <input
                          type="text"
                          placeholder="যেমন: মোঃ করিম (বাবা / ভাই)"
                          value={formData.EmergencyContact}
                          onChange={(e) => setFormData(prev => ({ ...prev, EmergencyContact: e.target.value }))}
                          className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          জরুরি ফোন নম্বর (Emergency Phone)
                        </label>
                        <input
                          type="tel"
                          placeholder="018XXXXXXXX"
                          value={formData.EmergencyPhone}
                          onChange={(e) => setFormData(prev => ({ ...prev, EmergencyPhone: e.target.value }))}
                          className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* ট্যাব ৪: পারমিশন ম্যাট্রিক্স */}
                {formActiveTab === 'permissions' && (
                  <div className="space-y-3">
                    <p className="text-xs text-slate-500">
                      এই ব্যবহারকারীর জন্য নির্দিষ্ট ক্ষমতার চেকবক্সগুলো টিক দিন বা আনচেক করুন:
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {PERMISSION_DEFINITIONS.map(p => {
                        const isGranted = formData.Permissions.includes(p.id);
                        return (
                          <div
                            key={p.id}
                            onClick={() => handleTogglePermission(p.id)}
                            className={`p-3 rounded-xl border transition-all cursor-pointer flex items-start space-x-3 ${
                              isGranted
                                ? 'bg-indigo-50/70 border-indigo-300 text-indigo-950'
                                : 'bg-slate-50/50 border-slate-200 text-slate-600 hover:bg-slate-100'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isGranted}
                              onChange={() => {}}
                              className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                            />
                            <div>
                              <p className="text-xs font-bold">{p.label}</p>
                              <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">{p.desc}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* সাবমিট বাটন */}
                <div className="pt-4 flex items-center justify-end space-x-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={handleCloseForm}
                    className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    বাতিল
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md transition-all flex items-center space-x-2 cursor-pointer disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4" />
                    )}
                    <span>{editingUserId ? 'আপডেট সম্পন্ন করুন' : 'ব্যবহারকারী সংরক্ষণ করুন'}</span>
                  </button>
                </div>

              </form>
            </div>
          ) : activeMainTab === 'attendance' ? (
            /* -----------------------------------------------------------------
               ভিউ মোড ২: ডিজিটাল হাজিরা খাতা (Attendance Roster)
               ----------------------------------------------------------------- */
            <div className="space-y-4 max-w-5xl mx-auto">
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                    <Clock className="w-4 h-4 text-indigo-600" />
                    <span>আজকের শিফট ও ডিজিটাল উপস্থিতি ({new Date().toISOString().split('T')[0]})</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    স্টাফরা দোকানে প্রবেশের সময় "ক্লক-ইন" এবং প্রস্থানকালে "ক্লক-আউট" করতে পারবেন
                  </p>
                </div>
                <button
                  onClick={refreshAttendance}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl flex items-center space-x-1 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>হাজিরা রিফ্রেশ</span>
                </button>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-900 text-slate-300 font-semibold border-b border-slate-800">
                      <th className="py-3 px-4">স্টাফের নাম ও পদবী</th>
                      <th className="py-3 px-4">মোবাইল</th>
                      <th className="py-3 px-4">প্রবেশ সময় (Clock In)</th>
                      <th className="py-3 px-4">প্রস্থান সময় (Clock Out)</th>
                      <th className="py-3 px-4 text-center">আজকের স্ট্যাটাস</th>
                      <th className="py-3 px-4 text-right">অ্যাকশন</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {users
                      .filter(u => u.Role !== 'Customer')
                      .map(u => {
                        const todayStr = new Date().toISOString().split('T')[0];
                        const att = attendanceRecords.find(r => r.UserID === u.UserID && r.Date === todayStr);
                        const isPresent = Boolean(att && att.ClockIn);
                        const isClockedOut = Boolean(att && att.ClockOut);

                        return (
                          <tr key={u.UserID} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-3 px-4 flex items-center space-x-3">
                              <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 font-bold flex items-center justify-center overflow-hidden shrink-0">
                                {u.AvatarUrl ? (
                                  <img src={formatImageUrl(u.AvatarUrl)} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  u.FullName.slice(0, 1)
                                )}
                              </div>
                              <div>
                                <p className="font-bold text-slate-900">{u.FullName}</p>
                                <span className="text-[10px] text-slate-500 font-mono">#{u.UserID}</span>
                              </div>
                            </td>
                            <td className="py-3 px-4 font-mono text-slate-600">{u.Phone || 'N/A'}</td>
                            <td className="py-3 px-4 font-mono">
                              {att?.ClockIn ? (
                                <span className="text-emerald-700 font-bold">
                                  {new Date(att.ClockIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              ) : (
                                <span className="text-slate-400 italic">প্রবেশ করেনি</span>
                              )}
                            </td>
                            <td className="py-3 px-4 font-mono">
                              {att?.ClockOut ? (
                                <span className="text-amber-700 font-bold">
                                  {new Date(att.ClockOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              ) : (
                                <span className="text-slate-400 italic">—</span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-center">
                              {isPresent ? (
                                <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                  <CheckCircle2 className="w-3 h-3" />
                                  <span>উপস্থিত</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                                  <Clock className="w-3 h-3" />
                                  <span>অনুপস্থিত</span>
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-right space-x-1.5 whitespace-nowrap">
                              {!isPresent ? (
                                <button
                                  onClick={() => handleStaffClockIn(u)}
                                  className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] cursor-pointer shadow-xs"
                                >
                                  ক্লক-ইন
                                </button>
                              ) : !isClockedOut ? (
                                <button
                                  onClick={() => handleStaffClockOut(u)}
                                  className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-[11px] cursor-pointer shadow-xs"
                                >
                                  ক্লক-আউট
                                </button>
                              ) : (
                                <span className="text-[11px] text-slate-400 font-semibold">শিফট সম্পন্ন</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* -----------------------------------------------------------------
               ভিউ মোড ১: স্টাফ ও ইউজার তালিকা (Cards / Table)
               ----------------------------------------------------------------- */
            <div className="space-y-4">
              
              {/* সার্চ ও ফিল্টার বার */}
              <div className="bg-white p-3 sm:p-3.5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row gap-2.5 items-stretch md:items-center justify-between">
                
                {/* সার্চ বক্স */}
                <div className="relative flex-1 min-w-[220px]">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="নাম, মোবাইল, ইমেইল, ইউজার আইডি বা NID দিয়ে খুঁজুন..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 text-xs sm:text-sm rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-slate-50/50"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* রোল ও সর্ট কন্ট্রোল */}
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={selectedRoleFilter}
                    onChange={(e) => setSelectedRoleFilter(e.target.value)}
                    className="text-xs px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-700 font-semibold cursor-pointer"
                  >
                    <option value="All">সকল ভূমিকা (All)</option>
                    <option value="AdminGroup">এডমিন ও ম্যানেজার</option>
                    <option value="StaffGroup">ক্যাশিয়ার ও সেলস টিম</option>
                    <option value="Admin">Admin</option>
                    <option value="Manager">Manager</option>
                    <option value="Cashier">Cashier</option>
                    <option value="Salesman">Salesman</option>
                    <option value="Customer">Customer</option>
                  </select>

                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="text-xs px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-700 font-semibold cursor-pointer"
                  >
                    <option value="default">ডিফল্ট ক্রম</option>
                    <option value="name-asc">নাম (A-Z)</option>
                    <option value="newest">নতুন যোগ করা</option>
                    <option value="role">পদবীর স্তর</option>
                  </select>

                  <div className="flex items-center border border-slate-200 rounded-xl overflow-hidden bg-slate-50">
                    <button
                      onClick={() => setViewMode('grid')}
                      className={`p-1.5 transition-colors cursor-pointer ${
                        viewMode === 'grid' ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-slate-900'
                      }`}
                      title="গ্রিড কার্ড ভিউ"
                    >
                      <LayoutGrid className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setViewMode('table')}
                      className={`p-1.5 transition-colors cursor-pointer ${
                        viewMode === 'table' ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-slate-900'
                      }`}
                      title="টেবিল ভিউ"
                    >
                      <List className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

              </div>

              {/* ইউজার কার্ড গ্রিড ভিউ */}
              {viewMode === 'grid' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  {filteredUsers.map((user) => {
                    const roleDef = ROLES.find(r => r.id === user.Role) || ROLES[3];
                    const salesM = getStaffSalesMetrics(user);
                    const salaryM = getStaffSalaryMetrics(user);
                    const isRevealed = revealedPinId === user.UserID;
                    const isInactive = user.Status === 'Inactive';

                    return (
                      <div
                        key={user.UserID}
                        className={`bg-white rounded-2xl border p-4 shadow-xs hover:shadow-md transition-all flex flex-col justify-between ${
                          isInactive ? 'border-rose-200 bg-rose-50/20 opacity-80' : 'border-slate-200'
                        }`}
                      >
                        <div>
                          {/* কার্ড হেডার: ছবি, নাম, পদবী */}
                          <div className="flex items-start justify-between">
                            <div className="flex items-center space-x-3">
                              <div className={`w-12 h-12 rounded-xl bg-gradient-to-tr ${roleDef.avatarGradient} text-white font-bold text-lg flex items-center justify-center overflow-hidden shrink-0 shadow-xs border border-white`}>
                                {user.AvatarUrl ? (
                                  <img src={formatImageUrl(user.AvatarUrl)} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  user.FullName?.slice(0, 1) || 'U'
                                )}
                              </div>
                              <div>
                                <h4 className="font-bold text-slate-900 text-sm leading-tight flex items-center space-x-1.5">
                                  <span>{user.FullName}</span>
                                  {isInactive && (
                                    <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-rose-100 text-rose-700">
                                      নিষ্ক্রিয়
                                    </span>
                                  )}
                                </h4>
                                <div className="flex items-center space-x-1.5 mt-1">
                                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${roleDef.badgeColor}`}>
                                    {roleDef.name.split(' ')[0]}
                                  </span>
                                  <button
                                    onClick={() => handleCopyText(user.UserID, user.UserID)}
                                    className="font-mono text-[10px] text-slate-400 hover:text-indigo-600 flex items-center space-x-0.5 cursor-pointer"
                                    title="আইডি কপি করুন"
                                  >
                                    <span>#{user.UserID?.slice(-6)}</span>
                                    {copiedId === user.UserID ? <Check className="w-2.5 h-2.5 text-emerald-600" /> : <Copy className="w-2.5 h-2.5" />}
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* যোগাযোগ ও পিন */}
                          <div className="mt-3 pt-3 border-t border-slate-100 space-y-1 text-xs text-slate-600">
                            <div className="flex items-center justify-between">
                              <span className="text-slate-400 flex items-center space-x-1">
                                <Phone className="w-3 h-3" />
                                <span>মোবাইল:</span>
                              </span>
                              <span className="font-mono font-semibold text-slate-800">{user.Phone || 'N/A'}</span>
                            </div>

                            <div className="flex items-center justify-between">
                              <span className="text-slate-400 flex items-center space-x-1">
                                <KeyRound className="w-3 h-3" />
                                <span>লগইন পিন:</span>
                              </span>
                              <div className="flex items-center space-x-1 font-mono font-bold">
                                <span>{isRevealed ? user.PIN : '••••'}</span>
                                <button
                                  onClick={() => setRevealedPinId(isRevealed ? null : user.UserID)}
                                  className="text-slate-400 hover:text-slate-600 cursor-pointer ml-1"
                                >
                                  {isRevealed ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* ফাইন্যান্স ও সেলস মেট্রিক্স স্ট্রিপ (যদি কাস্টমার না হয়) */}
                          {user.Role !== 'Customer' && (
                            <div className="mt-3 p-2 rounded-xl bg-slate-50 border border-slate-200/80 grid grid-cols-2 gap-2 text-[11px]">
                              <div>
                                <span className="text-slate-400 block text-[10px]">মোট বিক্রি</span>
                                <span className="font-bold text-slate-900">
                                  {currencySymbol}{salesM.totalSales.toLocaleString('en-IN')}
                                </span>
                                {salesM.commissionEarned > 0 && (
                                  <span className="text-[9px] text-emerald-600 block">
                                    কমিশন: {currencySymbol}{salesM.commissionEarned.toLocaleString('en-IN')}
                                  </span>
                                )}
                              </div>
                              <div>
                                <span className="text-slate-400 block text-[10px]">মাসিক বেতন</span>
                                <span className="font-bold text-indigo-700">
                                  {salaryM.baseSalary > 0 ? `${currencySymbol}${salaryM.baseSalary.toLocaleString('en-IN')}` : 'নির্ধারিত নেই'}
                                </span>
                                {salaryM.baseSalary > 0 && (
                                  <span className="text-[9px] text-slate-500 block">
                                    বকেয়া: {currencySymbol}{salaryM.balanceDue.toLocaleString('en-IN')}
                                  </span>
                                )}
                              </div>
                            </div>
                          )}

                        </div>

                        {/* কার্ড ফুটার অ্যাকশন বাটনসমূহ */}
                        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
                          <div className="flex items-center space-x-1">
                            {/* আইডি কার্ড বাটন */}
                            <button
                              onClick={() => setSelectedStaffForIdCard(user)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer"
                              title="আইডি কার্ড প্রিন্ট করুন"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>

                            {/* বিস্তারিত প্রোফাইল ও লেজার */}
                            <button
                              onClick={() => setSelectedStaffForProfile(user)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer"
                              title="সম্পূর্ণ প্রোফাইল ও হিস্ট্রি"
                            >
                              <Activity className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <div className="flex items-center space-x-1">
                            {/* এডিট বাটন */}
                            <button
                              onClick={() => handleOpenEditUserForm(user)}
                              className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center space-x-1 cursor-pointer transition-colors"
                            >
                              <Edit2 className="w-3 h-3" />
                              <span>এডিট</span>
                            </button>

                            {/* ডিলিট বাটন */}
                            {user.Role !== 'Admin' && (
                              <button
                                onClick={() => {
                                  if (window.confirm(`আপনি কি নিশ্চিত যে '${user.FullName}' একাউন্টটি মুছে ফেলতে চান?`)) {
                                    if (onDeleteUser) onDeleteUser(user.UserID);
                                  }
                                }}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                title="একাউন্ট ডিলিট করুন"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>

                      </div>
                    );
                  })}
                </div>
              ) : (
                /* টেবিল ভিউ */
                <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-900 text-slate-300 font-semibold border-b border-slate-800">
                          <th className="py-3 px-3.5">স্টাফ ও ইউজার</th>
                          <th className="py-3 px-3.5">পদবী (Role)</th>
                          <th className="py-3 px-3.5">মোবাইল ও পিন</th>
                          <th className="py-3 px-3.5 text-right">মোট বিক্রি</th>
                          <th className="py-3 px-3.5 text-right">মূল বেতন</th>
                          <th className="py-3 px-3.5 text-center">স্ট্যাটাস</th>
                          <th className="py-3 px-3.5 text-center">অ্যাকশন</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredUsers.map((user) => {
                          const roleDef = ROLES.find(r => r.id === user.Role) || ROLES[3];
                          const salesM = getStaffSalesMetrics(user);
                          const salaryM = getStaffSalaryMetrics(user);
                          const isRevealed = revealedPinId === user.UserID;

                          return (
                            <tr key={user.UserID} className="hover:bg-slate-50/80 transition-colors">
                              <td className="py-3 px-3.5 flex items-center space-x-2.5">
                                <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center overflow-hidden shrink-0">
                                  {user.AvatarUrl ? (
                                    <img src={formatImageUrl(user.AvatarUrl)} alt="" className="w-full h-full object-cover" />
                                  ) : (
                                    user.FullName.slice(0, 1)
                                  )}
                                </div>
                                <div>
                                  <p className="font-bold text-slate-900">{user.FullName}</p>
                                  <p className="text-[10px] text-slate-400 font-mono">#{user.UserID}</p>
                                </div>
                              </td>

                              <td className="py-3 px-3.5 whitespace-nowrap">
                                <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${roleDef.badgeColor}`}>
                                  {roleDef.name.split(' ')[0]}
                                </span>
                              </td>

                              <td className="py-3 px-3.5 whitespace-nowrap font-mono">
                                <div>{user.Phone || 'N/A'}</div>
                                <div className="text-[10px] text-slate-400">
                                  পিন: {isRevealed ? user.PIN : '••••'}
                                </div>
                              </td>

                              <td className="py-3 px-3.5 text-right font-bold text-slate-900 whitespace-nowrap">
                                {currencySymbol}{salesM.totalSales.toLocaleString('en-IN')}
                              </td>

                              <td className="py-3 px-3.5 text-right font-semibold text-indigo-700 whitespace-nowrap">
                                {salaryM.baseSalary > 0 ? `${currencySymbol}${salaryM.baseSalary.toLocaleString('en-IN')}` : '—'}
                              </td>

                              <td className="py-3 px-3.5 text-center whitespace-nowrap">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  user.Status !== 'Inactive' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                                }`}>
                                  {user.Status !== 'Inactive' ? 'সক্রিয়' : 'নিষ্ক্রিয়'}
                                </span>
                              </td>

                              <td className="py-3 px-3.5 text-center whitespace-nowrap">
                                <div className="flex items-center justify-center space-x-1">
                                  <button
                                    onClick={() => setSelectedStaffForIdCard(user)}
                                    className="p-1 rounded text-slate-500 hover:text-indigo-600 cursor-pointer"
                                    title="আইডি কার্ড"
                                  >
                                    <Printer className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => setSelectedStaffForProfile(user)}
                                    className="p-1 rounded text-slate-500 hover:text-indigo-600 cursor-pointer"
                                    title="প্রোফাইল ও অডিট"
                                  >
                                    <Activity className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleOpenEditUserForm(user)}
                                    className="p-1 rounded text-slate-500 hover:text-amber-600 cursor-pointer"
                                    title="সম্পাদনা"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
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

        </div>

        {/* =========================================================================
            ৫. মোডাল ফুটার
            ========================================================================= */}
        <div className="bg-slate-50 px-5 sm:px-6 py-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <p className="flex items-center space-x-1.5">
            <Shield className="w-3.5 h-3.5 text-indigo-500" />
            <span>গুগল শিট `Users` ডাটাবেস এবং অফলাইন লোকাল স্টোরেজে সম্পূর্ণ এনক্রিপ্টেড ও সুরক্ষিত।</span>
          </p>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-xl font-semibold cursor-pointer shadow-2xs"
          >
            বন্ধ করুন
          </button>
        </div>

      </div>

      {/* =========================================================================
          ৬. ডিজিটাল স্টাফ আইডি কার্ড প্রিন্ট মোডাল (#printable-staff-id-card)
          ========================================================================= */}
      {selectedStaffForIdCard && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 z-[110] animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden border border-slate-200 flex flex-col">
            
            <div className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between border-b border-slate-800">
              <span className="font-bold text-xs sm:text-sm flex items-center space-x-1.5">
                <Printer className="w-4 h-4 text-indigo-400" />
                <span>স্টাফ আইডি কার্ড প্রিন্ট প্রিভিউ</span>
              </span>
              <button
                onClick={() => setSelectedStaffForIdCard(null)}
                className="w-7 h-7 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* আইডি কার্ড ভিউ */}
            <div className="p-5 flex items-center justify-center bg-slate-100">
              <div
                id="printable-staff-id-card"
                className="w-[280px] bg-white rounded-2xl border-2 border-slate-300 p-4 shadow-md text-center flex flex-col items-center justify-between font-sans relative overflow-hidden"
              >
                {/* টপ ব্যানার */}
                <div className="w-full bg-slate-900 text-white py-2 px-3 rounded-xl mb-3">
                  <h4 className="font-black text-xs uppercase tracking-wider">{storeName}</h4>
                  <p className="text-[9px] text-slate-300">{storePhone}</p>
                </div>

                {/* ছবি */}
                <div className="w-20 h-20 rounded-full border-2 border-indigo-600 p-0.5 mb-2 shadow-xs overflow-hidden bg-slate-50 flex items-center justify-center">
                  {selectedStaffForIdCard.AvatarUrl ? (
                    <img src={formatImageUrl(selectedStaffForIdCard.AvatarUrl)} alt="" className="w-full h-full rounded-full object-cover" />
                  ) : (
                    <User className="w-10 h-10 text-indigo-400" />
                  )}
                </div>

                {/* নাম ও পদবী */}
                <h3 className="font-black text-sm text-slate-900 leading-tight">
                  {selectedStaffForIdCard.FullName}
                </h3>
                <span className="inline-block mt-1 px-3 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-200 uppercase tracking-wide">
                  {selectedStaffForIdCard.Role}
                </span>

                {/* তথ্য তালিকা */}
                <div className="w-full mt-3 py-2 border-y border-dashed border-slate-200 text-[11px] text-slate-700 space-y-1 text-left font-mono">
                  <div className="flex justify-between">
                    <span className="text-slate-400">আইডি নং:</span>
                    <span className="font-bold">{selectedStaffForIdCard.UserID}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">মোবাইল:</span>
                    <span>{selectedStaffForIdCard.Phone || 'N/A'}</span>
                  </div>
                  {selectedStaffForIdCard.BloodGroup && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">রক্তের গ্রুপ:</span>
                      <span className="font-bold text-rose-600">{selectedStaffForIdCard.BloodGroup}</span>
                    </div>
                  )}
                  {selectedStaffForIdCard.EmergencyPhone && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">জরুরি ফোন:</span>
                      <span>{selectedStaffForIdCard.EmergencyPhone}</span>
                    </div>
                  )}
                </div>

                {/* সিমুলেটেড বারকোড */}
                <div className="w-full mt-3 flex flex-col items-center">
                  <div className="font-mono text-[9px] tracking-widest text-slate-400">
                    ||||| | |||| ||| ||||| |||| ||||
                  </div>
                  <span className="text-[9px] text-slate-400 font-mono mt-0.5">
                    {selectedStaffForIdCard.UserID}
                  </span>
                </div>

              </div>
            </div>

            {/* অ্যাকশন বাটন */}
            <div className="p-3 bg-white border-t border-slate-200 flex justify-end space-x-2">
              <button
                onClick={() => setSelectedStaffForIdCard(null)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                বন্ধ করুন
              </button>
              <button
                onClick={() => window.print()}
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center space-x-1.5 cursor-pointer shadow-sm"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>প্রিন্ট করুন</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* =========================================================================
          ৭. স্টাফ বিস্তারিত প্রোফাইল, পারফরম্যান্স ও লেজার মোডাল
          ========================================================================= */}
      {selectedStaffForProfile && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 z-[110] animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-200 flex flex-col max-h-[90vh]">
            
            <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center font-bold text-white">
                  {selectedStaffForProfile.FullName.slice(0, 1)}
                </div>
                <div>
                  <h3 className="font-bold text-sm sm:text-base leading-tight">
                    {selectedStaffForProfile.FullName} — সম্পূর্ণ খতিয়ান ও হিস্ট্রি
                  </h3>
                  <p className="text-xs text-slate-400">
                    পদবী: {selectedStaffForProfile.Role} • আইডি: #{selectedStaffForProfile.UserID}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedStaffForProfile(null)}
                className="w-7 h-7 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 bg-slate-50">
              
              {/* সেলস ও কমিশন কার্ড */}
              {selectedStaffForProfile.Role !== 'Customer' && (
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                  <h4 className="text-xs font-bold text-slate-800 flex items-center space-x-1.5 mb-2.5">
                    <TrendingUp className="w-4 h-4 text-indigo-600" />
                    <span>বিক্রয় পারফরম্যান্স ও অর্জিত কমিশন</span>
                  </h4>
                  {(() => {
                    const sm = getStaffSalesMetrics(selectedStaffForProfile);
                    return (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                        <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                          <span className="text-slate-400 block text-[10px]">সর্বমোট বিক্রয়</span>
                          <span className="font-bold text-slate-900 text-sm">
                            {currencySymbol}{sm.totalSales.toLocaleString('en-IN')}
                          </span>
                        </div>
                        <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                          <span className="text-slate-400 block text-[10px]">মোট ইনভয়েস</span>
                          <span className="font-bold text-indigo-700 text-sm">{sm.orderCount} টি</span>
                        </div>
                        <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                          <span className="text-slate-400 block text-[10px]">গড় বিল সাইজ (AOV)</span>
                          <span className="font-bold text-slate-800 text-sm">{currencySymbol}{sm.aov}</span>
                        </div>
                        <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-100">
                          <span className="text-emerald-700 block text-[10px]">অর্জিত কমিশন ({selectedStaffForProfile.CommissionRate || 0}%)</span>
                          <span className="font-bold text-emerald-800 text-sm">
                            {currencySymbol}{sm.commissionEarned.toLocaleString('en-IN')}
                          </span>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* বেতন ও অগ্রিম লেজার কার্ড */}
              {selectedStaffForProfile.Role !== 'Customer' && (
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                  <h4 className="text-xs font-bold text-slate-800 flex items-center space-x-1.5 mb-2.5">
                    <CreditCard className="w-4 h-4 text-amber-600" />
                    <span>চলতি মাসের বেতন ও অগ্রিম (Salary Ledger)</span>
                  </h4>
                  {(() => {
                    const sal = getStaffSalaryMetrics(selectedStaffForProfile);
                    return (
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                          <span className="text-slate-400 block text-[10px]">মাসিক নির্ধারিত বেতন</span>
                          <span className="font-bold text-slate-900">
                            {currencySymbol}{sal.baseSalary.toLocaleString('en-IN')}
                          </span>
                        </div>
                        <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-100">
                          <span className="text-amber-800 block text-[10px]">চলতি মাসে অগ্রিম/প্রদত্ত</span>
                          <span className="font-bold text-amber-900">
                            {currencySymbol}{sal.paidThisMonth.toLocaleString('en-IN')}
                          </span>
                        </div>
                        <div className="p-2.5 rounded-lg bg-indigo-50 border border-indigo-100">
                          <span className="text-indigo-800 block text-[10px]">অবশিষ্ট বকেয়া বেতন</span>
                          <span className="font-bold text-indigo-900">
                            {currencySymbol}{sal.balanceDue.toLocaleString('en-IN')}
                          </span>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* KYC ও জরুরি যোগাযোগ */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                <h4 className="text-xs font-bold text-slate-800 flex items-center space-x-1.5 mb-2">
                  <ShieldCheck className="w-4 h-4 text-blue-600" />
                  <span>কেওয়াইসি ও ব্যক্তিগত নিরাপত্তা তথ্য</span>
                </h4>
                <div className="grid grid-cols-2 gap-3 text-xs text-slate-700">
                  <div>
                    <span className="text-slate-400 block text-[10px]">জাতীয় পরিচয়পত্র (NID):</span>
                    <span className="font-mono font-semibold">{selectedStaffForProfile.NID || 'তথ্য প্রদান করা হয়নি'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">রক্তের গ্রুপ:</span>
                    <span className="font-bold text-rose-600">{selectedStaffForProfile.BloodGroup || 'জানা নেই'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">জরুরি কন্টাক্ট পারসন:</span>
                    <span>{selectedStaffForProfile.EmergencyContact || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">জরুরি ফোন নম্বর:</span>
                    <span className="font-mono">{selectedStaffForProfile.EmergencyPhone || 'N/A'}</span>
                  </div>
                </div>
              </div>

              {/* অডিট অ্যাক্টিভিটি হিস্ট্রি */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                <h4 className="text-xs font-bold text-slate-800 flex items-center space-x-1.5 mb-2">
                  <Activity className="w-4 h-4 text-slate-600" />
                  <span>সাম্প্রতিক কাজের অডিট হিস্ট্রি (Audit Log)</span>
                </h4>
                {(() => {
                  const uName = String(selectedStaffForProfile.FullName || '').trim().toLowerCase();
                  const uId = String(selectedStaffForProfile.UserID || '').trim().toLowerCase();
                  const logs = auditLogs.filter(l => {
                    const lName = String(l.userName || l.UserName || '').trim().toLowerCase();
                    const lId = String(l.userId || l.UserId || '').trim().toLowerCase();
                    return lName === uName || lId === uId;
                  }).slice(0, 5);

                  if (logs.length === 0) {
                    return (
                      <p className="text-xs text-slate-400 italic">এই স্টাফের কোনো সাম্প্রতিক অডিট লগ পাওয়া যায়নি।</p>
                    );
                  }

                  return (
                    <div className="space-y-2">
                      {logs.map((log, idx) => (
                        <div key={idx} className="p-2 rounded-lg bg-slate-50 border border-slate-100 text-xs flex items-center justify-between">
                          <div>
                            <span className="font-bold text-slate-800">{log.actionType || log.ActionType || 'ACTION'}</span>
                            <p className="text-[11px] text-slate-500">{log.description || log.Description || 'বিবরণ নেই'}</p>
                          </div>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {new Date(log.timestamp || log.Timestamp || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>

            </div>

            <div className="p-3 bg-white border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setSelectedStaffForProfile(null)}
                className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold cursor-pointer"
              >
                ঠিক আছে
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
