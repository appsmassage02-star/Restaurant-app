import React, { useState } from 'react';
import {
  User,
  Phone,
  Mail,
  Lock,
  ShieldCheck,
  CheckCircle,
  AlertCircle,
  HelpCircle,
  LogOut,
  Save,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const ProfileView: React.FC = () => {
  const { owner, updateOwner, logout } = useApp();

  const [fullName, setFullName] = useState(owner.fullName);
  const [phone, setPhone] = useState(owner.phone);
  const [email, setEmail] = useState(owner.email);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [profileSaved, setProfileSaved] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  const handleUpdateProfile = (e: React.FormEvent) => {
    e.preventDefault();
    updateOwner({ fullName, phone, email });
    setProfileSaved(true);
    setTimeout(() => setProfileSaved(false), 3000);
  };

  const handlePasswordChange = (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    if (!currentPassword) {
      setPasswordError('يرجى إدخال كلمة المرور الحالية.');
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError('كلمة المرور الجديدة يجب ألا تقل عن 6 أحرف.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('كلمتا المرور غير متطابقتين.');
      return;
    }

    setPasswordSuccess(true);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setTimeout(() => setPasswordSuccess(false), 3000);
  };

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div>
        <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
          <User className="w-5 h-5 text-amber-500" />
          الملف الشخصي لمالك المطعم
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          إدارة بيانات الحساب الرئيسي المخول بإدارة العمليات والماليات
        </p>
      </div>

      {/* Owner Single Account Info Banner */}
      <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3 text-xs text-amber-900">
        <ShieldCheck className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
        <div>
          <h4 className="font-bold">سياسة إدارة الحساب للمرحلة الأولى:</h4>
          <p className="mt-0.5 leading-relaxed text-amber-800">
            لكل مطعم شريك حساب مالك رئيسي واحد فقط في هذا الإصدار، ويملك المالك كامل الصلاحيات لتعديل المنيو والأسعار وتتبع الحسابات واستقبال الطلبات.
          </p>
        </div>
      </div>

      {/* Owner Profile Form */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2">
          بيانات المالك الشخصية
        </h3>

        {profileSaved && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-emerald-800 text-xs font-bold">
            <CheckCircle className="w-4 h-4 text-emerald-600" />
            <span>تم حفظ البيانات الشخصية بنجاح!</span>
          </div>
        )}

        <form onSubmit={handleUpdateProfile} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-700 font-bold mb-1">الاسم الكامل *</label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-amber-500 focus:bg-white font-bold"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-700 font-bold mb-1">رقم الهاتف *</label>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-left dir-ltr focus:ring-2 focus:ring-amber-500 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">البريد الإلكتروني *</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-left dir-ltr focus:ring-2 focus:ring-amber-500 focus:bg-white"
              />
            </div>
          </div>

          <div className="flex justify-end pt-1">
            <button
              type="submit"
              className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-xs"
            >
              <Save className="w-4 h-4" />
              <span>حفظ البيانات</span>
            </button>
          </div>
        </form>
      </div>

      {/* Security & Password */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2 flex items-center gap-2">
          <Lock className="w-4 h-4 text-amber-600" />
          تغيير كلمة المرور
        </h3>

        {passwordSuccess && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-emerald-800 text-xs font-bold">
            <CheckCircle className="w-4 h-4 text-emerald-600" />
            <span>تم تغيير كلمة المرور بنجاح!</span>
          </div>
        )}

        {passwordError && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-rose-700 text-xs font-bold">
            <AlertCircle className="w-4 h-4 text-rose-600" />
            <span>{passwordError}</span>
          </div>
        )}

        <form onSubmit={handlePasswordChange} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-700 font-bold mb-1">كلمة المرور الحالية</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-left dir-ltr"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-700 font-bold mb-1">كلمة المرور الجديدة</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-left dir-ltr"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">تأكيد كلمة المرور الجديدة</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-left dir-ltr"
              />
            </div>
          </div>

          <div className="flex justify-end pt-1">
            <button
              type="submit"
              className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl text-xs flex items-center gap-1.5"
            >
              <span>تحديث كلمة المرور</span>
            </button>
          </div>
        </form>
      </div>

      {/* Logout button */}
      <div className="pt-2 flex justify-start">
        <button
          onClick={logout}
          className="px-5 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs rounded-xl border border-rose-200 flex items-center gap-2 transition-colors cursor-pointer"
        >
          <LogOut className="w-4 h-4 text-rose-600" />
          <span>تسجيل الخروج من الحساب</span>
        </button>
      </div>
    </div>
  );
};
