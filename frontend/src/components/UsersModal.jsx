import React, { useState, useMemo, useRef, useEffect } from 'react';
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
  PhoneCall,
  MessageSquare,
  ExternalLink,
  QrCode,
  DollarSign,
  Download,
  Share2,
  CheckSquare,
  Square,
  Filter,
  AlertTriangle,
  Edit3
} from 'lucide-react';
import {
  formatImageUrl,
  getLocalStaffAttendance,
  clockInStaffLocally,
  clockOutStaffLocally,
  syncAttendanceWithRemote,
  updateAttendanceLocally,
  applyAutoShiftCutoffLocally
} from '../services/storage';
import {
  postClockInStaff,
  postClockOutStaff,
  postBulkClockInStaff,
  fetchAttendance,
  postAdjustAttendance
} from '../services/api';

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
    defaultPermissions: ['canGiveDiscount', 'canManageExpenses']
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
    defaultPermissions: ['canGiveDiscount']
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

export const PERMISSION_DEFINITIONS = [
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
  // প্রধান ভিউ নেভিগেশন: 'staff' (দোকানের কর্মী) | 'customers' (অনলাইন কাস্টমার) | 'attendance' (হাজিরা) | 'payroll' (পে-রোল)
  const [activeMainTab, setActiveMainTab] = useState('staff');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState('All');
  const [selectedDutyFilter, setSelectedDutyFilter] = useState('all'); // 'all' | 'on_duty' | 'absent' | 'completed'
  const [sortBy, setSortBy] = useState('default');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'table'

  // তারিখ ভিত্তিক হাজিরা অনুসন্ধান
  const [selectedAttendanceDate, setSelectedAttendanceDate] = useState(() => new Date().toISOString().split('T')[0]);

  // নতুন/এডিট ফর্ম স্টেট
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState(null);
  const [formActiveTab, setFormActiveTab] = useState('basic'); // 'basic' | 'finance' | 'kyc' | 'permissions'

  // সাব-মোডালসমূহ (ID Card, Deep Profile, Payslip)
  const [selectedStaffForIdCard, setSelectedStaffForIdCard] = useState(null);
  const [selectedStaffForProfile, setSelectedStaffForProfile] = useState(null);
  const [selectedStaffForPayslip, setSelectedStaffForPayslip] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  const [revealedPinId, setRevealedPinId] = useState(null);
  const pinTimeoutRef = useRef(null);

  // হাজিরা স্টেট
  const [attendanceRecords, setAttendanceRecords] = useState(() => getLocalStaffAttendance());

  // হাজিরা সমন্বয় মডাল স্টেট (ভুলে ক্লক-আউট না করা বা ম্যানুয়াল সময় এডিট)
  const [adjustingAttendance, setAdjustingAttendance] = useState(null); // { user, record, date }
  const [adjustFormData, setAdjustFormData] = useState({
    clockInTime: '09:30',
    clockOutTime: '20:30',
    status: 'Completed',
    notes: ''
  });
  const [isAdjustingSubmitting, setIsAdjustingSubmitting] = useState(false);
  const [adjustSuccessMsg, setAdjustSuccessMsg] = useState('');

  // ফর্ম ফিল্ড স্টেট
  const [formData, setFormData] = useState({
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
    if (settings?.apiUrl && settings.apiUrl.trim()) {
      fetchAttendance(settings.apiUrl, selectedAttendanceDate).then(rem => {
        if (Array.isArray(rem) && rem.length > 0) {
          const synced = syncAttendanceWithRemote(rem);
          setAttendanceRecords(synced);
        }
      }).catch(e => console.warn('Attendance sync delayed:', e));
    }
  };

  useEffect(() => {
    if (activeMainTab === 'attendance' && settings?.apiUrl && settings.apiUrl.trim()) {
      fetchAttendance(settings.apiUrl, selectedAttendanceDate).then(rem => {
        if (Array.isArray(rem) && rem.length > 0) {
          const synced = syncAttendanceWithRemote(rem);
          setAttendanceRecords(synced);
        }
      }).catch(e => console.warn('Attendance sync delayed:', e));
    }
  }, [activeMainTab, selectedAttendanceDate, settings?.apiUrl]);

  // ক্লিনআপ পিন টাইমার
  useEffect(() => {
    return () => {
      if (pinTimeoutRef.current) clearTimeout(pinTimeoutRef.current);
    };
  }, []);

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
    const staffList = list.filter((u) => u.Role !== 'Customer');
    const staff = staffList.length;
    const customers = list.filter((u) => u.Role === 'Customer').length;
    const activeStaff = staffList.filter((u) => u.Status !== 'Inactive').length;
    const inactiveStaff = staff - activeStaff;

    const todayStr = new Date().toISOString().split('T')[0];
    const targetDate = selectedAttendanceDate || todayStr;
    const dateRecords = attendanceRecords.filter(r => r.Date === targetDate);
    
    // উপস্থিতি ও ডিউটি স্ট্যাটাস
    const todayPresentCount = dateRecords.filter(r => r.ClockIn).length;
    const currentlyOnDutyCount = dateRecords.filter(r => r.ClockIn && !r.ClockOut && r.Status !== 'AutoClosed').length;
    const todayAbsentCount = Math.max(0, activeStaff - todayPresentCount);

    // মোট নির্ধারিত মাসিক বেতন
    const totalMonthlySalary = staffList
      .filter(u => u.Status !== 'Inactive')
      .reduce((sum, u) => sum + (Number(u.BaseSalary) || 0), 0);

    return {
      total,
      adminOnly,
      managers,
      admins,
      cashiers,
      salesmen,
      staff,
      customers,
      activeStaff,
      inactiveStaff,
      todayPresentCount,
      currentlyOnDutyCount,
      todayAbsentCount,
      totalMonthlySalary
    };
  }, [users, attendanceRecords, selectedAttendanceDate]);

  // কর্মচারীর লাইভ ডিউটি স্ট্যাটাস জানার হেল্পার
  const getStaffDutyStatus = (user, dateStr = selectedAttendanceDate) => {
    if (!user || user.Role === 'Customer') return null;
    const att = attendanceRecords.find(
      r => String(r.UserID).trim() === String(user.UserID).trim() && r.Date === dateStr
    );
    if (!att || !att.ClockIn) {
      return {
        status: 'absent',
        label: 'আজ আসেননি',
        badge: 'bg-rose-50 text-rose-700 border-rose-200',
        dot: 'bg-rose-500'
      };
    }
    if (att.Status === 'AutoClosed') {
      return {
        status: 'completed',
        label: 'অটো-ক্লোজড',
        time: '৯ ঘণ্টা',
        badge: 'bg-purple-50 text-purple-800 border-purple-300 ring-1 ring-purple-400/30',
        dot: 'bg-purple-500'
      };
    }
    if (att.ClockIn && !att.ClockOut) {
      const todayStr = new Date().toISOString().split('T')[0];
      if (dateStr && dateStr < todayStr) {
        return {
          status: 'completed',
          label: 'অটো-ক্লোজড',
          time: '৯ ঘণ্টা',
          badge: 'bg-purple-50 text-purple-800 border-purple-300',
          dot: 'bg-purple-500'
        };
      }
      return {
        status: 'on_duty',
        label: 'ডিউটিতে আছেন',
        time: new Date(att.ClockIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        badge: 'bg-emerald-50 text-emerald-800 border-emerald-300 ring-1 ring-emerald-400/30',
        dot: 'bg-emerald-500 animate-pulse'
      };
    }
    return {
      status: 'completed',
      label: 'শিফট সম্পন্ন',
      time: new Date(att.ClockOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      badge: 'bg-amber-50 text-amber-800 border-amber-300',
      dot: 'bg-amber-500'
    };
  };

  // শিফট ডিউরেশন হিসাব (অটো-কাটঅফ গার্ড সহ)
  const getShiftDuration = (clockIn, clockOut, status, date) => {
    if (!clockIn) return '—';
    if (status === 'AutoClosed') {
      return '৯ ঘণ্টা (অটো)';
    }
    const start = new Date(clockIn).getTime();
    const todayStr = new Date().toISOString().split('T')[0];
    const isPastDate = date && date < todayStr;

    let end;
    if (clockOut) {
      end = new Date(clockOut).getTime();
    } else if (isPastDate) {
      // পূর্বের তারিখের অসমাপ্ত শিফট - সর্বোচ্চ ৯ ঘণ্টা
      end = start + 9 * 60 * 60 * 1000;
    } else {
      // আজকের রানিং শিফট: তবে ১৪ ঘণ্টার বেশি হলে ৯ ঘণ্টার অটো-কাটঅফ
      const diffSinceStart = Date.now() - start;
      if (diffSinceStart > 14 * 60 * 60 * 1000) {
        end = start + 9 * 60 * 60 * 1000;
      } else {
        end = Date.now();
      }
    }

    const diffMs = Math.max(0, end - start);
    const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    if (diffHrs === 0) return `${diffMins} মি.`;
    return `${diffHrs} ঘণ্টা ${diffMins} মি.`;
  };

  // লেট ক্লক-ইন ডিটেকশন (সকাল ৯:৩০ এর পর)
  const isLateClockIn = (clockIn) => {
    if (!clockIn) return false;
    const d = new Date(clockIn);
    const hour = d.getHours();
    const minute = d.getMinutes();
    return hour > 9 || (hour === 9 && minute > 30);
  };

  // ফিল্টারকৃত ইউজার তালিকা (স্টাফ বনাম কাস্টমার পৃথকীকরণ সহ)
  const filteredUsers = useMemo(() => {
    let list = [...(users || [])];
    const q = searchQuery.trim().toLowerCase();

    // মূল ট্যাবের ভিত্তিতে ফিল্টারিং
    if (activeMainTab === 'customers') {
      list = list.filter(u => u.Role === 'Customer');
    } else if (activeMainTab === 'staff' || activeMainTab === 'payroll') {
      list = list.filter(u => u.Role !== 'Customer');
    }

    // রোল ফিল্টার
    if (selectedRoleFilter !== 'All') {
      if (selectedRoleFilter === 'AdminGroup') {
        list = list.filter((u) => u.Role === 'Admin' || u.Role === 'Manager');
      } else if (selectedRoleFilter === 'StaffGroup') {
        list = list.filter((u) => u.Role === 'Cashier' || u.Role === 'Salesman' || u.Role === 'Staff');
      } else {
        list = list.filter((u) => u.Role === selectedRoleFilter);
      }
    }

    // ডিউটি ফিল্টার (যদি অন থাকে)
    if (selectedDutyFilter !== 'all' && activeMainTab === 'staff') {
      list = list.filter((u) => {
        const duty = getStaffDutyStatus(u);
        return duty?.status === selectedDutyFilter;
      });
    }

    // সার্চ কুয়েরি
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

    // সর্টিং
    if (sortBy === 'name-asc') {
      list.sort((a, b) => String(a.FullName || '').localeCompare(String(b.FullName || '')));
    } else if (sortBy === 'newest') {
      list.sort((a, b) => new Date(b.CreatedAt || 0) - new Date(a.CreatedAt || 0));
    } else if (sortBy === 'role') {
      const order = { Admin: 1, Manager: 2, Cashier: 3, Salesman: 4, Customer: 5 };
      list.sort((a, b) => (order[a.Role] || 6) - (order[b.Role] || 6));
    }

    return list;
  }, [users, searchQuery, selectedRoleFilter, selectedDutyFilter, sortBy, activeMainTab, attendanceRecords, selectedAttendanceDate]);

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

  // স্মার্ট পিন রিভিল ও অটো-হাইড
  const handleToggleRevealPin = (userId) => {
    if (revealedPinId === userId) {
      setRevealedPinId(null);
    } else {
      setRevealedPinId(userId);
      if (pinTimeoutRef.current) clearTimeout(pinTimeoutRef.current);
      pinTimeoutRef.current = setTimeout(() => {
        setRevealedPinId(null);
      }, 6000);
    }
  };

  // হোয়াটসঅ্যাপ ও কল হ্যান্ডলার
  const handleWhatsApp = (phone, name) => {
    if (!phone) return;
    const clean = String(phone).replace(/\D/g, '');
    const formatted = clean.startsWith('880') ? clean : (clean.startsWith('0') ? '88' + clean : '880' + clean);
    const text = encodeURIComponent(`আসসালামু আলাইকুম ${name}, ${storeName} থেকে যোগাযোগ করা হচ্ছে।`);
    window.open(`https://wa.me/${formatted}?text=${text}`, '_blank');
  };

  // পারমিশন প্রিসেট প্রয়োগ
  const applyPermissionPreset = (presetKey) => {
    if (presetKey === 'cashier') {
      setFormData(prev => ({
        ...prev,
        Permissions: ['canGiveDiscount', 'canManageExpenses']
      }));
    } else if (presetKey === 'salesman') {
      setFormData(prev => ({
        ...prev,
        Permissions: ['canGiveDiscount']
      }));
    } else if (presetKey === 'manager') {
      setFormData(prev => ({
        ...prev,
        Permissions: ['canGiveDiscount', 'canTransferStock', 'canManageExpenses', 'canViewReports']
      }));
    } else if (presetKey === 'all') {
      setFormData(prev => ({
        ...prev,
        Permissions: PERMISSION_DEFINITIONS.map(p => p.id)
      }));
    } else if (presetKey === 'clear') {
      setFormData(prev => ({
        ...prev,
        Permissions: []
      }));
    }
  };

  // নতুন ইউজার ফর্ম ওপেন
  const handleOpenNewUserForm = (defaultRole = 'Salesman') => {
    setEditingUserId(null);
    setAvatarPreview('');
    setAvatarBase64('');
    setAvatarMimeType('');
    if (fileInputRef.current) fileInputRef.current.value = '';
    
    const roleDef = ROLES.find(r => r.id === defaultRole) || ROLES[3];
    setFormData({
      FullName: '',
      Phone: '',
      Email: '',
      Role: defaultRole,
      PIN: '1234',
      Address: '',
      AvatarUrl: '',
      Status: 'Active',
      BaseSalary: '',
      CommissionRate: defaultRole === 'Salesman' ? '1.5' : '',
      NID: '',
      EmergencyContact: '',
      EmergencyPhone: '',
      BloodGroup: '',
      Permissions: roleDef.defaultPermissions || ['canGiveDiscount']
    });
    setFormActiveTab('basic');
    setFormError('');
    setFormSuccess('');
    setIsFormOpen(true);
  };

  // এডিট ইউজার ফর্ম ওপেন
  const handleOpenEditUserForm = (user) => {
    setEditingUserId(user.UserID || user.userId);
    const av = user.AvatarUrl || user.avatarUrl || '';
    setAvatarPreview(av);
    setAvatarBase64('');
    setAvatarMimeType('');
    if (fileInputRef.current) fileInputRef.current.value = '';

    const roleDef = ROLES.find(r => r.id === (user.Role || user.role));
    const perms = Array.isArray(user.Permissions) ? user.Permissions : (Array.isArray(user.permissions) ? user.permissions : (roleDef ? roleDef.defaultPermissions : []));

    setFormData({
      FullName: String(user.FullName || user.fullName || user.Name || user.name || ''),
      Phone: String(user.Phone !== undefined && user.Phone !== null ? user.Phone : (user.phone !== undefined && user.phone !== null ? user.phone : (user.Mobile || user.mobile || ''))),
      Email: String(user.Email || user.email || ''),
      Role: user.Role || user.role || 'Customer',
      PIN: String(user.PIN !== undefined && user.PIN !== null ? user.PIN : (user.pin !== undefined && user.pin !== null ? user.pin : '1234')),
      Address: String(user.Address || user.address || ''),
      AvatarUrl: av,
      Status: user.Status || user.status || 'Active',
      BaseSalary: user.BaseSalary !== undefined ? String(user.BaseSalary) : (user.baseSalary !== undefined ? String(user.baseSalary) : ''),
      CommissionRate: user.CommissionRate !== undefined ? String(user.CommissionRate) : (user.commissionRate !== undefined ? String(user.commissionRate) : ''),
      NID: String(user.NID || user.nid || ''),
      EmergencyContact: String(user.EmergencyContact || user.emergencyContact || ''),
      EmergencyPhone: String(user.EmergencyPhone || user.emergencyPhone || ''),
      BloodGroup: String(user.BloodGroup || user.bloodGroup || ''),
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
    if (e && e.preventDefault) e.preventDefault();
    setFormError('');
    setFormSuccess('');

    const cleanName = String(formData.FullName || '').trim();
    const cleanPhone = String(formData.Phone || '').trim();
    const cleanEmail = String(formData.Email || '').trim();
    const cleanPIN = String(formData.PIN || '').trim();

    if (!cleanName) {
      setFormActiveTab('basic');
      setFormError('ব্যবহারকারীর পুরো নাম প্রদান করুন।');
      return;
    }
    if (!cleanPhone && !cleanEmail) {
      setFormActiveTab('basic');
      setFormError('মোবাইল নম্বর অথবা ইমেইল যেকোনো একটি প্রদান করা আবশ্যক।');
      return;
    }
    if (!cleanPIN || cleanPIN.length < 4) {
      setFormActiveTab('basic');
      setFormError('কমপক্ষে ৪ ডিজিটের পিন কোড বা পাসওয়ার্ড দিন।');
      return;
    }

    setIsSubmitting(true);
    try {
      const userPayload = {
        ...formData,
        FullName: cleanName,
        Phone: cleanPhone,
        Email: cleanEmail,
        PIN: cleanPIN,
        BaseSalary: Number(formData.BaseSalary) || 0,
        CommissionRate: Number(formData.CommissionRate) || 0,
        AvatarUrl: formData.AvatarUrl || avatarPreview,
        avatarUrl: formData.AvatarUrl || avatarPreview,
        imageBase64: avatarBase64,
        imageMimeType: avatarMimeType,
        Permissions: Array.isArray(formData.Permissions) ? formData.Permissions : []
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
    const today = new Date().toISOString().split('T')[0];
    const nowIso = new Date().toISOString();
    clockInStaffLocally(user.UserID, user.FullName, 'স্বয়ংক্রিয় শিফট শুরু');
    refreshAttendance();

    if (settings?.apiUrl && settings.apiUrl.trim()) {
      postClockInStaff(settings.apiUrl, {
        userId: user.UserID,
        userName: user.FullName,
        date: today,
        clockIn: nowIso,
        notes: 'স্বয়ংক্রিয় শিফট শুরু'
      }).then(res => {
        if (res && res.success && res.data) {
          const synced = syncAttendanceWithRemote([res.data]);
          setAttendanceRecords(synced);
        }
      }).catch(err => console.warn('Clock-in cloud sync delayed:', err));
    }
  };

  const handleStaffClockOut = (user) => {
    const today = new Date().toISOString().split('T')[0];
    const nowIso = new Date().toISOString();
    clockOutStaffLocally(user.UserID, 'শিফট সমাপ্ত');
    refreshAttendance();

    if (settings?.apiUrl && settings.apiUrl.trim()) {
      postClockOutStaff(settings.apiUrl, {
        userId: user.UserID,
        date: today,
        clockOut: nowIso,
        notes: 'শিফট সমাপ্ত'
      }).then(res => {
        if (res && res.success && res.data) {
          const synced = syncAttendanceWithRemote([res.data]);
          setAttendanceRecords(synced);
        }
      }).catch(err => console.warn('Clock-out cloud sync delayed:', err));
    }
  };

  // বাল্ক ক্লক-ইন (আজকের সক্রিয় সকল স্টাফ)
  const handleBulkClockIn = () => {
    const today = new Date().toISOString().split('T')[0];
    const activeStaff = users.filter(u => u.Role !== 'Customer' && u.Status !== 'Inactive');
    const toClockIn = [];
    activeStaff.forEach(u => {
      const alreadyIn = attendanceRecords.some(
        r => String(r.UserID) === String(u.UserID) && r.Date === today && r.ClockIn
      );
      if (!alreadyIn) {
        clockInStaffLocally(u.UserID, u.FullName, 'বাল্ক ক্লক-ইন');
        toClockIn.push(u);
      }
    });
    refreshAttendance();

    if (settings?.apiUrl && settings.apiUrl.trim() && toClockIn.length > 0) {
      postBulkClockInStaff(settings.apiUrl, toClockIn, today).then(res => {
        if (res && res.success && Array.isArray(res.data)) {
          const synced = syncAttendanceWithRemote(res.data);
          setAttendanceRecords(synced);
        }
      }).catch(err => console.warn('Bulk clock-in cloud sync delayed:', err));
    }
  };

  // হাজিরা সমন্বয় মডাল ওপেন
  const handleOpenAdjustModal = (user, attRecord) => {
    const curDate = selectedAttendanceDate || new Date().toISOString().split('T')[0];

    let inTime = '09:30';
    if (attRecord?.ClockIn) {
      const d = new Date(attRecord.ClockIn);
      const h = String(d.getHours()).padStart(2, '0');
      const m = String(d.getMinutes()).padStart(2, '0');
      inTime = `${h}:${m}`;
    }

    let outTime = '20:30';
    if (attRecord?.ClockOut) {
      const d = new Date(attRecord.ClockOut);
      const h = String(d.getHours()).padStart(2, '0');
      const m = String(d.getMinutes()).padStart(2, '0');
      outTime = `${h}:${m}`;
    }

    setAdjustFormData({
      clockInTime: inTime,
      clockOutTime: outTime,
      status: attRecord?.Status || (attRecord?.ClockOut ? 'Completed' : 'Completed'),
      notes: attRecord?.Notes || ''
    });
    setAdjustSuccessMsg('');
    setAdjustingAttendance({
      user,
      record: attRecord,
      date: curDate
    });
  };

  const handleCloseAdjustModal = () => {
    setAdjustingAttendance(null);
    setAdjustSuccessMsg('');
    setIsAdjustingSubmitting(false);
  };

  // হাজিরা সমন্বয় সংরক্ষণ
  const handleSaveAttendanceAdjustment = async () => {
    if (!adjustingAttendance) return;
    const { user, record, date } = adjustingAttendance;
    setIsAdjustingSubmitting(true);
    setAdjustSuccessMsg('');

    try {
      let clockInIso = null;
      if (adjustFormData.clockInTime) {
        clockInIso = new Date(`${date}T${adjustFormData.clockInTime}:00`).toISOString();
      }

      let clockOutIso = null;
      if (adjustFormData.clockOutTime) {
        clockOutIso = new Date(`${date}T${adjustFormData.clockOutTime}:00`).toISOString();
      }

      let durationStr = '';
      if (clockInIso && clockOutIso) {
        const diffMs = Math.max(0, new Date(clockOutIso).getTime() - new Date(clockInIso).getTime());
        const hrs = Math.floor(diffMs / (1000 * 60 * 60));
        const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        durationStr = hrs > 0 ? `${hrs} ঘণ্টা ${mins} মি.` : `${mins} মি.`;
      } else if (adjustFormData.status === 'AutoClosed') {
        durationStr = '৯ ঘণ্টা (অটো)';
      }

      const noteText = adjustFormData.notes ? adjustFormData.notes.trim() : 'অ্যাডমিন কর্তৃক সমন্বয়কৃত';

      const payload = {
        attendanceId: record?.AttendanceID || record?.attendanceId || `ATT-${Date.now().toString().slice(-6)}`,
        userId: user.UserID,
        userName: user.FullName,
        date: date,
        clockIn: clockInIso,
        clockOut: clockOutIso,
        duration: durationStr,
        status: adjustFormData.status,
        notes: noteText
      };

      // ১. লোকাল আপডেট
      const updatedLocal = updateAttendanceLocally(payload);
      setAttendanceRecords(updatedLocal);

      // ২. গুগল শিট ক্লাউড আপডেট
      if (settings?.apiUrl && settings.apiUrl.trim()) {
        const res = await postAdjustAttendance(settings.apiUrl, payload);
        if (res && res.success && res.data) {
          const synced = syncAttendanceWithRemote([res.data]);
          setAttendanceRecords(synced);
        }
      }

      setAdjustSuccessMsg('হাজিরা ও কাজের সময় সফলভাবে সমন্বয় করা হয়েছে!');
      setTimeout(() => {
        handleCloseAdjustModal();
      }, 700);
    } catch (err) {
      console.error('Attendance adjustment error:', err);
    } finally {
      setIsAdjustingSubmitting(false);
    }
  };

  // এক ক্লিকে সকল অসমাপ্ত শিফট অটো-ক্লোজ ও কাট-অফ
  const handleAutoClosePendingShifts = () => {
    const updated = applyAutoShiftCutoffLocally(attendanceRecords);
    setAttendanceRecords(updated);
    if (settings?.apiUrl && settings.apiUrl.trim()) {
      fetchAttendance(settings.apiUrl, selectedAttendanceDate).then(rem => {
        if (Array.isArray(rem) && rem.length > 0) {
          const synced = syncAttendanceWithRemote(rem);
          setAttendanceRecords(synced);
        }
      }).catch(e => console.warn(e));
    }
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
        <div className="bg-slate-900 text-white px-5 sm:px-6 py-3.5 flex items-center justify-between border-b border-slate-800 shrink-0 shadow-md">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-700 to-violet-800 flex items-center justify-center shadow-sm">
              <Users className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base sm:text-lg font-bold tracking-tight text-white">
                  ইউজার ও স্টাফ ম্যানেজমেন্ট সুইট
                </h2>
                <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  রোল, পে-রোল ও স্মার্ট হাজিরা
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {storeName} • কর্মী তালিকা, ডিজিটাল হাজিরা, কমিশন লেজার ও অ্যাক্সেস কন্ট্রোল
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
                  onClick={() => handleOpenNewUserForm(activeMainTab === 'customers' ? 'Customer' : 'Salesman')}
                  className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-xs font-bold transition-all shadow-sm cursor-pointer"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>{activeMainTab === 'customers' ? 'নতুন গ্রাহক' : 'নতুন স্টাফ'}</span>
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
            ২. ইন্টারঅ্যাক্টিভ KPI ফিল্টার ড্যাশবোর্ড
            ========================================================================= */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 p-3 sm:p-3.5 bg-slate-50 border-b border-slate-200 shrink-0">
          
          {/* কার্ড ১: মোট সক্রিয় কর্মী */}
          <div
            onClick={() => {
              setActiveMainTab('staff');
              setSelectedRoleFilter('All');
              setSelectedDutyFilter('all');
            }}
            className={`p-3 rounded-xl border transition-all cursor-pointer shadow-xs ${
              activeMainTab === 'staff' && selectedDutyFilter === 'all' && selectedRoleFilter === 'All'
                ? 'bg-white border-indigo-500 ring-2 ring-indigo-500/20 shadow-sm'
                : 'bg-white border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
              <span>মোট কর্মী দল</span>
              <Users className="w-3.5 h-3.5 text-indigo-500" />
            </div>
            <p className="text-lg font-bold text-slate-900 mt-0.5">{metrics.staff} জন</p>
            <p className="text-[10px] text-emerald-600 font-medium mt-0.5">{metrics.activeStaff} সক্রিয় কর্মী</p>
          </div>

          {/* কার্ড ২: বর্তমানে ডিউটিতে আছেন */}
          <div
            onClick={() => {
              setActiveMainTab('staff');
              setSelectedDutyFilter('on_duty');
            }}
            className={`p-3 rounded-xl border transition-all cursor-pointer shadow-xs ${
              activeMainTab === 'staff' && selectedDutyFilter === 'on_duty'
                ? 'bg-emerald-50/70 border-emerald-500 ring-2 ring-emerald-500/20 shadow-sm'
                : 'bg-white border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
              <span className="flex items-center space-x-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>ডিউটিতে আছেন</span>
              </span>
              <Clock className="w-3.5 h-3.5 text-emerald-600" />
            </div>
            <p className="text-lg font-bold text-emerald-700 mt-0.5">{metrics.currentlyOnDutyCount} জন</p>
            <p className="text-[10px] text-slate-500 mt-0.5">দোকানে সক্রিয় রয়েছেন</p>
          </div>

          {/* কার্ড ৩: আজ অনুপস্থিত */}
          <div
            onClick={() => {
              setActiveMainTab('staff');
              setSelectedDutyFilter('absent');
            }}
            className={`p-3 rounded-xl border transition-all cursor-pointer shadow-xs ${
              activeMainTab === 'staff' && selectedDutyFilter === 'absent'
                ? 'bg-rose-50/70 border-rose-500 ring-2 ring-rose-500/20 shadow-sm'
                : 'bg-white border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
              <span>আজ আসেননি</span>
              <UserX className="w-3.5 h-3.5 text-rose-500" />
            </div>
            <p className="text-lg font-bold text-rose-700 mt-0.5">{metrics.todayAbsentCount} জন</p>
            <p className="text-[10px] text-slate-500 mt-0.5">অনুপস্থিত কর্মচারী</p>
          </div>

          {/* কার্ড ৪: অনলাইন গ্রাহক তালিকা */}
          <div
            onClick={() => {
              setActiveMainTab('customers');
              setSelectedRoleFilter('Customer');
            }}
            className={`p-3 rounded-xl border transition-all cursor-pointer shadow-xs ${
              activeMainTab === 'customers'
                ? 'bg-white border-indigo-500 ring-2 ring-indigo-500/20 shadow-sm'
                : 'bg-white border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
              <span>অনলাইন গ্রাহক</span>
              <ShoppingBag className="w-3.5 h-3.5 text-purple-500" />
            </div>
            <p className="text-lg font-bold text-purple-700 mt-0.5">{metrics.customers} জন</p>
            <p className="text-[10px] text-slate-500 mt-0.5">নিবন্ধিত কাস্টমার</p>
          </div>

          {/* কার্ড ৫: পে-রোল ও লেজার */}
          <div
            onClick={() => setActiveMainTab('payroll')}
            className={`col-span-2 sm:col-span-1 p-3 rounded-xl border transition-all cursor-pointer shadow-xs ${
              activeMainTab === 'payroll'
                ? 'bg-amber-50/70 border-amber-500 ring-2 ring-amber-500/20 shadow-sm'
                : 'bg-white border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
              <span>মাসিক পে-রোল</span>
              <Wallet className="w-3.5 h-3.5 text-amber-500" />
            </div>
            <p className="text-lg font-bold text-amber-800 mt-0.5">
              {currencySymbol}{metrics.totalMonthlySalary.toLocaleString('en-IN')}
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5">নির্ধারিত মূল বেতন</p>
          </div>

        </div>

        {/* =========================================================================
            ৩. প্রধান নেভিগেশন ট্যাব
            ========================================================================= */}
        <div className="flex items-center justify-between border-b border-slate-200 px-4 sm:px-6 bg-white shrink-0 overflow-x-auto">
          <div className="flex space-x-1 sm:space-x-2">
            
            {/* ট্যাব ১: স্টাফ ও সেলস টিম */}
            <button
              onClick={() => {
                setActiveMainTab('staff');
                setSelectedRoleFilter('All');
                setSelectedDutyFilter('all');
                if (isFormOpen) handleCloseForm();
              }}
              className={`py-3 px-3 sm:px-4 font-bold text-xs sm:text-sm transition-all border-b-2 flex items-center space-x-2 cursor-pointer whitespace-nowrap ${
                activeMainTab === 'staff' && !isFormOpen
                  ? 'border-indigo-600 text-indigo-700'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>স্টাফ ও সেলস টিম ({metrics.staff})</span>
            </button>

            {/* ট্যাব ২: ডিজিটাল হাজিরা খাতা */}
            <button
              onClick={() => {
                setActiveMainTab('attendance');
                if (isFormOpen) handleCloseForm();
              }}
              className={`py-3 px-3 sm:px-4 font-bold text-xs sm:text-sm transition-all border-b-2 flex items-center space-x-2 cursor-pointer whitespace-nowrap ${
                activeMainTab === 'attendance' && !isFormOpen
                  ? 'border-indigo-600 text-indigo-700'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Clock className="w-4 h-4" />
              <span>ডিজিটাল হাজিরা খাতা ({metrics.todayPresentCount}/{metrics.staff})</span>
            </button>

            {/* ট্যাব ৩: বেতন ও পে-রোল লেজার */}
            <button
              onClick={() => {
                setActiveMainTab('payroll');
                if (isFormOpen) handleCloseForm();
              }}
              className={`py-3 px-3 sm:px-4 font-bold text-xs sm:text-sm transition-all border-b-2 flex items-center space-x-2 cursor-pointer whitespace-nowrap ${
                activeMainTab === 'payroll' && !isFormOpen
                  ? 'border-indigo-600 text-indigo-700'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <CreditCard className="w-4 h-4" />
              <span>বেতন ও পে-রোল লেজার</span>
            </button>

            {/* ট্যাব ৪: অনলাইন গ্রাহক */}
            <button
              onClick={() => {
                setActiveMainTab('customers');
                setSelectedRoleFilter('Customer');
                if (isFormOpen) handleCloseForm();
              }}
              className={`py-3 px-3 sm:px-4 font-bold text-xs sm:text-sm transition-all border-b-2 flex items-center space-x-2 cursor-pointer whitespace-nowrap ${
                activeMainTab === 'customers' && !isFormOpen
                  ? 'border-indigo-600 text-indigo-700'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <ShoppingBag className="w-4 h-4" />
              <span>অনলাইন গ্রাহক ({metrics.customers})</span>
            </button>

          </div>

          {isFormOpen && (
            <span className="text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-3 py-1 rounded-full whitespace-nowrap ml-2">
              {editingUserId ? `সম্পাদনা মোড (#${editingUserId})` : 'নতুন ব্যবহারকারী এন্ট্রি'}
            </span>
          )}
        </div>

        {/* =========================================================================
            ৪. বডি কন্টেন্ট (ফর্ম মোড বনাম বিভিন্ন ভিউ মোড)
            ========================================================================= */}
        <div className="flex-1 overflow-y-auto p-3.5 sm:p-5 bg-slate-50/70">
          
          {/* -----------------------------------------------------------------
              ফর্ম মোড: নতুন ইউজার তৈরি বা এডিট
              ----------------------------------------------------------------- */}
          {isFormOpen ? (
            <div className="max-w-4xl mx-auto bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-7">
              
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

              {/* ফর্ম স্টেপ উইজার্ড ট্যাব */}
              <div className="flex flex-wrap gap-2 mb-5 p-1 bg-slate-100 rounded-xl text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setFormActiveTab('basic')}
                  className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer flex items-center space-x-1.5 ${
                    formActiveTab === 'basic' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <User className="w-3.5 h-3.5" />
                  <span>১. মৌলিক তথ্য ও রোল</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFormActiveTab('finance')}
                  className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer flex items-center space-x-1.5 ${
                    formActiveTab === 'finance' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Wallet className="w-3.5 h-3.5" />
                  <span>২. বেতন ও কমিশন</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFormActiveTab('kyc')}
                  className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer flex items-center space-x-1.5 ${
                    formActiveTab === 'kyc' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>৩. NID ও জরুরি যোগাযোগ</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFormActiveTab('permissions')}
                  className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer flex items-center space-x-1.5 ${
                    formActiveTab === 'permissions' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>৪. পারমিশন ম্যাট্রিক্স</span>
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

              <form onSubmit={handleSubmitForm} noValidate className="space-y-4">
                
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
                          placeholder="যেমন: মোঃ রফিকুল ইসলাম"
                          value={formData.FullName}
                          onChange={(e) => setFormData(prev => ({ ...prev, FullName: e.target.value }))}
                          className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          মোবাইল নম্বর (Login Mobile) *
                        </label>
                        <input
                          type="tel"
                          placeholder="017XXXXXXXX"
                          value={formData.Phone}
                          onChange={(e) => setFormData(prev => ({ ...prev, Phone: e.target.value }))}
                          className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-mono"
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
                          প্রোফাইল ছবি / অবতার
                        </label>
                        <div className="flex items-center space-x-3">
                          <div className="w-14 h-14 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden shrink-0">
                            {avatarPreview ? (
                              <img src={formatImageUrl(avatarPreview)} alt="Avatar" className="w-full h-full object-cover" />
                            ) : (
                              <User className="w-6 h-6 text-slate-400" />
                            )}
                          </div>
                          <div className="flex-1">
                            <label className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer shadow-2xs">
                              <Upload className="w-3.5 h-3.5 text-indigo-600" />
                              <span>ছবি নির্বাচন করুন</span>
                              <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                onChange={handleAvatarFileChange}
                                className="hidden"
                              />
                            </label>
                            <p className="text-[10px] text-slate-400 mt-1">সর্বোচ্চ ৫ মেগাবাইট (JPG, PNG)</p>
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

                    {/* লাইভ এস্টিমেটর প্রিভিউ */}
                    {(Number(formData.BaseSalary) > 0 || Number(formData.CommissionRate) > 0) && (
                      <div className="p-3 bg-indigo-50/70 rounded-xl border border-indigo-200 text-xs text-indigo-900">
                        <span className="font-bold flex items-center space-x-1 mb-1">
                          <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                          <span>আনুমানিক আয় প্রিভিউ:</span>
                        </span>
                        <p className="text-[11px] text-indigo-800">
                          যদি এই কর্মী মাসে <strong>{currencySymbol}১,০০,০০০</strong> টাকার পণ্য বিক্রি করেন, তবে মূল বেতন ({currencySymbol}{Number(formData.BaseSalary) || 0}) + কমিশন ({currencySymbol}{Math.round((100000 * (Number(formData.CommissionRate) || 0)) / 100)}) = মোট আনুমানিক আয় হবে <strong>{currencySymbol}{((Number(formData.BaseSalary) || 0) + Math.round((100000 * (Number(formData.CommissionRate) || 0)) / 100)).toLocaleString('en-IN')}</strong>।
                        </p>
                      </div>
                    )}
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
                          className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-mono"
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
                          className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-mono"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* ট্যাব ৪: পারমিশন ম্যাট্রিক্স */}
                {formActiveTab === 'permissions' && (
                  <div className="space-y-3.5">
                    
                    {/* ওয়ান-ক্লিক পারমিশন প্রিসেট বাটন */}
                    <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                      <span className="text-xs font-bold text-slate-700 flex items-center space-x-1">
                        <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                        <span>কুইক পারমিশন প্রিসেট:</span>
                      </span>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => applyPermissionPreset('cashier')}
                          className="px-2.5 py-1 text-[11px] font-semibold bg-white border border-slate-200 hover:border-indigo-300 hover:text-indigo-700 rounded-lg cursor-pointer"
                        >
                          💼 ক্যাশিয়ার প্রিসেট
                        </button>
                        <button
                          type="button"
                          onClick={() => applyPermissionPreset('salesman')}
                          className="px-2.5 py-1 text-[11px] font-semibold bg-white border border-slate-200 hover:border-indigo-300 hover:text-indigo-700 rounded-lg cursor-pointer"
                        >
                          🛍️ সেলসম্যান প্রিসেট
                        </button>
                        <button
                          type="button"
                          onClick={() => applyPermissionPreset('manager')}
                          className="px-2.5 py-1 text-[11px] font-semibold bg-white border border-slate-200 hover:border-indigo-300 hover:text-indigo-700 rounded-lg cursor-pointer"
                        >
                          🛡️ ম্যানেজার প্রিসেট
                        </button>
                        <button
                          type="button"
                          onClick={() => applyPermissionPreset('all')}
                          className="px-2 py-1 text-[10px] font-bold text-indigo-600 hover:bg-indigo-50 rounded-lg cursor-pointer"
                        >
                          সব দিন
                        </button>
                        <button
                          type="button"
                          onClick={() => applyPermissionPreset('clear')}
                          className="px-2 py-1 text-[10px] font-bold text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                        >
                          ক্লিয়ার
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {PERMISSION_DEFINITIONS.map(p => {
                        const isGranted = formData.Permissions.includes(p.id);
                        return (
                          <div
                            key={p.id}
                            onClick={() => handleTogglePermission(p.id)}
                            className={`p-3 rounded-xl border transition-all cursor-pointer flex items-start space-x-3 ${
                              isGranted
                                ? 'bg-indigo-50/70 border-indigo-300 text-indigo-950 shadow-2xs'
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

                {/* ত্রুটি বার্তা (সব ট্যাবেই সরাসরি বাটনের উপরে দৃশ্যমান) */}
                {formError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs sm:text-sm rounded-xl flex items-center space-x-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                    <span className="font-medium">{formError}</span>
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
                    type="button"
                    onClick={handleSubmitForm}
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
               ভিউ মোড ২: ডিজিটাল হাজিরা খাতা (Attendance Roster & Date Selector)
               ----------------------------------------------------------------- */
            <div className="space-y-4 max-w-5xl mx-auto">
              
              {/* কন্ট্রোল বার: তারিখ নির্বাচন ও বাল্ক ক্লক-ইন */}
              <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                    <Clock className="w-4 h-4 text-indigo-600" />
                    <span>শিফট হাজিরা ও কাজের সময় খতিয়ান</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    দোকানের কর্মচারীদের প্রবেশ ও প্রস্থান সময় ট্র্যাকিং এবং উপস্থিতি মনিটরিং
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {/* তারিখ ফিল্টার */}
                  <div className="flex items-center space-x-1.5 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-xl">
                    <Calendar className="w-3.5 h-3.5 text-slate-500" />
                    <input
                      type="date"
                      value={selectedAttendanceDate}
                      onChange={(e) => setSelectedAttendanceDate(e.target.value)}
                      className="bg-transparent text-xs font-semibold text-slate-800 focus:outline-hidden cursor-pointer"
                    />
                  </div>

                  <button
                    onClick={() => setSelectedAttendanceDate(new Date().toISOString().split('T')[0])}
                    className="px-2.5 py-1 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl cursor-pointer"
                  >
                    আজ
                  </button>

                  <button
                    onClick={handleBulkClockIn}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center space-x-1.5 cursor-pointer shadow-xs"
                    title="আজকের শিফটে সকল সক্রিয় স্টাফকে একসাথে উপস্থিত করুন"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>সবাই উপস্থিত</span>
                  </button>

                  <button
                    onClick={handleAutoClosePendingShifts}
                    className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-800 text-xs font-bold rounded-xl flex items-center space-x-1.5 cursor-pointer transition-colors shadow-2xs"
                    title="অসমাপ্ত বা ভুলে ক্লক-আউট না করা শিফটগুলো স্বয়ংক্রিয়ভাবে কাট-অফ করে বন্ধ করুন"
                  >
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                    <span>শিফট কাট-অফ</span>
                  </button>

                  <button
                    onClick={refreshAttendance}
                    className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl cursor-pointer"
                    title="হাজিরা রিফ্রেশ করুন"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* হাজিরা টেবিল */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-900 text-slate-300 font-semibold border-b border-slate-800">
                      <th className="py-3 px-4">স্টাফের নাম ও পদবী</th>
                      <th className="py-3 px-4">মোবাইল</th>
                      <th className="py-3 px-4">প্রবেশ সময় (Clock In)</th>
                      <th className="py-3 px-4">প্রস্থান সময় (Clock Out)</th>
                      <th className="py-3 px-4">কাজের সময়</th>
                      <th className="py-3 px-4 text-center">স্ট্যাটাস</th>
                      <th className="py-3 px-4 text-right">অ্যাকশন</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {users
                      .filter(u => u.Role !== 'Customer')
                      .map(u => {
                        const targetDate = selectedAttendanceDate;
                        const att = attendanceRecords.find(r => String(r.UserID).trim() === String(u.UserID).trim() && r.Date === targetDate);
                        const isPresent = Boolean(att && att.ClockIn);
                        const isClockedOut = Boolean(att && att.ClockOut);
                        const durationStr = getShiftDuration(att?.ClockIn, att?.ClockOut, att?.Status, targetDate);
                        const isLate = att?.ClockIn ? isLateClockIn(att.ClockIn) : false;

                        return (
                          <tr key={u.UserID} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-3 px-4 flex items-center space-x-3">
                              <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 font-bold flex items-center justify-center overflow-hidden shrink-0">
                                {u.AvatarUrl ? (
                                  <img src={formatImageUrl(u.AvatarUrl)} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  u.FullName?.slice(0, 1) || 'S'
                                )}
                              </div>
                              <div>
                                <p className="font-bold text-slate-900 flex items-center space-x-1.5">
                                  <span>{u.FullName}</span>
                                  <span className="text-[10px] font-normal text-slate-400">({u.Role})</span>
                                </p>
                                <span className="text-[10px] text-slate-500 font-mono">#{u.UserID}</span>
                              </div>
                            </td>
                            <td className="py-3 px-4 font-mono text-slate-600">{u.Phone || 'N/A'}</td>
                            <td className="py-3 px-4 font-mono">
                              {att?.ClockIn ? (
                                <div className="flex items-center space-x-1.5">
                                  <span className="text-emerald-700 font-bold">
                                    {new Date(att.ClockIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                  {isLate && (
                                    <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-100 text-amber-800">
                                      লেট
                                    </span>
                                  )}
                                </div>
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
                            <td className="py-3 px-4 font-mono font-semibold text-slate-700">
                              {durationStr}
                            </td>
                            <td className="py-3 px-4 text-center">
                              {att?.Status === 'AutoClosed' ? (
                                <span
                                  className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-300"
                                  title={att.Notes || 'কর্মী ক্লক-আউট করতে ভুলে গেছেন; সিস্টেম অটো-ক্লোজ করেছে'}
                                >
                                  <AlertTriangle className="w-3 h-3 text-purple-600" />
                                  <span>অটো-ক্লোজড</span>
                                </span>
                              ) : isPresent && !isClockedOut ? (
                                <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
                                  <span>ডিউটিতে আছেন</span>
                                </span>
                              ) : isPresent && isClockedOut ? (
                                <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                                  <Check className="w-3 h-3" />
                                  <span>শিফট শেষ</span>
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
                              ) : !isClockedOut && att?.Status !== 'AutoClosed' ? (
                                <button
                                  onClick={() => handleStaffClockOut(u)}
                                  className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-[11px] cursor-pointer shadow-xs"
                                >
                                  ক্লক-আউট
                                </button>
                              ) : (
                                <span className="text-[11px] text-slate-400 font-semibold">শিফট সমাপ্ত</span>
                              )}

                              {/* অ্যাডমিন এডিট ও সমন্বয় বাটন */}
                              <button
                                type="button"
                                onClick={() => handleOpenAdjustModal(u, att)}
                                className="p-1 rounded-lg bg-slate-100 hover:bg-indigo-100 text-slate-600 hover:text-indigo-600 transition-colors cursor-pointer inline-flex items-center"
                                title="হাজিরা ও কাজের সময় সমন্বয়/এডিট করুন"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : activeMainTab === 'payroll' ? (
            /* -----------------------------------------------------------------
               ভিউ মোড ৩: বেতন ও পে-রোল লেজার (Payroll Ledger & Payslip Generator)
               ----------------------------------------------------------------- */
            <div className="space-y-4 max-w-5xl mx-auto">
              
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                    <CreditCard className="w-4 h-4 text-amber-600" />
                    <span>চলতি মাসের স্টাফ বেতন ও কমিশন লেজার ({new Date().toLocaleDateString('bn-BD', { month: 'long', year: 'numeric' })})</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    স্টাফের মূল বেতন, অর্জিত বিক্রয় কমিশন এবং খরচের খাতা থেকে গৃহীত অগ্রিমের সমন্বয়
                  </p>
                </div>
              </div>

              {/* পে-রোল টেবিল */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-900 text-slate-300 font-semibold border-b border-slate-800">
                      <th className="py-3 px-4">কর্মীর নাম ও পদবী</th>
                      <th className="py-3 px-4 text-right">মূল বেতন</th>
                      <th className="py-3 px-4 text-right">চলতি মাসে বিক্রি</th>
                      <th className="py-3 px-4 text-right">অর্জিত কমিশন</th>
                      <th className="py-3 px-4 text-right">অগ্রিম/প্রদত্ত (Expenses)</th>
                      <th className="py-3 px-4 text-right">অবশিষ্ট বকেয়া</th>
                      <th className="py-3 px-4 text-center">অ্যাকশন</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {users
                      .filter(u => u.Role !== 'Customer')
                      .map(user => {
                        const salesM = getStaffSalesMetrics(user);
                        const sal = getStaffSalaryMetrics(user);

                        return (
                          <tr key={user.UserID} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-3 px-4 flex items-center space-x-2.5">
                              <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 font-bold flex items-center justify-center overflow-hidden shrink-0">
                                {user.AvatarUrl ? (
                                  <img src={formatImageUrl(user.AvatarUrl)} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  user.FullName?.slice(0, 1) || 'S'
                                )}
                              </div>
                              <div>
                                <p className="font-bold text-slate-900">{user.FullName}</p>
                                <span className="text-[10px] text-slate-500">{user.Role} • #{user.UserID?.slice(-6)}</span>
                              </div>
                            </td>

                            <td className="py-3 px-4 text-right font-semibold text-slate-900">
                              {sal.baseSalary > 0 ? `${currencySymbol}${sal.baseSalary.toLocaleString('en-IN')}` : 'নির্ধারিত নেই'}
                            </td>

                            <td className="py-3 px-4 text-right font-mono text-slate-700">
                              {currencySymbol}{salesM.totalSales.toLocaleString('en-IN')}
                            </td>

                            <td className="py-3 px-4 text-right font-bold text-emerald-700">
                              {salesM.commissionEarned > 0 ? `${currencySymbol}${salesM.commissionEarned.toLocaleString('en-IN')}` : '০'}
                            </td>

                            <td className="py-3 px-4 text-right font-bold text-amber-700">
                              {sal.paidThisMonth > 0 ? `${currencySymbol}${sal.paidThisMonth.toLocaleString('en-IN')}` : '০'}
                            </td>

                            <td className="py-3 px-4 text-right font-bold text-indigo-700">
                              {currencySymbol}{sal.balanceDue.toLocaleString('en-IN')}
                            </td>

                            <td className="py-3 px-4 text-center">
                              <div className="flex items-center justify-center space-x-1.5">
                                <button
                                  onClick={() => setSelectedStaffForPayslip(user)}
                                  className="px-2 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-[11px] flex items-center space-x-1 cursor-pointer transition-colors"
                                  title="অফিসিয়াল বেতন রসিদ তৈরি করুন"
                                >
                                  <Printer className="w-3 h-3" />
                                  <span>পে-স্লিপ</span>
                                </button>
                                <button
                                  onClick={() => setSelectedStaffForProfile(user)}
                                  className="p-1 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-800 cursor-pointer"
                                  title="বিস্তারিত হিসাব ও লেজার"
                                >
                                  <Activity className="w-3.5 h-3.5" />
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
          ) : (
            /* -----------------------------------------------------------------
               ভিউ মোড ১: স্টাফ বা কাস্টমার তালিকা (Cards / Table)
               ----------------------------------------------------------------- */
            <div className="space-y-4">
              
              {/* সার্চ ও ফিল্টার বার */}
              <div className="bg-white p-3 sm:p-3.5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row gap-2.5 items-stretch md:items-center justify-between">
                
                {/* সার্চ বক্স */}
                <div className="relative flex-1 min-w-[220px]">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder={
                      activeMainTab === 'customers'
                        ? "গ্রাহকের নাম, মোবাইল নম্বর, ইমেইল বা ঠিকানা দিয়ে খুঁজুন..."
                        : "স্টাফের নাম, মোবাইল, রোল, আইডি বা NID দিয়ে খুঁজুন..."
                    }
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
                  {activeMainTab === 'staff' && (
                    <select
                      value={selectedRoleFilter}
                      onChange={(e) => setSelectedRoleFilter(e.target.value)}
                      className="text-xs px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-700 font-semibold cursor-pointer"
                    >
                      <option value="All">সকল পদবী (All Roles)</option>
                      <option value="AdminGroup">এডমিন ও ম্যানেজার</option>
                      <option value="StaffGroup">ক্যাশিয়ার ও সেলস টিম</option>
                      <option value="Admin">Admin</option>
                      <option value="Manager">Manager</option>
                      <option value="Cashier">Cashier</option>
                      <option value="Salesman">Salesman</option>
                    </select>
                  )}

                  {activeMainTab === 'staff' && (
                    <select
                      value={selectedDutyFilter}
                      onChange={(e) => setSelectedDutyFilter(e.target.value)}
                      className="text-xs px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-700 font-semibold cursor-pointer"
                    >
                      <option value="all">সকল ডিউটি স্ট্যাটাস</option>
                      <option value="on_duty">🟢 ডিউটিতে আছেন</option>
                      <option value="completed">⚪ শিফট সম্পন্ন</option>
                      <option value="absent">🔴 আজ আসেননি</option>
                    </select>
                  )}

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

              {/* গ্রিড ভিউ */}
              {viewMode === 'grid' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  {filteredUsers.map((user) => {
                    const roleDef = ROLES.find(r => r.id === user.Role) || ROLES[3];
                    const salesM = getStaffSalesMetrics(user);
                    const salaryM = getStaffSalaryMetrics(user);
                    const isRevealed = revealedPinId === user.UserID;
                    const isInactive = user.Status === 'Inactive';
                    const duty = getStaffDutyStatus(user);

                    return (
                      <div
                        key={user.UserID}
                        className={`bg-white rounded-2xl border p-4 shadow-xs hover:shadow-md transition-all flex flex-col justify-between ${
                          isInactive ? 'border-rose-200 bg-rose-50/20 opacity-80' : 'border-slate-200'
                        }`}
                      >
                        <div>
                          {/* কার্ড হেডার: ছবি, নাম, পদবী ও লাইভ ডিউটি স্ট্যাটাস */}
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

                            {/* লাইভ ডিউটি ব্যাজ (যদি কাস্টমার না হয়) */}
                            {duty && (
                              <div className={`px-2 py-0.5 rounded-full text-[10px] font-bold border flex items-center space-x-1 ${duty.badge}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${duty.dot}`}></span>
                                <span>{duty.label}</span>
                              </div>
                            )}
                          </div>

                          {/* যোগাযোগ ও স্মার্ট পিন */}
                          <div className="mt-3 pt-3 border-t border-slate-100 space-y-1.5 text-xs text-slate-600">
                            <div className="flex items-center justify-between">
                              <span className="text-slate-400 flex items-center space-x-1">
                                <Phone className="w-3 h-3" />
                                <span>মোবাইল:</span>
                              </span>
                              <div className="flex items-center space-x-2 font-mono font-semibold text-slate-800">
                                <span>{user.Phone || 'N/A'}</span>
                                {user.Phone && (
                                  <div className="flex items-center space-x-1">
                                    <a
                                      href={`tel:${user.Phone}`}
                                      className="p-1 rounded bg-slate-100 hover:bg-indigo-50 text-slate-500 hover:text-indigo-600 transition-colors"
                                      title="কল করুন"
                                    >
                                      <PhoneCall className="w-3 h-3" />
                                    </a>
                                    <button
                                      onClick={() => handleWhatsApp(user.Phone, user.FullName)}
                                      className="p-1 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-600 transition-colors cursor-pointer"
                                      title="WhatsApp বার্তা পাঠান"
                                    >
                                      <MessageSquare className="w-3 h-3" />
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center justify-between">
                              <span className="text-slate-400 flex items-center space-x-1">
                                <KeyRound className="w-3 h-3" />
                                <span>লগইন পিন:</span>
                              </span>
                              <div className="flex items-center space-x-1 font-mono font-bold">
                                <span>{isRevealed ? user.PIN : '••••'}</span>
                                <button
                                  onClick={() => handleToggleRevealPin(user.UserID)}
                                  className="text-slate-400 hover:text-slate-600 cursor-pointer ml-1"
                                  title={isRevealed ? "পিন লুকান" : "পিন দেখুন (৬ সেকেন্ড অটো-হাইড)"}
                                >
                                  {isRevealed ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                                </button>
                                {isRevealed && (
                                  <button
                                    onClick={() => handleCopyText(user.PIN, `pin-${user.UserID}`)}
                                    className="text-slate-400 hover:text-indigo-600 cursor-pointer ml-0.5"
                                    title="পিন কপি করুন"
                                  >
                                    {copiedId === `pin-${user.UserID}` ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* ফাইন্যান্স ও সেলস মেট্রিক্স স্ট্রিপ (যদি কাস্টমার না হয়) */}
                          {user.Role !== 'Customer' && (
                            <div className="mt-3 p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 grid grid-cols-2 gap-2 text-[11px]">
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
                              title="স্মার্ট আইডি কার্ড ও QR কোড প্রিন্ট"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>

                            {/* পে-স্লিপ বাটন (কাস্টমার না হলে) */}
                            {user.Role !== 'Customer' && (
                              <button
                                onClick={() => setSelectedStaffForPayslip(user)}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-amber-600 hover:bg-amber-50 transition-colors cursor-pointer"
                                title="অফিসিয়াল বেতন রসিদ (Pay Slip)"
                              >
                                <FileText className="w-3.5 h-3.5" />
                              </button>
                            )}

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
                          {activeMainTab === 'staff' && <th className="py-3 px-3.5">লাইভ ডিউটি</th>}
                          <th className="py-3 px-3.5 text-right">মোট বিক্রি</th>
                          {activeMainTab === 'staff' && <th className="py-3 px-3.5 text-right">মূল বেতন</th>}
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
                          const duty = getStaffDutyStatus(user);

                          return (
                            <tr key={user.UserID} className="hover:bg-slate-50/80 transition-colors">
                              <td className="py-3 px-3.5 flex items-center space-x-2.5">
                                <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center overflow-hidden shrink-0">
                                  {user.AvatarUrl ? (
                                    <img src={formatImageUrl(user.AvatarUrl)} alt="" className="w-full h-full object-cover" />
                                  ) : (
                                    user.FullName?.slice(0, 1) || 'U'
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

                              {activeMainTab === 'staff' && (
                                <td className="py-3 px-3.5 whitespace-nowrap">
                                  {duty && (
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border inline-flex items-center space-x-1 ${duty.badge}`}>
                                      <span className={`w-1.5 h-1.5 rounded-full ${duty.dot}`}></span>
                                      <span>{duty.label}</span>
                                    </span>
                                  )}
                                </td>
                              )}

                              <td className="py-3 px-3.5 text-right font-bold text-slate-900 whitespace-nowrap">
                                {currencySymbol}{salesM.totalSales.toLocaleString('en-IN')}
                              </td>

                              {activeMainTab === 'staff' && (
                                <td className="py-3 px-3.5 text-right font-semibold text-indigo-700 whitespace-nowrap">
                                  {salaryM.baseSalary > 0 ? `${currencySymbol}${salaryM.baseSalary.toLocaleString('en-IN')}` : '—'}
                                </td>
                              )}

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
                                  {user.Role !== 'Customer' && (
                                    <button
                                      onClick={() => setSelectedStaffForPayslip(user)}
                                      className="p-1 rounded text-slate-500 hover:text-amber-600 cursor-pointer"
                                      title="পে-স্লিপ"
                                    >
                                      <FileText className="w-3.5 h-3.5" />
                                    </button>
                                  )}
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
          ৬. স্মার্ট ডিজিটাল স্টাফ আইডি কার্ড প্রিন্ট মোডাল (ডায়নামিক QR কোড সহ)
          ========================================================================= */}
      {selectedStaffForIdCard && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 z-[110] animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 flex flex-col">
            
            <div className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between border-b border-slate-800">
              <span className="font-bold text-xs sm:text-sm flex items-center space-x-1.5">
                <QrCode className="w-4 h-4 text-indigo-400" />
                <span>স্মার্ট স্টাফ আইডি কার্ড প্রিন্ট প্রিভিউ</span>
              </span>
              <button
                onClick={() => setSelectedStaffForIdCard(null)}
                className="w-7 h-7 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* আইডি কার্ড ভিউ (ডুয়েল সাইড) */}
            <div className="p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-center gap-4 bg-slate-100 max-h-[75vh] overflow-y-auto">
              
              {/* কার্ডের সামনের পিঠ */}
              <div
                id="printable-staff-id-card"
                className="w-[260px] bg-white rounded-2xl border-2 border-slate-300 p-4 shadow-md text-center flex flex-col items-center justify-between font-sans relative overflow-hidden shrink-0"
              >
                {/* টপ ব্যানার */}
                <div className="w-full bg-slate-900 text-white py-2 px-3 rounded-xl mb-2.5">
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
                <div className="w-full mt-2.5 py-2 border-y border-dashed border-slate-200 text-[10.5px] text-slate-700 space-y-1 text-left font-mono">
                  <div className="flex justify-between">
                    <span className="text-slate-400">আইডি:</span>
                    <span className="font-bold">#{selectedStaffForIdCard.UserID}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">মোবাইল:</span>
                    <span>{selectedStaffForIdCard.Phone || 'N/A'}</span>
                  </div>
                  {selectedStaffForIdCard.BloodGroup && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">ব্লাড গ্রুপ:</span>
                      <span className="font-bold text-rose-600">{selectedStaffForIdCard.BloodGroup}</span>
                    </div>
                  )}
                </div>

                {/* আসল স্ক্যানযোগ্য QR Code */}
                <div className="mt-2.5 flex flex-col items-center">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(`STAFF:${selectedStaffForIdCard.UserID}|${selectedStaffForIdCard.FullName}|${selectedStaffForIdCard.Role}|${selectedStaffForIdCard.Phone}`)}`}
                    alt="Staff QR"
                    className="w-16 h-16 rounded-lg border border-slate-200 p-1 bg-white shadow-2xs"
                  />
                  <span className="text-[9px] text-slate-400 font-mono mt-0.5">স্মার্ট স্ক্যান ভেরিফাইড</span>
                </div>
              </div>

              {/* কার্ডের পেছনের পিঠ (শর্তাবলী ও জরুরি কন্টাক্ট) */}
              <div className="w-[260px] bg-slate-900 text-slate-300 rounded-2xl border-2 border-slate-700 p-4 shadow-md text-left flex flex-col justify-between font-sans shrink-0 min-h-[350px]">
                <div>
                  <h4 className="font-bold text-white text-xs border-b border-slate-800 pb-1.5 mb-2 flex items-center justify-between">
                    <span>জরুরি নীতিমালা ও নিয়ম</span>
                    <Shield className="w-3.5 h-3.5 text-indigo-400" />
                  </h4>
                  <ul className="text-[9.5px] text-slate-400 space-y-1.5 list-disc pl-3">
                    <li>এই কার্ডটি {storeName}-এর নিজস্ব সম্পত্তি।</li>
                    <li>দোকানে ডিউটিরত অবস্থায় সার্বক্ষণিক কার্ড পরিধান বাধ্যতামূলক।</li>
                    <li>কার্ড হারিয়ে গেলে তাৎক্ষণিক ম্যানেজারকে রিপোর্ট করুন।</li>
                  </ul>

                  <div className="mt-4 pt-3 border-t border-slate-800 text-[10px] space-y-1">
                    <p className="text-slate-400">দোকানের ঠিকানা:</p>
                    <p className="text-white font-medium">{storeAddress}</p>
                    <p className="text-slate-400 mt-2">জরুরি যোগাযোগ:</p>
                    <p className="text-white font-mono">{selectedStaffForIdCard.EmergencyPhone || storePhone}</p>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-800 flex items-end justify-between text-[9px] text-slate-400">
                  <div className="text-center">
                    <div className="h-6 w-20 border-b border-dashed border-slate-600 mb-1"></div>
                    <span>অনুমোদিত স্বাক্ষর</span>
                  </div>
                  <div className="text-right font-mono">
                    VALID 2026-27
                  </div>
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
                <span>আইডি কার্ড প্রিন্ট করুন</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* =========================================================================
          ৭. অফিসিয়াল পে-স্লিপ প্রিন্ট মোডাল (Payslip Generator)
          ========================================================================= */}
      {selectedStaffForPayslip && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 z-[110] animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 flex flex-col">
            
            <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between border-b border-slate-800">
              <span className="font-bold text-xs sm:text-sm flex items-center space-x-1.5">
                <FileText className="w-4 h-4 text-amber-400" />
                <span>বেতন ও কমিশন রসিদ (Pay Slip)</span>
              </span>
              <button
                onClick={() => setSelectedStaffForPayslip(null)}
                className="w-7 h-7 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* পে-স্লিপ প্রিন্ট ভিউ */}
            <div className="p-6 bg-slate-50 overflow-y-auto max-h-[75vh]">
              <div
                id="printable-payslip"
                className="bg-white rounded-xl border border-slate-300 p-5 shadow-xs font-sans text-xs space-y-4"
              >
                {/* স্লিপ হেডার */}
                <div className="text-center border-b border-slate-200 pb-3">
                  <h3 className="font-black text-base text-slate-900 uppercase tracking-wider">{storeName}</h3>
                  <p className="text-[11px] text-slate-500">{storeAddress} • ফোন: {storePhone}</p>
                  <span className="inline-block mt-2 px-3 py-0.5 rounded-full text-[10px] font-bold bg-slate-900 text-white uppercase tracking-wider">
                    মাসিক বেতন ও কমিশন ভাউচার
                  </span>
                </div>

                {/* কর্মীর পরিচিতি */}
                <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <div>
                    <span className="text-slate-400 block text-[10px]">কর্মীর নাম:</span>
                    <strong className="text-slate-900">{selectedStaffForPayslip.FullName}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">পদবী / আইডি:</span>
                    <strong>{selectedStaffForPayslip.Role} (#{selectedStaffForPayslip.UserID})</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">মোবাইল:</span>
                    <span className="font-mono">{selectedStaffForPayslip.Phone || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">মাস ও বছর:</span>
                    <strong>{new Date().toLocaleDateString('bn-BD', { month: 'long', year: 'numeric' })}</strong>
                  </div>
                </div>

                {/* হিসাব টেবিল */}
                {(() => {
                  const salesM = getStaffSalesMetrics(selectedStaffForPayslip);
                  const sal = getStaffSalaryMetrics(selectedStaffForPayslip);
                  const grossEarnings = sal.baseSalary + salesM.commissionEarned;
                  const netPayable = Math.max(0, grossEarnings - sal.paidThisMonth);

                  return (
                    <div className="space-y-3">
                      <div className="border border-slate-200 rounded-lg overflow-hidden">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-100 font-bold text-slate-700 border-b border-slate-200">
                            <tr>
                              <th className="py-2 px-3">বিবরণ (Earnings & Deductions)</th>
                              <th className="py-2 px-3 text-right">টাকা ({currencySymbol})</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-[11px]">
                            <tr>
                              <td className="py-2 px-3">নির্ধারিত মাসিক মূল বেতন (Basic Salary)</td>
                              <td className="py-2 px-3 text-right font-semibold">{sal.baseSalary.toLocaleString('en-IN')}</td>
                            </tr>
                            <tr>
                              <td className="py-2 px-3">
                                বিক্রয় কমিশন ({selectedStaffForPayslip.CommissionRate || 0}% অন {currencySymbol}{salesM.totalSales.toLocaleString('en-IN')} বিক্রি)
                              </td>
                              <td className="py-2 px-3 text-right font-semibold text-emerald-700">+{salesM.commissionEarned.toLocaleString('en-IN')}</td>
                            </tr>
                            <tr className="bg-slate-50/70 font-bold text-slate-900">
                              <td className="py-2 px-3">সর্বমোট অর্জিত আয় (Gross Earnings)</td>
                              <td className="py-2 px-3 text-right">{grossEarnings.toLocaleString('en-IN')}</td>
                            </tr>
                            <tr>
                              <td className="py-2 px-3 text-amber-800">চলতি মাসে গৃহীত অগ্রিম / প্রদেয় (Advance Drawn)</td>
                              <td className="py-2 px-3 text-right font-semibold text-amber-800">-{sal.paidThisMonth.toLocaleString('en-IN')}</td>
                            </tr>
                            <tr className="bg-indigo-50/80 font-black text-indigo-950 text-xs">
                              <td className="py-2.5 px-3">নিট অবশিষ্ট প্রদেয় বেতন (Net Payable)</td>
                              <td className="py-2.5 px-3 text-right text-indigo-700 text-sm">{currencySymbol}{netPayable.toLocaleString('en-IN')}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>

                      {/* স্বাক্ষর লাইন */}
                      <div className="pt-6 flex justify-between text-[10px] text-slate-500">
                        <div className="text-center">
                          <div className="w-24 border-b border-dashed border-slate-400 mb-1"></div>
                          <span>কর্মীর স্বাক্ষর</span>
                        </div>
                        <div className="text-center">
                          <div className="w-24 border-b border-dashed border-slate-400 mb-1"></div>
                          <span>হিসাবরক্ষক / ম্যানেজার</span>
                        </div>
                      </div>
                    </div>
                  );
                })()}

              </div>
            </div>

            {/* অ্যাকশন বাটন */}
            <div className="p-3 bg-white border-t border-slate-200 flex justify-end space-x-2">
              <button
                onClick={() => setSelectedStaffForPayslip(null)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                বাতিল
              </button>
              <button
                onClick={() => window.print()}
                className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold flex items-center space-x-1.5 cursor-pointer shadow-sm"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>রসিদ প্রিন্ট করুন</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* =========================================================================
          ৮. স্টাফ বিস্তারিত প্রোফাইল, পারফরম্যান্স ও লেজার মোডাল
          ========================================================================= */}
      {selectedStaffForProfile && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 z-[110] animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-200 flex flex-col max-h-[90vh]">
            
            <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center font-bold text-white">
                  {selectedStaffForProfile.FullName?.slice(0, 1) || 'S'}
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

      {/* -------------------------------------------------------------
          শিফট হাজিরা ও কাজের সময় সমন্বয় মডাল (Admin Attendance Adjustment Modal)
          ------------------------------------------------------------- */}
      {adjustingAttendance && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-[110] animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden animate-scaleIn">
            {/* হেডার */}
            <div className="p-4 bg-gradient-to-r from-indigo-700 via-indigo-800 to-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-white">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold">শিফট হাজিরা ও সময় সমন্বয়</h3>
                  <p className="text-[11px] text-indigo-200">
                    {adjustingAttendance.user.FullName} ({adjustingAttendance.date})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCloseAdjustModal}
                className="p-1 rounded-lg hover:bg-white/10 text-white/80 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* ফর্ম বডি */}
            <div className="p-5 space-y-4 text-xs">
              {/* তথ্য কার্ড */}
              <div className="p-3 bg-indigo-50/70 border border-indigo-100 rounded-xl flex items-center justify-between">
                <div>
                  <p className="text-slate-500 text-[10px]">স্টাফের নাম ও পদবী</p>
                  <p className="font-bold text-slate-900">{adjustingAttendance.user.FullName} <span className="font-normal text-slate-500">({adjustingAttendance.user.Role})</span></p>
                </div>
                <span className="text-[11px] font-mono font-bold bg-white px-2 py-0.5 rounded-md border border-indigo-200 text-indigo-700">
                  #{adjustingAttendance.user.UserID}
                </span>
              </div>

              {/* সময় ইনপুট গ্রিড */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    প্রবেশ সময় (Clock-In)
                  </label>
                  <input
                    type="time"
                    value={adjustFormData.clockInTime}
                    onChange={(e) => setAdjustFormData(prev => ({ ...prev, clockInTime: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs font-bold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    প্রস্থান সময় (Clock-Out)
                  </label>
                  <input
                    type="time"
                    value={adjustFormData.clockOutTime}
                    onChange={(e) => setAdjustFormData(prev => ({ ...prev, clockOutTime: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs font-bold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* কুইক প্রস্থান সময় প্রিসেট বাটন */}
              <div>
                <span className="block text-[11px] font-medium text-slate-500 mb-1.5">
                  দ্রুত প্রস্থান সময় নির্ধারণ (কমন শিফট সমাপ্তি):
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { label: 'রাত ০৮:০০', time: '20:00' },
                    { label: 'রাত ০৮:৩০', time: '20:30' },
                    { label: 'রাত ০৯:০০', time: '21:00' },
                    { label: 'রাত ০৯:৩০', time: '21:30' },
                    { label: 'রাত ১০:০০', time: '22:00' }
                  ].map(preset => (
                    <button
                      key={preset.time}
                      type="button"
                      onClick={() => setAdjustFormData(prev => ({ ...prev, clockOutTime: preset.time, status: 'Completed' }))}
                      className={`px-2 py-1 rounded-lg border text-[11px] font-semibold cursor-pointer transition-colors ${
                        adjustFormData.clockOutTime === preset.time
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* স্ট্যাটাস নির্বাচন */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  হাজিরা স্ট্যাটাস
                </label>
                <select
                  value={adjustFormData.status}
                  onChange={(e) => setAdjustFormData(prev => ({ ...prev, status: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                >
                  <option value="Completed">শিফট সম্পন্ন (Completed)</option>
                  <option value="OnDuty">ডিউটিতে আছেন (On Duty)</option>
                  <option value="AutoClosed">অটো-ক্লোজড (Auto Closed)</option>
                  <option value="HalfDay">হাফ-ডে (Half Day)</option>
                  <option value="Absent">অনুপস্থিত (Absent)</option>
                </select>
              </div>

              {/* সমন্বয় নোট / মন্তব্য */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  সমন্বয়ের কারণ / মন্তব্য (নোট)
                </label>
                <input
                  type="text"
                  placeholder="যেমন: কর্মী ভুলে ক্লক-আউট করেননি, রাত ৯:৩০ এ সমন্বয়কৃত"
                  value={adjustFormData.notes}
                  onChange={(e) => setAdjustFormData(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {adjustSuccessMsg && (
                <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-xs font-semibold flex items-center space-x-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{adjustSuccessMsg}</span>
                </div>
              )}
            </div>

            {/* ফুটার বাটন */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end space-x-2.5">
              <button
                type="button"
                onClick={handleCloseAdjustModal}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
              >
                বাতিল
              </button>
              <button
                type="button"
                disabled={isAdjustingSubmitting}
                onClick={handleSaveAttendanceAdjustment}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md transition-colors flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
              >
                {isAdjustingSubmitting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Check className="w-3.5 h-3.5" />
                )}
                <span>সমন্বয় সংরক্ষণ করুন</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
