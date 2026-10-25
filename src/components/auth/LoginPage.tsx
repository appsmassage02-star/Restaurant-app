import React, { useState } from 'react';
import {
  Store,
  Mail,
  Lock,
  Eye,
  EyeOff,
  LogIn,
  UserPlus,
  AlertCircle,
  CheckCircle2,
  HelpCircle,
  X,
  Loader2,
  AlertTriangle,
  Info,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

interface LoginPageProps {
  onGoToRegister: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onGoToRegister }) => {
  const { login, resetPassword, isSupabaseReady } = useApp();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Forgot password modal
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSubmitted, setForgotSubmitted] = useState(false);
  const [forgotError, setForgotError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!isSupabaseReady) {
      setErrorMessage(
        'خدمة Supabase غير مكونة بعد في بيئة التشغيل. يرجى إضافة VITE_SUPABASE_URL و VITE_SUPABASE_ANON_KEY.'
      );
      return;
    }

    if (!email.trim() || !email.includes('@')) {
      setErrorMessage('يرجى إدخال بريد إلكتروني صالح.');
      return;
    }
    if (!password.trim() || password.length < 6) {
      setErrorMessage('كلمة المرور يجب أن لا تقل عن 6 أحرف أو أرقام.');
      return;
    }

    setIsLoading(true);
    try {
      const result = await login(email, password);
      if (result.success) {
        setSuccessMessage('تم تسجيل الدخول بنجاح! جاري تحويلك...');
      } else {
        setErrorMessage(result.error || 'فشل تسجيل الدخول. يرجى التأكد من البيانات.');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'حدث خطأ أثناء محاولة الاتصال بخدمة المصادقة.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError('');

    if (!forgotEmail.trim() || !forgotEmail.includes('@')) {
      setForgotError('يرجى إدخال بريد إلكتروني صالح.');
      return;
    }

    setForgotLoading(true);
    try {
      const result = await resetPassword(forgotEmail);
      if (result.success) {
        setForgotSubmitted(true);
      } else {
        setForgotError(result.error || 'تعذر إرسال رابط الاستعادة.');
      }
    } catch (err: any) {
      setForgotError(err?.message || 'فشل إرسال طلب استعادة كلمة المرور.');
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-amber-950 flex items-center justify-center p-4 sm:p-6 lg:p-8 font-['Cairo',sans-serif]">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100">
        {/* Top Header Banner */}
        <div className="bg-gradient-to-l from-amber-600 via-amber-500 to-amber-600 p-6 sm:p-8 text-white text-center relative">
          <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl mx-auto flex items-center justify-center mb-3 shadow-inner">
            <Store className="w-9 h-9 text-white" />
          </div>
          <h1 className="text-2xl font-black tracking-tight">تطبيق المطاعم</h1>
          <p className="text-amber-100 text-xs mt-1 font-medium">
            منظومة طلبات البيت — بوابة إدارة المطاعم الشريكة
          </p>
        </div>

        {/* Form Body */}
        <div className="p-6 sm:p-8">
          <div className="mb-6 text-center">
            <h2 className="text-lg font-bold text-slate-800">تسجيل الدخول للمطعم</h2>
            <p className="text-xs text-slate-500 mt-1">
              المصادقة الرسمية عبر Supabase Auth
            </p>
          </div>

          {/* Missing Supabase Env Notice */}
          {!isSupabaseReady && (
            <div className="mb-4 p-3.5 bg-amber-50 border border-amber-300 rounded-2xl flex items-start gap-2.5 text-amber-900 text-xs leading-relaxed">
              <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
              <div>
                <p className="font-bold">تنبيه إعدادات الاتصال:</p>
                <p className="mt-0.5 text-amber-800 text-[11px]">
                  يتطلب التطبيق توفير <code className="font-mono font-bold bg-amber-100 px-1 rounded">VITE_SUPABASE_URL</code> و <code className="font-mono font-bold bg-amber-100 px-1 rounded">VITE_SUPABASE_ANON_KEY</code> للاتصال الفعلي بقاعدة بيانات ومصادقة Supabase.
                </p>
              </div>
            </div>
          )}

          {errorMessage && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-rose-700 text-xs font-semibold">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-emerald-700 text-xs font-semibold">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{successMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                البريد الإلكتروني *
              </label>
              <div className="relative">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setErrorMessage('');
                  }}
                  placeholder="name@restaurant.com"
                  className="w-full pl-4 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white transition-all text-left dir-ltr"
                />
                <Mail className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-700">كلمة المرور *</label>
                <button
                  type="button"
                  onClick={() => setShowForgotModal(true)}
                  className="text-xs font-semibold text-amber-600 hover:text-amber-700 hover:underline"
                >
                  نسيت كلمة المرور؟
                </button>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setErrorMessage('');
                  }}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white transition-all text-left dir-ltr"
                />
                <Lock className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-3.5 top-3 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-slate-600 select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 border-slate-300"
                />
                <span>تذكر تسجيل الدخول</span>
              </label>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-3 px-4 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 disabled:opacity-60 text-slate-950 font-black rounded-xl shadow-md shadow-amber-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>جاري تسجيل الدخول...</span>
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>تسجيل الدخول</span>
                </>
              )}
            </button>
          </form>

          {/* Create new account link */}
          <div className="mt-6 pt-5 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-600">
              صاحب مطعم جديد وتريد الانضمام لطلبات البيت؟
            </p>
            <button
              onClick={onGoToRegister}
              className="mt-2 text-xs font-bold text-amber-600 hover:text-amber-700 inline-flex items-center gap-1 hover:underline"
            >
              <UserPlus className="w-4 h-4" />
              <span>إنشاء حساب وتسجيل مطعم جديد الآن &larr;</span>
            </button>
          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 relative text-right">
            <button
              onClick={() => {
                setShowForgotModal(false);
                setForgotSubmitted(false);
                setForgotError('');
              }}
              className="absolute left-4 top-4 p-1 text-slate-400 hover:text-slate-600 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-xl flex items-center justify-center mb-3">
              <HelpCircle className="w-6 h-6" />
            </div>

            <h3 className="text-base font-bold text-slate-900 mb-1">استعادة كلمة المرور</h3>
            <p className="text-xs text-slate-500 mb-4 leading-relaxed">
              أدخل البريد الإلكتروني وسيرسل Supabase Auth رابط تعيين كلمة المرور إلى بريدك.
            </p>

            {forgotError && (
              <div className="mb-3 p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-bold">
                {forgotError}
              </div>
            )}

            {forgotSubmitted ? (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-semibold space-y-1">
                <p className="flex items-center gap-1.5 font-bold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  تم إرسال رابط الاستعادة بنجاح!
                </p>
                <p className="text-[11px] text-emerald-700">
                  تفقّد صندوق الوارد في {forgotEmail} لإعادة التعيين.
                </p>
              </div>
            ) : (
              <form onSubmit={handleForgotSubmit} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    البريد الإلكتروني المسجل
                  </label>
                  <input
                    type="email"
                    required
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="name@restaurant.com"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 text-left dir-ltr"
                  />
                </div>
                <button
                  type="submit"
                  disabled={forgotLoading}
                  className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-60 font-bold text-slate-950 text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5"
                >
                  {forgotLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>إرسال رابط الاستعادة</span>
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
