import React, { useState, useRef } from 'react';
import {
  X,
  User,
  Phone,
  Mail,
  MapPin,
  ArrowRight,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  UserPlus,
  LogIn,
  ShieldCheck,
  Loader2,
  Camera,
  Upload
} from 'lucide-react';
import { formatImageUrl } from '../services/storage';
import StoreLogo from './StoreLogo';

export default function AuthModal({
  isOpen,
  onClose,
  activeUser,
  settings = {},
  onLoginSuccess,
  onRegisterSuccess,
  onLogout,
}) {
  const [activeTab, setActiveTab] = useState('login'); // 'login' | 'register'
  const [loginMethod, setLoginMethod] = useState('phone'); // 'phone' | 'email'
  const [showPassword, setShowPassword] = useState(false);

  // লগইন ফর্ম স্টেট
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPin, setLoginPin] = useState('');

  // রেজিস্ট্রেশন ফর্ম স্টেট
  const [regFullName, setRegFullName] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPin, setRegPin] = useState('');
  const [regAddress, setRegAddress] = useState('');

  // রেজিস্ট্রেশন প্রোফাইল ছবি স্টেট
  const regFileInputRef = useRef(null);
  const [regAvatarPreview, setRegAvatarPreview] = useState('');
  const [regAvatarBase64, setRegAvatarBase64] = useState('');
  const [regAvatarMimeType, setRegAvatarMimeType] = useState('');

  // স্ট্যাটাস ও এরর
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  if (!isOpen) return null;

  const handleRegAvatarChange = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMessage('অনুগ্রহ করে একটি বৈধ ইমেজ ফাইল নির্বাচন করুন (JPG, PNG, WebP)।');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage('ছবির আকার সর্বোচ্চ ৫ মেগাবাইট (5MB) হতে পারবে।');
      return;
    }

    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const dataUrl = uploadEvent.target.result;
      setRegAvatarPreview(dataUrl);

      const parts = String(dataUrl).split(',');
      const meta = parts[0];
      const base64Data = parts[1] || '';
      const mimeMatch = meta.match(/:(.*?);/);
      const mime = mimeMatch ? mimeMatch[1] : file.type || 'image/jpeg';

      setRegAvatarBase64(base64Data);
      setRegAvatarMimeType(mime);
      setErrorMessage('');
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveRegAvatar = () => {
    setRegAvatarPreview('');
    setRegAvatarBase64('');
    setRegAvatarMimeType('');
    if (regFileInputRef.current) {
      regFileInputRef.current.value = '';
    }
  };

  // লগইন হ্যান্ডলার
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!loginIdentifier.trim()) {
      setErrorMessage(
        loginMethod === 'phone'
          ? 'অনুগ্রহ করে আপনার মোবাইল নম্বর লিখুন'
          : 'অনুগ্রহ করে আপনার ইমেইল ঠিকানা লিখুন'
      );
      return;
    }
    if (!loginPin.trim()) {
      setErrorMessage('অনুগ্রহ করে আপনার পাসওয়ার্ড বা পিন কোড লিখুন');
      return;
    }

    setIsLoading(true);
    try {
      if (onLoginSuccess) {
        await onLoginSuccess({
          identifier: loginIdentifier.trim(),
          pin: loginPin.trim(),
        });
      }
    } catch (err) {
      setErrorMessage(err.message || 'লগইন করতে সমস্যা হচ্ছে। সঠিক তথ্য প্রদান করুন।');
    } finally {
      setIsLoading(false);
    }
  };

  // সাইন-আপ হ্যান্ডলার
  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!regFullName.trim()) {
      setErrorMessage('আপনার পুরো নাম লিখুন');
      return;
    }
    if (!regPhone.trim()) {
      setErrorMessage('আপনার মোবাইল নম্বর লিখুন');
      return;
    }
    if (!regPin.trim() || regPin.trim().length < 4) {
      setErrorMessage('কমপক্ষে ৪ ডিজিটের পাসওয়ার্ড বা পিন দিন');
      return;
    }

    setIsLoading(true);
    try {
      if (onRegisterSuccess) {
        await onRegisterSuccess({
          FullName: regFullName.trim(),
          Phone: regPhone.trim(),
          Email: regEmail.trim(),
          PIN: regPin.trim(),
          Address: regAddress.trim(),
          AvatarUrl: regAvatarPreview,
          imageBase64: regAvatarBase64,
          imageMimeType: regAvatarMimeType,
        });
      }
    } catch (err) {
      setErrorMessage(err.message || 'রেজিস্ট্রেশন ব্যর্থ হয়েছে।');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl shadow-2xl border border-slate-200/90 max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* টপ হেডার ব্যানার (Modern Mesh Gradient Header) */}
        <div className="relative overflow-hidden bg-gradient-to-br from-indigo-700 via-indigo-600 to-violet-800 p-6 sm:p-7 text-white text-center">
          {/* ব্যাকগ্রাউন্ড অ্যাম্বিয়েন্ট গ্লো */}
          <div className="absolute -top-12 -right-12 w-36 h-36 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-violet-400/20 rounded-full blur-2xl pointer-events-none" />

          {/* ক্লোজ বাটন */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 text-white transition-all cursor-pointer z-10"
            title="বন্ধ করুন"
          >
            <X className="w-5 h-5" />
          </button>

          {/* স্টোর লোগো অথবা আইকন ব্যাজ */}
          <div className="relative inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/15 backdrop-blur-xl border border-white/25 shadow-lg shadow-black/10 mb-3.5 p-1 overflow-hidden">
            <StoreLogo
              url={settings?.LogoUrl || settings?.logoUrl}
              alt={settings?.StoreName || 'স্টোর লোগো'}
              className="w-full h-full object-contain rounded-xl bg-white/95 p-1 shadow-2xs"
              fallbackIcon={activeTab === 'login' ? LogIn : UserPlus}
              fallbackClassName="w-full h-full flex items-center justify-center"
              iconClassName="w-7 h-7 text-white"
            />
            <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-400 border-2 border-indigo-700" />
          </div>

          {settings?.StoreName && (
            <div className="inline-block px-3 py-0.5 rounded-full bg-white/15 backdrop-blur-md text-[11px] font-black uppercase tracking-wider text-amber-300 mb-1.5 border border-white/20">
              {settings.StoreName}
            </div>
          )}

          <h2 className="text-xl sm:text-2xl font-black tracking-tight">
            {activeTab === 'login' ? 'অ্যাকাউন্টে লগইন' : 'নতুন অ্যাকাউন্ট তৈরি'}
          </h2>
          <p className="text-xs text-indigo-100/90 mt-1 max-w-xs mx-auto font-medium">
            {activeTab === 'login'
              ? 'মোবাইল নম্বর অথবা ইমেইল দিয়ে সহজে লগইন করুন'
              : 'কয়েক সেকেন্ডে রেজিস্ট্রেশন করে সহজে অর্ডার ও ট্র্যাকিং করুন'}
          </p>

          {/* ট্যাব সুইচ: লগইন বনাম সাইন-আপ */}
          <div className="flex bg-black/25 p-1 rounded-2xl border border-white/15 max-w-xs mx-auto mt-5 backdrop-blur-md">
            <button
              type="button"
              onClick={() => {
                setActiveTab('login');
                setErrorMessage('');
              }}
              className={`flex-1 py-1.5 sm:py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center space-x-1.5 ${
                activeTab === 'login'
                  ? 'bg-white text-indigo-950 shadow-md scale-[1.02]'
                  : 'text-white/80 hover:text-white'
              }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>লগইন করুন</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('register');
                setErrorMessage('');
              }}
              className={`flex-1 py-1.5 sm:py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center space-x-1.5 ${
                activeTab === 'register'
                  ? 'bg-white text-indigo-950 shadow-md scale-[1.02]'
                  : 'text-white/80 hover:text-white'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>নতুন সাইন-আপ</span>
            </button>
          </div>
        </div>

        {/* এরর বা সাকসেস নোটিশ */}
        {errorMessage && (
          <div className="mx-6 mt-5 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-start space-x-2.5 animate-in slide-in-from-top-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="mx-6 mt-5 p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-start space-x-2.5 animate-in slide-in-from-top-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* কনটেন্ট বডি */}
        <div className="p-6 sm:p-7 space-y-5">
          {activeTab === 'login' ? (
            /* ================= আধুনিক লগইন ফর্ম ================= */
            <form onSubmit={handleLoginSubmit} className="space-y-4">

              {/* লগইন মাধ্যম নির্বাচন (মোবাইল নম্বর বনাম ইমেইল পিল সুইচ) */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-black text-slate-800">
                    লগইন মাধ্যম নির্বাচন করুন:
                  </span>
                  
                  {/* ডুয়েল মোড টগল পিল */}
                  <div className="inline-flex bg-slate-100 p-0.5 rounded-xl border border-slate-200 text-[11px] font-bold">
                    <button
                      type="button"
                      onClick={() => setLoginMethod('phone')}
                      className={`px-2.5 py-1 rounded-lg transition-all flex items-center space-x-1 cursor-pointer ${
                        loginMethod === 'phone'
                          ? 'bg-white text-indigo-700 shadow-2xs font-extrabold'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      <Phone className="w-3 h-3" />
                      <span>মোবাইল নম্বর</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setLoginMethod('email')}
                      className={`px-2.5 py-1 rounded-lg transition-all flex items-center space-x-1 cursor-pointer ${
                        loginMethod === 'email'
                          ? 'bg-white text-indigo-700 shadow-2xs font-extrabold'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      <Mail className="w-3 h-3" />
                      <span>ইমেইল</span>
                    </button>
                  </div>
                </div>

                {/* আইডেন্টিফায়ার ইনপুট */}
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    {loginMethod === 'phone' ? (
                      <Phone className="w-4 h-4 text-indigo-600" />
                    ) : (
                      <Mail className="w-4 h-4 text-indigo-600" />
                    )}
                  </div>
                  <input
                    type={loginMethod === 'email' ? 'email' : 'text'}
                    required
                    value={loginIdentifier}
                    onChange={(e) => setLoginIdentifier(e.target.value)}
                    placeholder={
                      loginMethod === 'phone'
                        ? 'যেমন: 01711XXXXXX'
                        : 'যেমন: user@example.com'
                    }
                    className="w-full pl-10 pr-4 py-3 bg-slate-50/80 border border-slate-200 rounded-2xl text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-600 transition-all font-medium"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1 pl-1">
                  {loginMethod === 'phone'
                    ? 'টিপস: নিবন্ধিত মোবাইল নম্বর লিখুন (যেমন: 017...)'
                    : 'টিপস: আপনার অনুমোদিত ইমেইল ঠিকানা লিখুন'}
                </p>
              </div>

              {/* পাসওয়ার্ড বা পিন ইনপুট */}
              <div>
                <label className="block text-xs font-black text-slate-800 mb-1.5 flex items-center gap-1">
                  <KeyRound className="w-3.5 h-3.5 text-indigo-600" />
                  <span>পাসওয়ার্ড বা পিন কোড</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <KeyRound className="w-4 h-4 text-indigo-600" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={loginPin}
                    onChange={(e) => setLoginPin(e.target.value)}
                    placeholder="আপনার পাসওয়ার্ড লিখুন..."
                    className="w-full pl-10 pr-11 py-3 bg-slate-50/80 border border-slate-200 rounded-2xl text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-600 transition-all font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-700 cursor-pointer"
                    title={showPassword ? 'পাসওয়ার্ড লুকান' : 'পাসওয়ার্ড দেখুন'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* প্রধান লগইন বাটন */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 px-4 rounded-2xl font-black text-xs sm:text-sm text-white bg-gradient-to-r from-indigo-600 via-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 active:scale-[0.99] transition-all shadow-lg shadow-indigo-600/25 hover:shadow-indigo-600/35 flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50 mt-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>লগইন হচ্ছে...</span>
                  </>
                ) : (
                  <>
                    <span>লগইন সম্পন্ন করুন</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              {/* সাইন-আপে যাওয়ার লিঙ্ক */}
              <div className="pt-2 text-center">
                <p className="text-xs text-slate-500 font-medium">
                  আপনার কি কোনো অ্যাকাউন্ট নেই?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('register');
                      setErrorMessage('');
                    }}
                    className="text-indigo-600 hover:text-indigo-800 font-bold hover:underline cursor-pointer ml-1 inline-flex items-center space-x-0.5"
                  >
                    <span>নতুন রেজিস্ট্রেশন করুন</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </p>
              </div>

            </form>
          ) : (
            /* ================= আধুনিক রেজিস্ট্রেশন ফর্ম ================= */
            <form onSubmit={handleRegisterSubmit} className="space-y-3.5">

              {/* প্রোফাইল ছবি নির্বাচন (ঐচ্ছিক অবতার আপলোড) */}
              <div className="p-3 bg-gradient-to-r from-slate-50 to-indigo-50/40 rounded-2xl border border-indigo-100 flex items-center space-x-3.5">
                <div className="relative group shrink-0">
                  <div className="w-14 h-14 rounded-2xl overflow-hidden border-2 border-white shadow-sm bg-indigo-50 flex items-center justify-center relative">
                    {regAvatarPreview ? (
                      <img
                        src={regAvatarPreview}
                        alt="Avatar Preview"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User className="w-7 h-7 text-indigo-600 opacity-80" />
                    )}
                    <button
                      type="button"
                      onClick={() => regFileInputRef.current && regFileInputRef.current.click()}
                      className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white cursor-pointer rounded-2xl"
                      title="ছবি নির্বাচন করুন"
                    >
                      <Camera className="w-4 h-4" />
                    </button>
                  </div>
                  {regAvatarPreview && (
                    <button
                      type="button"
                      onClick={handleRemoveRegAvatar}
                      className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-600 text-white flex items-center justify-center text-[10px] shadow-xs cursor-pointer hover:bg-rose-700"
                      title="ছবি মুছুন"
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-1.5 text-xs font-black text-slate-800">
                    <Camera className="w-3.5 h-3.5 text-indigo-600" />
                    <span>প্রোফাইল ছবি (Profile Avatar)</span>
                    <span className="text-[10px] font-normal text-slate-400">(ঐচ্ছিক)</span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    আপনার ছবি গুগল ড্রাইভে সংরক্ষিত হবে
                  </p>
                  <div className="mt-1.5 flex items-center space-x-2">
                    <input
                      type="file"
                      ref={regFileInputRef}
                      accept="image/*"
                      onChange={handleRegAvatarChange}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => regFileInputRef.current && regFileInputRef.current.click()}
                      className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-white hover:bg-indigo-50 text-indigo-700 border border-indigo-200 text-[11px] font-bold shadow-2xs cursor-pointer transition-colors"
                    >
                      <Upload className="w-3 h-3" />
                      <span>{regAvatarPreview ? 'ছবি পরিবর্তন' : 'ছবি আপলোড'}</span>
                    </button>
                    {regAvatarPreview && (
                      <button
                        type="button"
                        onClick={handleRemoveRegAvatar}
                        className="text-[11px] font-bold text-rose-600 hover:underline cursor-pointer"
                      >
                        মুছে ফেলুন
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* পুরো নাম */}
              <div>
                <label className="block text-xs font-black text-slate-800 mb-1 flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-indigo-600" />
                  <span>আপনার পুরো নাম <span className="text-rose-500">*</span></span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={regFullName}
                    onChange={(e) => setRegFullName(e.target.value)}
                    placeholder="আপনার পুরো নাম লিখুন"
                    className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50/80 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-600 transition-all font-medium"
                  />
                </div>
              </div>

              {/* মোবাইল নম্বর */}
              <div>
                <label className="block text-xs font-black text-slate-800 mb-1 flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-indigo-600" />
                  <span>মোবাইল নম্বর <span className="text-rose-500">*</span></span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Phone className="w-4 h-4" />
                  </div>
                  <input
                    type="tel"
                    required
                    value={regPhone}
                    onChange={(e) => setRegPhone(e.target.value)}
                    placeholder="01711XXXXXX"
                    className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50/80 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-600 transition-all font-mono"
                  />
                </div>
              </div>

              {/* ইমেইল (ঐচ্ছিক) */}
              <div>
                <label className="block text-xs font-black text-slate-800 mb-1 flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5 text-indigo-600" />
                  <span>ইমেইল ঠিকানা <span className="text-slate-400 font-normal">(ঐচ্ছিক)</span></span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="customer@example.com"
                    className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50/80 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-600 transition-all font-medium"
                  />
                </div>
              </div>

              {/* পাসওয়ার্ড বা পিন */}
              <div>
                <label className="block text-xs font-black text-slate-800 mb-1 flex items-center gap-1">
                  <KeyRound className="w-3.5 h-3.5 text-indigo-600" />
                  <span>পাসওয়ার্ড বা ৪-সংখ্যার পিন <span className="text-rose-500">*</span></span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={4}
                    value={regPin}
                    onChange={(e) => setRegPin(e.target.value)}
                    placeholder="কমপক্ষে ৪ সংখ্যার পাসওয়ার্ড দিন"
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-50/80 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-600 transition-all font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-700 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* ডেলিভারি ঠিকানা */}
              <div>
                <label className="block text-xs font-black text-slate-800 mb-1 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-indigo-600" />
                  <span>ডেলিভারি ঠিকানা</span>
                </label>
                <div className="relative">
                  <div className="absolute top-3 left-3.5 flex items-start pointer-events-none text-slate-400">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <textarea
                    rows={2}
                    value={regAddress}
                    onChange={(e) => setRegAddress(e.target.value)}
                    placeholder="বাড়ি নং, রোড নং, এলাকা, থানা, জেলা"
                    className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50/80 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-600 transition-all resize-none font-medium"
                  />
                </div>
              </div>

              {/* সাইন-আপ বাটন */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 px-4 rounded-2xl font-black text-xs sm:text-sm text-white bg-gradient-to-r from-indigo-600 via-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 active:scale-[0.99] transition-all shadow-lg shadow-indigo-600/25 hover:shadow-indigo-600/35 flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50 mt-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>অ্যাকাউন্ট তৈরি হচ্ছে...</span>
                  </>
                ) : (
                  <>
                    <span>অ্যাকাউন্ট তৈরি করুন ও লগইন হোন</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              {/* লগইনে ফিরে যাওয়ার লিঙ্ক */}
              <div className="pt-2 text-center">
                <p className="text-xs text-slate-500 font-medium">
                  ইতিমধ্যে অ্যাকাউন্ট রয়েছে?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('login');
                      setErrorMessage('');
                    }}
                    className="text-indigo-600 hover:text-indigo-800 font-bold hover:underline cursor-pointer ml-1 inline-flex items-center space-x-0.5"
                  >
                    <span>সরাসরি লগইন করুন</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </p>
              </div>

            </form>
          )}

          {/* নিরাপত্তা ও এনক্রিপশন ট্রাস্ট ফুটার */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-center space-x-1.5 text-[11px] text-slate-400 font-medium">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>নিরাপদ ও এনক্রিপ্টেড সংযোগ (256-bit SSL Protected)</span>
          </div>

          {/* বর্তমান লগইন স্ট্যাটাস যদি থাকে */}
          {activeUser && activeUser.Role && (
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <div className="flex items-center space-x-2 min-w-0">
                {activeUser.AvatarUrl ? (
                  <img
                    src={formatImageUrl(activeUser.AvatarUrl)}
                    alt={activeUser.FullName || 'User'}
                    className="w-6 h-6 rounded-full object-cover border border-slate-200 shrink-0 shadow-2xs"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                ) : (
                  <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                )}
                <span className="truncate max-w-[190px] sm:max-w-[230px]">
                  বর্তমানে লগইন: <strong className="text-slate-800">{activeUser.FullName || activeUser.Email}</strong>
                </span>
              </div>
              <button
                type="button"
                onClick={onLogout}
                className="text-rose-600 hover:underline font-bold text-[11px] cursor-pointer shrink-0 ml-2"
              >
                লগআউট
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
