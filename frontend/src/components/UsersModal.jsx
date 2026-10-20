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
  ShieldAlert,
  Loader2,
  Crown,
  Upload,
  Camera,
  Image as ImageIcon,
  User,
  Copy,
  Check,
  LayoutGrid,
  List,
  ArrowUpDown,
  Filter,
  Calendar,
  CheckCircle,
  ExternalLink,
  Lock,
  ChevronDown
} from 'lucide-react';
import { formatImageUrl } from '../services/storage';

const ROLES = [
  {
    id: 'Admin',
    name: 'এডমিন (Admin)',
    tag: 'সুপার এক্সেস',
    icon: Crown,
    badgeColor: 'bg-indigo-100 text-indigo-800 border-indigo-200/90',
    cardBorder: 'border-indigo-500 bg-gradient-to-b from-indigo-50/90 to-white text-indigo-950 ring-2 ring-indigo-500/30 shadow-md shadow-indigo-500/10',
    avatarGradient: 'from-indigo-600 via-indigo-700 to-violet-800',
    description: 'সম্পূর্ণ সিস্টেম, সেটিংস, রিপোর্ট ও ব্যবহারকারী নিয়ন্ত্রণ',
    permissions: [
      'সম্পূর্ণ সিস্টেম ও সেটিংস নিয়ন্ত্রণ',
      'সকল ব্যবহারকারী তৈরি, এডিট ও ডিলিট',
      'লাভ-ক্ষতি, সেলস হিস্ট্রি ও ক্লাউড ডাটাবেস'
    ],
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
    permissions: [
      'পণ্য যুক্তকরণ ও স্টক ইন/আউট ব্যবস্থাপনা',
      'ক্যাটাগরি, ইউনিট ও কুপন কোড পরিচালনা',
      'বিক্রয় ইতিহাস ও কাস্টমার লেজার অনুসন্ধান'
    ],
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
    permissions: [
      'POS কাউন্টারে সরাসরি পণ্য বিক্রয় ও কার্ট',
      'ক্যাশ/অনলাইন পেমেন্ট গ্রহণ ও কুপন ছাড়',
      'তাত্ক্ষণিক ক্যাশ মেমো ও ইনভয়েস প্রিন্ট'
    ],
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
    permissions: [
      'পণ্য ক্যাটালগ প্রদর্শন ও স্টক তথ্য যাচাই',
      'গ্রাহকের জন্য কার্ট তৈরি ও অর্ডার বুকিং',
      'নতুন কাস্টমার প্রোফাইল তথ্য এন্ট্রি'
    ],
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
    permissions: [
      'অনলাইন শপ ক্যাটালগ ব্রাউজ ও পণ্য সার্চ',
      'শপিং কার্ট তৈরি ও স্বয়ংক্রিয় চেকআউট',
      'নিজস্ব পূর্ববর্তী অর্ডার মেমো ও চালান ট্র্যাকিং'
    ],
  },
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
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState('All');
  const [sortBy, setSortBy] = useState('default'); // 'default' | 'name-asc' | 'newest' | 'role'
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'table'
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const [revealedPinId, setRevealedPinId] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

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
  });

  // প্রোফাইল ছবি আপলোড স্টেট
  const fileInputRef = useRef(null);
  const [avatarPreview, setAvatarPreview] = useState('');
  const [avatarBase64, setAvatarBase64] = useState('');
  const [avatarMimeType, setAvatarMimeType] = useState('');

  const [showPin, setShowPin] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ইউজারদের রোলের উপর ভিত্তি করে নির্বাহী মেট্রিক্স হিসাব
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
    return { total, adminOnly, managers, admins, cashiers, salesmen, staff, customers, active, inactive };
  }, [users]);

  // ফিল্টার ও সর্ট করা ব্যবহারকারী তালিকা
  const filteredUsers = useMemo(() => {
    let list = [...(users || [])];
    const q = searchQuery.trim().toLowerCase();

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

    // সার্চ কিউরি ফিল্টার
    if (q) {
      list = list.filter((user) => {
        return (
          (user.FullName && user.FullName.toLowerCase().includes(q)) ||
          (user.Phone && user.Phone.toLowerCase().includes(q)) ||
          (user.Email && user.Email.toLowerCase().includes(q)) ||
          (user.UserID && user.UserID.toLowerCase().includes(q)) ||
          (user.Address && user.Address.toLowerCase().includes(q))
        );
      });
    }

    // সর্টিং লজিক
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

  // ছবি নির্বাচন হ্যান্ডলার
  const handleAvatarFileChange = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setFormError('অনুগ্রহ করে একটি বৈধ ইমেজ ফাইল নির্বাচন করুন (JPG, PNG, WebP)।');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setFormError('ছবির আকার সর্বোচ্চ ৫ মেগাবাইট (5MB) হতে পারবে।');
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

  const handleRemoveAvatar = () => {
    setAvatarPreview('');
    setAvatarBase64('');
    setAvatarMimeType('');
    setFormData((prev) => ({ ...prev, AvatarUrl: '' }));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleGeneratePin = () => {
    const randomPin = Math.floor(1000 + Math.random() * 9000).toString();
    setFormData((prev) => ({ ...prev, PIN: randomPin }));
    setShowPin(true);
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
      Role: 'Cashier',
      PIN: '1234',
      Address: '',
      AvatarUrl: '',
      Status: 'Active',
    });
    setFormError('');
    setFormSuccess('');
    setIsFormOpen(true);
  };

  const handleOpenEditUserForm = (user) => {
    setEditingUserId(user.UserID);
    const av = user.AvatarUrl || user.avatarUrl || '';
    setAvatarPreview(av);
    setAvatarBase64('');
    setAvatarMimeType('');
    if (fileInputRef.current) fileInputRef.current.value = '';
    setFormData({
      FullName: user.FullName || '',
      Phone: user.Phone || '',
      Email: user.Email || '',
      Role: user.Role || 'Customer',
      PIN: user.PIN || '',
      Address: user.Address || '',
      AvatarUrl: av,
      Status: user.Status || 'Active',
    });
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
      }, 800);
    } catch (err) {
      setFormError(err.message || 'ইউজার সংরক্ষণ করতে ব্যর্থ হয়েছে।');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (user) => {
    const newStatus = user.Status === 'Inactive' ? 'Active' : 'Inactive';
    if (onUpdateUser) {
      await onUpdateUser({
        UserID: user.UserID,
        Status: newStatus,
      });
    }
  };

  const handleDeleteConfirm = async (userId) => {
    if (onDeleteUser) {
      await onDeleteUser(userId);
    }
    setConfirmDeleteId(null);
  };

  const getRoleConfig = (roleName) => {
    return ROLES.find((r) => r.id === roleName) || {
      id: roleName,
      name: roleName || 'User',
      icon: User,
      badgeColor: 'bg-slate-100 text-slate-700 border-slate-200',
      avatarGradient: 'from-slate-600 to-slate-700',
    };
  };

  const getRoleBadge = (roleName) => {
    const role = getRoleConfig(roleName);
    const Icon = role.icon;
    return (
      <span
        className={`inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${role.badgeColor}`}
      >
        <Icon className="w-3.5 h-3.5 shrink-0" />
        <span>{role.name.split(' ')[0]}</span>
      </span>
    );
  };

  if (!isOpen && !embedded) return null;

  return (
    <div
      className={embedded ? "w-full flex-1 flex flex-col min-h-0 bg-transparent animate-in fade-in duration-200" : "fixed inset-0 z-50 overflow-y-auto bg-slate-950/75 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200"}
      onClick={embedded ? undefined : onClose}
    >
      <div
        className={embedded ? "bg-white rounded-2xl shadow-sm border border-slate-200/90 w-full flex-1 min-h-[calc(100vh-6.5rem)] flex flex-col overflow-hidden relative" : "bg-white rounded-3xl shadow-2xl border border-slate-200/90 max-w-5xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 my-auto relative"}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ================= ১. লাক্সারি হেডার (Dark Mesh Glass Header) ================= */}
        <div className="relative overflow-hidden bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-950 p-4 sm:p-5 text-white shrink-0 border-b border-indigo-900/50">
          {/* অ্যাম্বিয়েন্ট গ্লো ইফেক্টস */}
          <div className="absolute -top-16 -right-16 w-56 h-56 bg-indigo-500/25 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-16 -left-16 w-56 h-56 bg-violet-500/20 rounded-full blur-3xl pointer-events-none" />

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center space-x-3.5 min-w-0">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-500 via-indigo-600 to-violet-700 flex items-center justify-center text-white shadow-xl shadow-indigo-600/30 border border-white/20 shrink-0">
                <Users className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center space-x-2 flex-wrap">
                  <h2 className="text-base sm:text-lg font-black tracking-tight text-white truncate">
                    {isFormOpen
                      ? (editingUserId ? 'ইউজার তথ্য ও ভূমিকা সম্পাদনা' : 'নতুন ব্যবহারকারী তৈরি ও পারমিশন')
                      : 'ব্যবহারকারী ও স্টাফ ব্যবস্থাপনা'}
                  </h2>
                  <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-500/25 border border-indigo-400/30 text-indigo-200">
                    <ShieldCheck className="w-3 h-3 text-emerald-400" />
                    <span>RBAC নিরাপত্তা</span>
                  </span>
                </div>
                <p className="text-xs text-indigo-200/80 mt-0.5 truncate">
                  গুগল শিট `Users` ডাটাবেস • ব্যবহারকারী অ্যাকাউন্ট, অ্যাডমিন পারমিশন ও স্টাফ রোল নিয়ন্ত্রণ
                </p>
              </div>
            </div>

            {/* হেডার অ্যাকশন বাটনসমূহ (ইনলাইন ফ্লেক্স - কোনো ওভারল্যাপ নেই) */}
            <div className="flex items-center space-x-2 shrink-0 self-end sm:self-auto">
              {!isFormOpen && onRefreshUsers && (
                <button
                  type="button"
                  onClick={async () => {
                    setIsRefreshing(true);
                    try {
                      await onRefreshUsers();
                    } finally {
                      setIsRefreshing(false);
                    }
                  }}
                  disabled={isRefreshing}
                  title="গুগল শিট থেকে ডাটা রিফ্রেশ করুন"
                  className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-white text-xs font-bold transition-all flex items-center space-x-1.5 border border-white/15 cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-indigo-300' : 'text-white'}`} />
                  <span className="hidden sm:inline">রিফ্রেশ</span>
                </button>
              )}

              <button
                type="button"
                onClick={isFormOpen ? handleCloseForm : handleOpenNewUserForm}
                className={`inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-black shadow-lg transition-all active:scale-95 cursor-pointer ${
                  isFormOpen
                    ? 'bg-rose-500/25 hover:bg-rose-500/35 text-rose-200 border border-rose-400/30'
                    : 'bg-gradient-to-r from-indigo-500 via-indigo-600 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white shadow-indigo-600/30 border border-white/20'
                }`}
              >
                {isFormOpen ? (
                  <>
                    <X className="w-3.5 h-3.5" />
                    <span>ফর্ম বন্ধ করুন</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>নতুন ইউজার তৈরি করুন</span>
                  </>
                )}
              </button>

              {/* মডাল ক্লোজ বা ক্যাটালগ ব্যাক বাটন */}
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 text-white transition-all cursor-pointer border border-white/15 shrink-0 flex items-center space-x-1 text-xs font-bold"
                title={embedded ? "সেলস ক্যাটালগে ফিরে যান" : "বন্ধ করুন"}
              >
                {embedded ? (
                  <>
                    <span className="text-sm font-bold">←</span>
                    <span className="hidden sm:inline">ক্যাটালগে ফিরুন</span>
                  </>
                ) : (
                  <X className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
        </div>

        {isFormOpen ? (
          /* ================= ৩. আধুনিক ইউজার তৈরি ও পারমিশন প্রদান ফর্ম (Dedicated Suite) ================= */
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-slate-50/50">
            <form onSubmit={handleSubmitForm} className="flex-1 flex flex-col min-h-0">
              {/* ফর্মের স্ক্রলেবল বডি - ধাপ ১, ধাপ ২, ধাপ ৩ */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-7 space-y-6 scrollbar-thin">
                <div className="max-w-4xl mx-auto space-y-6">
                  {/* ফর্ম সাব-হেডার ইনফো বার */}
                  <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-indigo-50 via-white to-violet-50 border border-indigo-100 flex items-center justify-between shadow-2xs">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-700 text-white flex items-center justify-center shadow-md shadow-indigo-600/25 shrink-0 border border-white/20">
                        {editingUserId ? <Edit2 className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
                      </div>
                      <div>
                        <div className="flex items-center space-x-2 flex-wrap">
                          <h3 className="text-sm sm:text-base font-black text-slate-900 tracking-tight">
                            {editingUserId ? 'ব্যবহারকারীর তথ্য ও ভূমিকা সম্পাদনা' : 'নতুন ব্যবহারকারী তৈরি ও পারমিশন প্রদান'}
                          </h3>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100/70 text-emerald-700 border border-emerald-200">
                            {editingUserId ? 'আপডেট মোড' : 'নতুন অ্যাকাউন্ট'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5 flex items-center space-x-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          <span>সরাসরি গুগল শিট `Users` ডাটাবেসের সাথে রিয়েল-টাইম ক্লাউড সিঙ্ক</span>
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleCloseForm}
                      className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all cursor-pointer active:scale-95"
                      title="ফর্ম বন্ধ করুন"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* এরর বা সাকসেস মেসেজ */}
                  {formError && (
                    <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center space-x-2.5 animate-in slide-in-from-top-1">
                      <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                      <span className="font-medium">{formError}</span>
                    </div>
                  )}

                  {formSuccess && (
                    <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center space-x-2.5 animate-in slide-in-from-top-1">
                      <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                      <span className="font-medium">{formSuccess}</span>
                    </div>
                  )}

                  {/* ================= ধাপ ১: ভূমিকা ও পারমিশন নির্বাচন (100% দৃশ্যমান শীর্ষে) ================= */}
                  <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-3.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-black">
                          ১
                        </div>
                        <label className="text-xs sm:text-sm font-black text-slate-800">
                          ব্যবহারকারীর ভূমিকা / রোল নির্ধারণ করুন <span className="text-rose-500">*</span>
                        </label>
                      </div>
                      <span className="text-[11px] text-slate-400 hidden sm:inline">যেকোনো একটি ভূমিকা নির্বাচন করুন</span>
                    </div>

                    {/* ৫টি ভূমিকা কার্ড */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
                      {ROLES.map((role) => {
                        const Icon = role.icon;
                        const isSelected = formData.Role === role.id;
                        return (
                          <button
                            key={role.id}
                            type="button"
                            onClick={() => setFormData({ ...formData, Role: role.id })}
                            className={`p-3.5 rounded-2xl border text-left transition-all duration-200 cursor-pointer flex flex-col justify-between relative group ${
                              isSelected
                                ? role.cardBorder
                                : 'bg-white border-slate-200/90 hover:border-indigo-300 hover:shadow-xs text-slate-700'
                            }`}
                          >
                            {/* টপ রো: আইকন ও ট্যাগ */}
                            <div className="flex items-center justify-between mb-2.5">
                              <div
                                className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${
                                  isSelected
                                    ? 'bg-gradient-to-br from-indigo-600 to-violet-700 text-white shadow-xs'
                                    : 'bg-slate-100 text-slate-600 group-hover:bg-indigo-50 group-hover:text-indigo-600'
                                }`}
                              >
                                <Icon className="w-4 h-4" />
                              </div>

                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-black border uppercase tracking-wider ${
                                isSelected ? role.badgeColor : 'bg-slate-100 text-slate-500 border-slate-200'
                              }`}>
                                {role.tag || role.name.split(' ')[0]}
                              </span>
                            </div>

                            {/* ভূমিকা টাইটেল ও বিবরণ */}
                            <div>
                              <div className="flex items-center space-x-1.5">
                                <div className="text-xs font-black tracking-tight">{role.name}</div>
                                {isSelected && (
                                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 shrink-0" />
                                )}
                              </div>
                              <div className="text-[10px] text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                                {role.description}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {/* ডাইনামিক লাইভ পারমিশন প্রিভিউ বক্স */}
                    {(() => {
                      const selectedRole = ROLES.find((r) => r.id === formData.Role) || ROLES[0];
                      const Icon = selectedRole.icon;
                      return (
                        <div className="p-3.5 rounded-2xl bg-gradient-to-r from-slate-50 via-indigo-50/40 to-slate-50 border border-indigo-100/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                          <div className="flex items-center space-x-2">
                            <div className="w-7 h-7 rounded-lg bg-indigo-600/10 text-indigo-700 flex items-center justify-center shrink-0">
                              <Icon className="w-3.5 h-3.5" />
                            </div>
                            <div>
                              <div className="text-[11px] font-black text-slate-800">
                                <span>{selectedRole.name} এর অন্তর্ভুক্ত পারমিশনসমূহ:</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center flex-wrap gap-1.5">
                            {(selectedRole.permissions || []).map((perm, pIdx) => (
                              <span
                                key={pIdx}
                                className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-xl text-[10px] font-bold bg-white text-slate-700 border border-slate-200/90 shadow-2xs"
                              >
                                <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                                <span>{perm}</span>
                              </span>
                            ))}
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  {/* ================= ধাপ ২: প্রোফাইল পরিচিতি ও ছবি ================= */}
                  <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-3.5">
                    <div className="flex items-center space-x-2">
                      <div className="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-black">
                        ২
                      </div>
                      <label className="text-xs sm:text-sm font-black text-slate-800 flex items-center space-x-1.5">
                        <span>প্রোফাইল ছবি (Profile Avatar)</span>
                        <span className="text-[10px] font-normal text-slate-400">(ঐচ্ছিক)</span>
                      </label>
                    </div>

                    <div className="p-4 bg-gradient-to-r from-slate-50 via-white to-indigo-50/20 rounded-2xl border border-indigo-100/80 flex flex-col sm:flex-row items-center gap-4">
                      {/* অবতার ডিসপ্লে বক্স */}
                      <div className="relative group shrink-0">
                        <div className="w-20 h-20 sm:w-22 sm:h-22 rounded-2xl overflow-hidden border-2 border-indigo-200/80 shadow-md bg-white flex items-center justify-center relative ring-4 ring-indigo-50">
                          {avatarPreview ? (
                            <img
                              src={formatImageUrl(avatarPreview)}
                              alt="Avatar Preview"
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-tr from-slate-100 to-indigo-50/70 text-indigo-400">
                              <User className="w-9 h-9 opacity-70" />
                            </div>
                          )}

                          {/* ক্যামেরা হোভার ওভারলে */}
                          <button
                            type="button"
                            onClick={() => fileInputRef.current && fileInputRef.current.click()}
                            className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white cursor-pointer rounded-2xl backdrop-blur-2xs"
                            title="ছবি পরিবর্তন করুন"
                          >
                            <Camera className="w-5 h-5 drop-shadow-md text-white" />
                            <span className="text-[9px] font-bold mt-1 text-white">পরিবর্তন</span>
                          </button>
                        </div>

                        {/* ডিলিট বাটন */}
                        {avatarPreview && (
                          <button
                            type="button"
                            onClick={handleRemoveAvatar}
                            className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-rose-600 text-white flex items-center justify-center shadow-md hover:bg-rose-700 transition-transform active:scale-90 cursor-pointer"
                            title="ছবি মুছে ফেলুন"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      {/* বিবরণ ও আপলোড অ্যাকশন বাটন */}
                      <div className="flex-1 text-center sm:text-left min-w-0">
                        <div className="flex items-center justify-center sm:justify-start space-x-1.5">
                          <span className="text-xs font-bold text-slate-800">ব্যক্তিগত বা স্টাফ ছবি আপলোড</span>
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                            গুগল ড্রাইভ ব্যাকআপ
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                          ডিভাইস থেকে ছবি নির্বাচন করুন। ছবি স্বয়ংক্রিয়ভাবে স্প্রেডশিটের সাথে যুক্ত গুগল ড্রাইভের <strong>users image</strong> ফোল্ডারে সংরক্ষিত হবে।
                        </p>

                        <div className="mt-3 flex flex-wrap items-center justify-center sm:justify-start gap-2">
                          <input
                            type="file"
                            ref={fileInputRef}
                            accept="image/*"
                            onChange={handleAvatarFileChange}
                            className="hidden"
                          />
                          <button
                            type="button"
                            onClick={() => fileInputRef.current && fileInputRef.current.click()}
                            className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/20 active:scale-95 transition-all cursor-pointer"
                          >
                            <Upload className="w-3.5 h-3.5" />
                            <span>{avatarPreview ? 'নতুন ছবি নির্বাচন করুন' : 'ছবি আপলোড করুন'}</span>
                          </button>

                          {avatarPreview && (
                            <button
                              type="button"
                              onClick={handleRemoveAvatar}
                              className="inline-flex items-center space-x-1 px-3 py-2 rounded-xl bg-slate-100 hover:bg-rose-50 hover:text-rose-700 text-slate-600 text-xs font-bold transition-all cursor-pointer border border-slate-200/90"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                              <span>মুছে ফেলুন</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* ================= ধাপ ৩: মূল তথ্য ও লগইন ক্রেডেনশিয়ালস ================= */}
                  <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-3.5">
                    <div className="flex items-center space-x-2">
                      <div className="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-black">
                        ৩
                      </div>
                      <label className="text-xs sm:text-sm font-black text-slate-800">
                        অ্যাকাউন্টের মূল তথ্য ও লগইন ক্রেডেনশিয়ালস
                      </label>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      {/* পুরো নাম */}
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-700 flex items-center space-x-1">
                          <span>পুরো নাম</span>
                          <span className="text-rose-500">*</span>
                        </label>
                        <div className="relative">
                          <div className="absolute left-3 top-1/2 -translate-y-1/2 w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 pointer-events-none">
                            <User className="w-3.5 h-3.5" />
                          </div>
                          <input
                            type="text"
                            required
                            value={formData.FullName}
                            onChange={(e) => setFormData({ ...formData, FullName: e.target.value })}
                            placeholder="যেমন: মোহাম্মদ আরিফুল ইসলাম"
                            className="w-full pl-12 pr-3 py-2.5 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/15 focus:border-indigo-600 transition-all font-medium text-slate-800"
                          />
                        </div>
                      </div>

                      {/* মোবাইল নম্বর */}
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                          <span className="flex items-center space-x-1">
                            <span>মোবাইল নম্বর</span>
                            <span className="text-rose-500">*</span>
                          </span>
                          <span className="text-[10px] text-slate-400 font-normal">লগইন আইডি</span>
                        </label>
                        <div className="relative">
                          <div className="absolute left-3 top-1/2 -translate-y-1/2 w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 pointer-events-none">
                            <Phone className="w-3.5 h-3.5" />
                          </div>
                          <input
                            type="tel"
                            value={formData.Phone}
                            onChange={(e) => setFormData({ ...formData, Phone: e.target.value })}
                            placeholder="যেমন: 01712345678"
                            className="w-full pl-12 pr-3 py-2.5 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/15 focus:border-indigo-600 transition-all font-mono text-slate-800"
                          />
                        </div>
                      </div>

                      {/* ইমেইল ঠিকানা */}
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-700 flex items-center space-x-1.5">
                          <span>ইমেইল ঠিকানা</span>
                          <span className="text-[10px] font-normal text-slate-400">(ঐচ্ছিক)</span>
                        </label>
                        <div className="relative">
                          <div className="absolute left-3 top-1/2 -translate-y-1/2 w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 pointer-events-none">
                            <Mail className="w-3.5 h-3.5" />
                          </div>
                          <input
                            type="email"
                            value={formData.Email}
                            onChange={(e) => setFormData({ ...formData, Email: e.target.value })}
                            placeholder="যেমন: staff@pos.local"
                            className="w-full pl-12 pr-3 py-2.5 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/15 focus:border-indigo-600 transition-all text-slate-800"
                          />
                        </div>
                      </div>

                      {/* লগইন পিন / পাসওয়ার্ড (ব্রাউজার অটোফিল আইকন ওভারল্যাপ ফ্রি) */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-bold text-slate-700 flex items-center space-x-1">
                            <span>লগইন পিন / পাসওয়ার্ড</span>
                            <span className="text-rose-500">*</span>
                          </label>
                          <div className="flex items-center space-x-1.5">
                            <button
                              type="button"
                              onClick={() => setShowPin(!showPin)}
                              className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-600 transition-all cursor-pointer active:scale-95"
                              title={showPin ? 'পিন লুকান' : 'পিন দেখুন'}
                            >
                              {showPin ? <EyeOff className="w-3 h-3 text-slate-500" /> : <Eye className="w-3 h-3 text-slate-500" />}
                              <span>{showPin ? 'লুকান' : 'দেখুন'}</span>
                            </button>
                            <button
                              type="button"
                              onClick={handleGeneratePin}
                              className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-lg text-[10px] font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200/80 transition-all cursor-pointer active:scale-95"
                              title="৪ সংখ্যার র‍্যান্ডম পিন জেনারেট করুন"
                            >
                              <Sparkles className="w-3 h-3 text-indigo-600" />
                              <span>র‍্যান্ডম পিন</span>
                            </button>
                          </div>
                        </div>
                        <div className="relative">
                          <div className="absolute left-3 top-1/2 -translate-y-1/2 w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 pointer-events-none">
                            <KeyRound className="w-3.5 h-3.5" />
                          </div>
                          <input
                            type={showPin ? 'text' : 'password'}
                            required
                            value={formData.PIN}
                            onChange={(e) => setFormData({ ...formData, PIN: e.target.value })}
                            placeholder="যেমন: 1234 (কমপক্ষে ৪ সংখ্যা)"
                            className="w-full pl-12 pr-4 py-2.5 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/15 focus:border-indigo-600 transition-all font-mono tracking-widest text-slate-800"
                          />
                        </div>
                      </div>

                      {/* পূর্ণ ঠিকানা */}
                      <div className="sm:col-span-2 space-y-1">
                        <label className="text-xs font-bold text-slate-700 flex items-center space-x-1.5">
                          <span>সম্পূর্ণ ঠিকানা</span>
                          <span className="text-[10px] font-normal text-slate-400">(ঐচ্ছিক)</span>
                        </label>
                        <div className="relative">
                          <div className="absolute left-3 top-2.5 w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 pointer-events-none">
                            <MapPin className="w-3.5 h-3.5" />
                          </div>
                          <input
                            type="text"
                            value={formData.Address}
                            onChange={(e) => setFormData({ ...formData, Address: e.target.value })}
                            placeholder="যেমন: দোকান #১২, রোড #৪, ধানমন্ডি, ঢাকা"
                            className="w-full pl-12 pr-3 py-2.5 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/15 focus:border-indigo-600 transition-all text-slate-800"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* ================= স্টিকি অ্যাকশন ফুটার (Pinned Cleanly at the Bottom, Zero Clipping) ================= */}
              <div className="shrink-0 bg-white border-t border-slate-200/90 p-4 sm:px-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-lg z-10">
                {/* স্ট্যাটাস টগল */}
                <div className="flex items-center space-x-2.5">
                  <span className="text-xs font-black text-slate-700">অ্যাকাউন্ট স্ট্যাটাস:</span>
                  <button
                    type="button"
                    onClick={() =>
                      setFormData({
                        ...formData,
                        Status: formData.Status === 'Active' ? 'Inactive' : 'Active',
                      })
                    }
                    className={`px-3.5 py-1.5 rounded-full text-xs font-black cursor-pointer transition-all border flex items-center space-x-2 shadow-2xs active:scale-95 ${
                      formData.Status === 'Active'
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-300 ring-2 ring-emerald-500/20'
                        : 'bg-rose-50 text-rose-800 border-rose-300 ring-2 ring-rose-500/20'
                    }`}
                  >
                    <span
                      className={`w-2.5 h-2.5 rounded-full ${
                        formData.Status === 'Active' ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
                      }`}
                    />
                    <span>{formData.Status === 'Active' ? 'সক্রিয় (Active)' : 'নিষ্ক্রিয় (Inactive)'}</span>
                  </button>
                </div>

                {/* বাটনসমূহ */}
                <div className="flex items-center space-x-2.5 justify-end">
                  <button
                    type="button"
                    onClick={handleCloseForm}
                    className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-100 active:scale-95 transition-all cursor-pointer border border-transparent"
                  >
                    বাতিল
                  </button>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="inline-flex items-center space-x-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-700 to-violet-700 hover:from-indigo-700 hover:to-violet-800 active:scale-95 text-white text-xs font-black shadow-lg shadow-indigo-600/30 hover:shadow-indigo-600/50 cursor-pointer disabled:opacity-50 transition-all border border-white/20"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>সংরক্ষণ হচ্ছে...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>{editingUserId ? 'তথ্য আপডেট করুন' : 'নতুন ব্যবহারকারী তৈরি করুন'}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        ) : (
          /* ================= ড্যাশবোর্ড মোড: KPI কার্ডস, কন্ট্রোল বার, ইউজার লিস্ট ও ফুটার ================= */
          <>
            {/* ২. এক্সিকিউটিভ KPI মেট্রিক্স কার্ডস (ইন্টারেক্টিভ ফিল্টারিং) */}
            <div className="p-3 sm:p-4 bg-slate-50/80 border-b border-slate-200/90 shrink-0">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
                {/* মোট অ্যাকাউন্ট */}
                <div
                  onClick={() => setSelectedRoleFilter('All')}
                  className={`p-3 sm:p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center space-x-3 group ${
                    selectedRoleFilter === 'All'
                      ? 'bg-white border-indigo-400 ring-2 ring-indigo-500/20 shadow-md'
                      : 'bg-white/90 border-slate-200/90 hover:bg-white hover:border-slate-300 shadow-2xs'
                  }`}
                >
                  <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold shrink-0 group-hover:scale-105 transition-transform">
                    <Users className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-[11px] font-bold text-slate-500 block truncate">মোট অ্যাকাউন্ট</span>
                    <div className="flex items-baseline space-x-1.5">
                      <span className="text-base sm:text-lg font-black text-slate-900">{metrics.total}</span>
                      <span className="text-[10px] text-slate-400 font-bold">জন</span>
                      <span className="text-[10px] text-emerald-600 font-bold ml-auto">({metrics.active} সক্রিয়)</span>
                    </div>
                  </div>
                </div>

                {/* এডমিন ও ম্যানেজার */}
                <div
                  onClick={() => setSelectedRoleFilter('AdminGroup')}
                  className={`p-3 sm:p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center space-x-3 group ${
                    selectedRoleFilter === 'AdminGroup' || selectedRoleFilter === 'Admin'
                      ? 'bg-indigo-50/60 border-indigo-300 ring-2 ring-indigo-500/20 shadow-md'
                      : 'bg-white/90 border-slate-200/90 hover:bg-white hover:border-indigo-200 shadow-2xs'
                  }`}
                >
                  <div className="w-10 h-10 rounded-xl bg-indigo-100/70 text-indigo-700 flex items-center justify-center font-bold shrink-0 group-hover:scale-105 transition-transform">
                    <Crown className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-[11px] font-bold text-slate-500 block truncate">এডমিন ও ম্যানেজার</span>
                    <div className="flex items-baseline space-x-1.5">
                      <span className="text-base sm:text-lg font-black text-indigo-900">{metrics.admins}</span>
                      <span className="text-[10px] text-indigo-600 font-bold">জন</span>
                    </div>
                  </div>
                </div>

                {/* ক্যাশিয়ার ও সেলসম্যান */}
                <div
                  onClick={() => setSelectedRoleFilter('StaffGroup')}
                  className={`p-3 sm:p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center space-x-3 group ${
                    selectedRoleFilter === 'StaffGroup' || selectedRoleFilter === 'Cashier' || selectedRoleFilter === 'Salesman'
                      ? 'bg-amber-50/60 border-amber-300 ring-2 ring-amber-500/20 shadow-md'
                      : 'bg-white/90 border-slate-200/90 hover:bg-white hover:border-amber-200 shadow-2xs'
                  }`}
                >
                  <div className="w-10 h-10 rounded-xl bg-amber-100/70 text-amber-700 flex items-center justify-center font-bold shrink-0 group-hover:scale-105 transition-transform">
                    <Briefcase className="w-5 h-5 text-amber-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-[11px] font-bold text-slate-500 block truncate">ক্যাশিয়ার ও সেলসম্যান</span>
                    <div className="flex items-baseline space-x-1.5">
                      <span className="text-base sm:text-lg font-black text-amber-900">{metrics.staff}</span>
                      <span className="text-[10px] text-amber-600 font-bold">জন</span>
                      <span className="text-[10px] text-slate-400 font-normal ml-auto">({metrics.cashiers} ক্যাশ, {metrics.salesmen} সেলস)</span>
                    </div>
                  </div>
                </div>

                {/* গ্রাহক অ্যাকাউন্ট */}
                <div
                  onClick={() => setSelectedRoleFilter('Customer')}
                  className={`p-3 sm:p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center space-x-3 group ${
                    selectedRoleFilter === 'Customer'
                      ? 'bg-emerald-50/60 border-emerald-300 ring-2 ring-emerald-500/20 shadow-md'
                      : 'bg-white/90 border-slate-200/90 hover:bg-white hover:border-emerald-200 shadow-2xs'
                  }`}
                >
                  <div className="w-10 h-10 rounded-xl bg-emerald-100/70 text-emerald-700 flex items-center justify-center font-bold shrink-0 group-hover:scale-105 transition-transform">
                    <ShoppingBag className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-[11px] font-bold text-slate-500 block truncate">নিবন্ধিত গ্রাহক</span>
                    <div className="flex items-baseline space-x-1.5">
                      <span className="text-base sm:text-lg font-black text-emerald-900">{metrics.customers}</span>
                      <span className="text-[10px] text-emerald-600 font-bold">জন</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

        {/* ================= ৪. আধুনিক ও সুষম কন্ট্রোল বার (সার্চ, ফিল্টার ও ডিসপ্লে টুলস) ================= */}
        <div className="p-3 sm:p-4 bg-white border-b border-slate-200/90 space-y-3 shrink-0">
          {/* টিয়ার ১: সার্চ বক্স (বামে) এবং সর্টিং ও ভিউ মোড সুইচ (ডানে) */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            {/* সার্চ বক্স */}
            <div className="relative w-full sm:flex-1 sm:max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="নাম, ফোন, ইমেইল বা আইডি দিয়ে খুঁজুন..."
                className="w-full pl-9 pr-8 py-2 text-xs rounded-xl border border-slate-200/90 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-slate-50/70 focus:bg-white transition-all font-medium text-slate-800 placeholder:text-slate-400"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs w-4 h-4 rounded-full flex items-center justify-center cursor-pointer transition-colors"
                >
                  ✕
                </button>
              )}
            </div>

            {/* সর্টিং ও ভিউ মোড সুইচ (একসাথে ডান কর্নারে নিটোলভাবে সাজানো) */}
            <div className="flex items-center space-x-2 w-full sm:w-auto justify-end shrink-0">
              {/* সর্ট ড্রপডাউন */}
              <div className="relative">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="pl-3 pr-8 py-2 text-xs font-bold bg-slate-50 hover:bg-slate-100 border border-slate-200/90 rounded-xl text-slate-700 cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                >
                  <option value="default">ডিফল্ট ক্রম</option>
                  <option value="name-asc">নাম (A-Z)</option>
                  <option value="newest">নতুন তৈরি আগে</option>
                  <option value="role">ভূমিকা অনুযায়ী</option>
                </select>
              </div>

              {/* ভিউ মোড টগল */}
              <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200/90">
                <button
                  type="button"
                  onClick={() => setViewMode('grid')}
                  title="কার্ড গ্রিড ভিউ"
                  className={`flex items-center space-x-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    viewMode === 'grid'
                      ? 'bg-white text-indigo-600 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline text-[11px]">গ্রিড</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('table')}
                  title="তালিকা টেবিল ভিউ"
                  className={`flex items-center space-x-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    viewMode === 'table'
                      ? 'bg-white text-indigo-600 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <List className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline text-[11px]">তালিকা</span>
                </button>
              </div>
            </div>
          </div>

          {/* টিয়ার ২: স্লিক সেগমেন্টেড রোল ফিল্টার স্ট্রিপ (সম্পূর্ণ প্রস্থ জুড়ে সুষম বিন্যাস) */}
          <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
            <div className="flex items-center space-x-1.5 overflow-x-auto scrollbar-none py-0.5 w-full">
              <span className="text-[11px] font-bold text-slate-400 mr-1 shrink-0 hidden sm:inline-flex items-center space-x-1">
                <Filter className="w-3 h-3 text-slate-400" />
                <span>ফিল্টার:</span>
              </span>
              {[
                { id: 'All', label: 'সকল', count: metrics.total },
                { id: 'Admin', label: 'এডমিন', count: metrics.adminOnly, icon: Crown },
                { id: 'Manager', label: 'ম্যানেজার', count: metrics.managers, icon: ShieldCheck },
                { id: 'Cashier', label: 'ক্যাশিয়ার', count: metrics.cashiers, icon: Briefcase },
                { id: 'Salesman', label: 'সেলসম্যান', count: metrics.salesmen, icon: UserCheck },
                { id: 'Customer', label: 'গ্রাহক', count: metrics.customers, icon: ShoppingBag },
              ].map((role) => {
                const isSelected = selectedRoleFilter === role.id;
                const Icon = role.icon;
                return (
                  <button
                    key={role.id}
                    type="button"
                    onClick={() => setSelectedRoleFilter(role.id)}
                    className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 active:scale-95 ${
                      isSelected
                        ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-xs shadow-indigo-600/20'
                        : 'bg-slate-100/80 hover:bg-slate-200/80 text-slate-600 border border-transparent hover:border-slate-300'
                    }`}
                  >
                    {Icon && <Icon className={`w-3 h-3 ${isSelected ? 'text-white' : 'text-slate-500'}`} />}
                    <span>{role.label}</span>
                    <span
                      className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                        isSelected ? 'bg-white/25 text-white' : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {role.count || 0}
                    </span>
                  </button>
                );
              })}
            </div>

            {selectedRoleFilter !== 'All' && (
              <button
                type="button"
                onClick={() => setSelectedRoleFilter('All')}
                className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 whitespace-nowrap shrink-0 hover:underline cursor-pointer"
              >
                রিসেট
              </button>
            )}
          </div>
        </div>

        {/* ================= ৫. ব্যবহারকারী তালিকা (Grid বনাম Table View) ================= */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-5">
          {filteredUsers.length === 0 ? (
            <div className="py-16 text-center">
              <div className="w-16 h-16 rounded-3xl bg-indigo-50 border border-indigo-100 flex items-center justify-center mx-auto mb-3 shadow-inner text-indigo-500">
                <Users className="w-8 h-8 opacity-60" />
              </div>
              <div className="text-sm font-black text-slate-700">কোনো ব্যবহারকারী পাওয়া যায়নি</div>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                {searchQuery
                  ? `'${searchQuery}' এর সাথে মিল পাওয়া যায়নি। অনুসন্ধান শব্দ পরিবর্তন করে আবার চেষ্টা করুন।`
                  : 'বর্তমান ফিল্টারে কোনো রেকর্ড নেই। নতুন ব্যবহারকারী যোগ করতে উপরের বাটন চাপুন।'}
              </p>
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="mt-3 px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer"
                >
                  অনুসন্ধান রিসেট করুন
                </button>
              )}
            </div>
          ) : viewMode === 'grid' ? (
            /* ================= কার্ড গ্রিড ভিউ (Card Grid Mode) ================= */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {filteredUsers.map((user) => {
                const isCurrentActive = activeUser && (activeUser.UserID === user.UserID || (activeUser.Phone && activeUser.Phone === user.Phone));
                const isInactive = user.Status === 'Inactive';
                const roleConfig = getRoleConfig(user.Role);

                return (
                  <div
                    key={user.UserID}
                    className={`rounded-2xl border p-4 transition-all relative flex flex-col justify-between group hover:shadow-md ${
                      isCurrentActive
                        ? 'border-indigo-400 bg-gradient-to-br from-indigo-50/50 via-white to-purple-50/20 shadow-xs ring-1 ring-indigo-500/20'
                        : isInactive
                        ? 'border-slate-200 bg-slate-50/60 opacity-80'
                        : 'border-slate-200/90 bg-white hover:border-slate-300 shadow-2xs'
                    }`}
                  >
                    <div>
                      {/* টপ রো: অবতার, নাম ও কুইক অ্যাকশন বাটন */}
                      <div className="flex items-start justify-between gap-2.5">
                        <div className="flex items-start space-x-3 min-w-0">
                          {/* অবতার ফটো বা ইনিশিয়াল */}
                          <div className="relative shrink-0">
                            {user.AvatarUrl ? (
                              <div className="w-12 h-12 rounded-2xl overflow-hidden border-2 border-white shadow-sm bg-slate-100 flex items-center justify-center relative">
                                <img
                                  src={formatImageUrl(user.AvatarUrl)}
                                  alt={user.FullName}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    e.currentTarget.style.display = 'none';
                                    const fallback = e.currentTarget.nextElementSibling;
                                    if (fallback) fallback.style.display = 'flex';
                                  }}
                                />
                                <div
                                  style={{ display: 'none' }}
                                  className={`w-full h-full items-center justify-center font-black text-sm text-white bg-gradient-to-br ${roleConfig.avatarGradient}`}
                                >
                                  {(user.FullName || 'U').charAt(0).toUpperCase()}
                                </div>
                              </div>
                            ) : (
                              <div
                                className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-sm text-white shadow-sm bg-gradient-to-br ${roleConfig.avatarGradient}`}
                              >
                                {(user.FullName || 'U').charAt(0).toUpperCase()}
                              </div>
                            )}

                            {/* অ্যাক্টিভ অনলাইন ডট */}
                            <span
                              className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white shadow-2xs ${
                                isInactive ? 'bg-slate-300' : 'bg-emerald-500'
                              }`}
                              title={isInactive ? 'অ্যাকাউন্ট নিষ্ক্রিয়' : 'অ্যাকাউন্ট সক্রিয়'}
                            />
                          </div>

                          {/* নাম ও রোল */}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center space-x-1.5 flex-wrap">
                              <h4 className="text-xs sm:text-sm font-black text-slate-900 truncate">
                                {user.FullName}
                              </h4>
                              {isCurrentActive && (
                                <span className="inline-flex items-center space-x-1 px-1.5 py-0.2 rounded-md text-[9px] font-black bg-indigo-600 text-white shadow-2xs">
                                  <span>👑 আপনি</span>
                                </span>
                              )}
                            </div>

                            <div className="flex items-center space-x-1.5 mt-1 flex-wrap gap-y-1">
                              {getRoleBadge(user.Role)}

                              <button
                                type="button"
                                onClick={() => handleToggleStatus(user)}
                                title={isInactive ? 'ক্লিক করে সক্রিয় করুন' : 'ক্লিক করে নিষ্ক্রিয় করুন'}
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold border transition-colors cursor-pointer flex items-center space-x-1 ${
                                  isInactive
                                    ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                                    : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                }`}
                              >
                                <span className={`w-1.5 h-1.5 rounded-full ${isInactive ? 'bg-rose-500' : 'bg-emerald-500'}`} />
                                <span>{isInactive ? 'নিষ্ক্রিয়' : 'সক্রিয়'}</span>
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* অ্যাকশন কন্ট্রোলস */}
                        <div className="flex items-center space-x-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleOpenEditUserForm(user)}
                            title="তথ্য ও রোল সম্পাদনা করুন"
                            className="p-1.5 rounded-xl text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleToggleStatus(user)}
                            title={isInactive ? 'সক্রিয় করুন' : 'নিষ্ক্রিয় করুন'}
                            className={`p-1.5 rounded-xl transition-colors cursor-pointer ${
                              isInactive
                                ? 'text-emerald-600 hover:bg-emerald-50'
                                : 'text-amber-600 hover:bg-amber-50'
                            }`}
                          >
                            <Power className="w-3.5 h-3.5" />
                          </button>

                          {/* ডিলিট অপশন */}
                          {confirmDeleteId === user.UserID ? (
                            <div className="flex items-center space-x-1 bg-rose-50 p-1 rounded-xl border border-rose-200 animate-in fade-in duration-150">
                              <button
                                type="button"
                                onClick={() => handleDeleteConfirm(user.UserID)}
                                className="px-2 py-0.5 rounded-lg text-[10px] font-black bg-rose-600 text-white cursor-pointer hover:bg-rose-700 transition-colors"
                              >
                                মুছুন
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteId(null)}
                                className="px-1.5 py-0.5 text-[10px] text-slate-500 hover:text-slate-800 cursor-pointer"
                              >
                                না
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(user.UserID)}
                              title="ইউজার ডিলিট করুন"
                              className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* যোগাযোগ ও বিবরণ তথ্য */}
                      <div className="mt-3.5 pt-3 border-t border-slate-100 space-y-1.5 text-xs text-slate-600">
                        {user.Phone && (
                          <div className="flex items-center justify-between group/line">
                            <div className="flex items-center space-x-2 font-mono text-[11px] text-slate-600 truncate">
                              <Phone className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                              <span>{user.Phone}</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleCopyText(user.Phone, `phone-${user.UserID}`)}
                              className="text-[10px] text-indigo-600 hover:underline flex items-center space-x-1 cursor-pointer opacity-0 group-hover/line:opacity-100 transition-opacity"
                              title="ফোন নম্বর কপি করুন"
                            >
                              {copiedId === `phone-${user.UserID}` ? (
                                <>
                                  <Check className="w-3 h-3 text-emerald-600" />
                                  <span className="text-emerald-600 font-bold">কপি হয়েছে</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3 h-3" />
                                  <span>কপি</span>
                                </>
                              )}
                            </button>
                          </div>
                        )}

                        {user.Email && (
                          <div className="flex items-center space-x-2 text-[11px] text-slate-600 truncate">
                            <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="truncate">{user.Email}</span>
                          </div>
                        )}

                        {user.Address && (
                          <div className="flex items-center space-x-2 text-[11px] text-slate-500 truncate">
                            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span className="truncate">{user.Address}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* ফুটার স্ট্রিপ: আইডি ও সুরক্ষিত পিন প্রিভিউ */}
                    <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                      <span className="bg-slate-100 px-2 py-0.5 rounded-md text-slate-600 font-semibold truncate max-w-[130px]">
                        {user.UserID}
                      </span>

                      <div className="flex items-center space-x-1.5">
                        <span className="font-sans text-slate-400">লগইন পিন:</span>
                        <span className="font-mono font-bold text-slate-700">
                          {revealedPinId === user.UserID ? user.PIN : '••••'}
                        </span>
                        <button
                          type="button"
                          onClick={() => setRevealedPinId(revealedPinId === user.UserID ? null : user.UserID)}
                          className="text-slate-400 hover:text-slate-600 cursor-pointer p-0.5"
                          title={revealedPinId === user.UserID ? "পিন লুকান" : "পিন দেখুন"}
                        >
                          {revealedPinId === user.UserID ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* ================= আধুনিক টেবিল ভিউ (Dense SaaS Table Mode) ================= */
            <div className="overflow-x-auto rounded-2xl border border-slate-200/90 shadow-2xs">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-black text-[11px] uppercase tracking-wider">
                  <tr>
                    <th className="p-3.5 pl-4">ব্যবহারকারী</th>
                    <th className="p-3.5">ভূমিকা (Role)</th>
                    <th className="p-3.5">যোগাযোগ</th>
                    <th className="p-3.5">ঠিকানা</th>
                    <th className="p-3.5">স্ট্যাটাস</th>
                    <th className="p-3.5 text-right pr-4">অ্যাকশন</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {filteredUsers.map((user) => {
                    const isCurrentActive = activeUser && (activeUser.UserID === user.UserID || (activeUser.Phone && activeUser.Phone === user.Phone));
                    const isInactive = user.Status === 'Inactive';
                    const roleConfig = getRoleConfig(user.Role);

                    return (
                      <tr
                        key={user.UserID}
                        className={`hover:bg-slate-50/80 transition-colors ${
                          isCurrentActive ? 'bg-indigo-50/30' : ''
                        }`}
                      >
                        {/* ব্যবহারকারী */}
                        <td className="p-3.5 pl-4">
                          <div className="flex items-center space-x-3">
                            <div className="w-9 h-9 rounded-xl overflow-hidden shrink-0 border border-slate-200 bg-slate-100 flex items-center justify-center">
                              {user.AvatarUrl ? (
                                <img
                                  src={formatImageUrl(user.AvatarUrl)}
                                  alt={user.FullName}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    e.currentTarget.style.display = 'none';
                                    const fallback = e.currentTarget.nextElementSibling;
                                    if (fallback) fallback.style.display = 'flex';
                                  }}
                                />
                              ) : null}
                              <div
                                style={{ display: user.AvatarUrl ? 'none' : 'flex' }}
                                className={`w-full h-full items-center justify-center font-bold text-xs text-white bg-gradient-to-br ${roleConfig.avatarGradient}`}
                              >
                                {(user.FullName || 'U').charAt(0).toUpperCase()}
                              </div>
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center space-x-1.5">
                                <span className="font-bold text-slate-900 truncate">
                                  {user.FullName}
                                </span>
                                {isCurrentActive && (
                                  <span className="px-1.5 py-0.2 rounded-md text-[9px] font-black bg-indigo-600 text-white">
                                    আপনি
                                  </span>
                                )}
                              </div>
                              <span className="font-mono text-[10px] text-slate-400 block">
                                {user.UserID}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* ভূমিকা */}
                        <td className="p-3.5 whitespace-nowrap">
                          {getRoleBadge(user.Role)}
                        </td>

                        {/* যোগাযোগ */}
                        <td className="p-3.5">
                          <div className="space-y-0.5 font-mono text-[11px] text-slate-600">
                            {user.Phone && (
                              <div className="flex items-center space-x-1">
                                <Phone className="w-3 h-3 text-indigo-500 shrink-0" />
                                <span>{user.Phone}</span>
                              </div>
                            )}
                            {user.Email && (
                              <div className="flex items-center space-x-1 font-sans text-slate-400 text-[10px]">
                                <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                                <span className="truncate max-w-[150px]">{user.Email}</span>
                              </div>
                            )}
                          </div>
                        </td>

                        {/* ঠিকানা */}
                        <td className="p-3.5 max-w-[180px] truncate text-slate-500 text-[11px]">
                          {user.Address || '-'}
                        </td>

                        {/* স্ট্যাটাস */}
                        <td className="p-3.5 whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(user)}
                            className={`px-2.5 py-1 rounded-full text-[10px] font-bold border transition-colors cursor-pointer flex items-center space-x-1 ${
                              isInactive
                                ? 'bg-rose-50 text-rose-700 border-rose-200'
                                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            }`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${isInactive ? 'bg-rose-500' : 'bg-emerald-500'}`} />
                            <span>{isInactive ? 'নিষ্ক্রিয়' : 'সক্রিয়'}</span>
                          </button>
                        </td>

                        {/* অ্যাকশন বাটনসমূহ */}
                        <td className="p-3.5 pr-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end space-x-1">
                            <button
                              type="button"
                              onClick={() => handleOpenEditUserForm(user)}
                              title="সম্পাদনা করুন"
                              className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleToggleStatus(user)}
                              title={isInactive ? 'সক্রিয় করুন' : 'নিষ্ক্রিয় করুন'}
                              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                isInactive ? 'text-emerald-600 hover:bg-emerald-50' : 'text-amber-600 hover:bg-amber-50'
                              }`}
                            >
                              <Power className="w-3.5 h-3.5" />
                            </button>

                            {confirmDeleteId === user.UserID ? (
                              <div className="inline-flex items-center space-x-1 bg-rose-50 p-1 rounded-lg border border-rose-200">
                                <button
                                  type="button"
                                  onClick={() => handleDeleteConfirm(user.UserID)}
                                  className="px-2 py-0.5 rounded text-[10px] font-black bg-rose-600 text-white cursor-pointer"
                                >
                                  মুছুন
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteId(null)}
                                  className="px-1 text-[10px] text-slate-500 cursor-pointer"
                                >
                                  না
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteId(user.UserID)}
                                title="মুছে ফেলুন"
                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
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
          )}
        </div>

        {/* ================= ৬. ফুটার স্ট্যাটাস ও ট্রাস্ট স্ট্রিপ ================= */}
        <div className="p-3 sm:p-4 bg-slate-50 border-t border-slate-200/90 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 shrink-0">
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-semibold text-slate-700">
              মোট {metrics.total} টি অ্যাকাউন্ট সংরক্ষিত • {metrics.active} সক্রিয় অ্যাকাউন্ট
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={handleOpenNewUserForm}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold transition-colors cursor-pointer border border-indigo-200"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>নতুন ইউজার</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 font-bold text-slate-700 transition-colors cursor-pointer text-xs"
            >
              বন্ধ করুন
            </button>
          </div>
        </div>
      </>
    )}
      </div>
    </div>
  );
}
