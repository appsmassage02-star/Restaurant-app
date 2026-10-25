import React, { useState } from 'react';
import {
  Clock,
  XCircle,
  CheckCircle2,
  Store,
  Phone,
  Mail,
  MapPin,
  HelpCircle,
  ArrowRight,
  RefreshCw,
  ShieldAlert,
  LogOut,
  Database,
  Building,
  AlertTriangle,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

interface RegistrationStatusPageProps {
  onEnterDashboard: () => void;
  onGoToRegister?: () => void;
}

export const RegistrationStatusPage: React.FC<RegistrationStatusPageProps> = ({
  onEnterDashboard,
  onGoToRegister,
}) => {
  const {
    restaurant,
    owner,
    user,
    hasRestaurant,
    refreshRestaurant,
    logout,
  } = useApp();

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshMessage, setRefreshMessage] = useState('');

  const isPending = restaurant.registrationStatus === 'PENDING';
  const isRejected = restaurant.registrationStatus === 'REJECTED';
  const isApproved = restaurant.registrationStatus === 'APPROVED';
  const isNotRegistered = restaurant.registrationStatus === 'NOT_REGISTERED' || !hasRestaurant;

  const handleRefresh = async () => {
    setIsRefreshing(true);
    setRefreshMessage('');
    try {
      await refreshRestaurant();
      setRefreshMessage('تم تحديث حالة المطعم بنجاح من قاعدة البيانات.');
    } catch {
      setRefreshMessage('تعذر تحديث البيانات من الخادم.');
    } finally {
      setIsRefreshing(false);
      setTimeout(() => setRefreshMessage(''), 4000);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 py-10 px-4 sm:px-6 lg:px-8 flex items-center justify-center font-['Cairo',sans-serif]">
      <div className="max-w-2xl w-full bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Status Top Banner */}
        <div
          className={`p-6 sm:p-8 text-white text-center relative ${
            isNotRegistered
              ? 'bg-gradient-to-l from-slate-700 to-slate-800'
              : isPending
              ? 'bg-gradient-to-l from-amber-600 to-amber-700'
              : isRejected
              ? 'bg-gradient-to-l from-rose-600 to-rose-700'
              : 'bg-gradient-to-l from-emerald-600 to-emerald-700'
          }`}
        >
          <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl mx-auto flex items-center justify-center mb-3">
            {isNotRegistered && <Building className="w-8 h-8 text-white" />}
            {isPending && <Clock className="w-8 h-8 text-white animate-spin-slow" />}
            {isRejected && <XCircle className="w-8 h-8 text-white" />}
            {isApproved && <CheckCircle2 className="w-8 h-8 text-white" />}
          </div>

          <h1 className="text-2xl font-black">
            {isNotRegistered && 'لا يوجد مطعم مرتبط بهذا الحساب بعد'}
            {isPending && 'طلب تسجيل المطعم قيد المراجعة الإدارية'}
            {isRejected && 'عذرًا، تم رفض طلب تسجيل المطعم'}
            {isApproved && 'تم قبول واعتماد المطعم رسميًا!'}
          </h1>

          <p className="text-white/80 text-xs mt-1 max-w-md mx-auto">
            {isNotRegistered && 'تم توثيق حسابك في Supabase Auth، ولكن لم يتم ربط سجل مطعم بحسابك حتى الآن.'}
            {isPending && 'يقوم فريق إدارة طلبات البيت بمراجعة بيانات وتراخيص المطعم وعقد الاتفاق.'}
            {isRejected && 'يرجى مراجعة سبب الرفض المسجل أدناه والتواصل مع الإدارة أو تقديم طلب جديد.'}
            {isApproved && 'المطعم معتمد في قاعدة البيانات ويمكنك الآن الدخول إلى لوحة الإدارة.'}
          </p>
        </div>

        {/* Content Body */}
        <div className="p-6 sm:p-8 space-y-6 text-xs">
          {refreshMessage && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>{refreshMessage}</span>
            </div>
          )}

          {/* Not Registered prompt */}
          {isNotRegistered && (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
              <h3 className="font-bold text-slate-800 text-sm">ابدأ بتسجيل مطعمك الآن:</h3>
              <p className="text-slate-600 leading-relaxed">
                حسابك مسجل في المنظومة بمعرف المستخدم: <code className="font-mono text-slate-800 font-bold">{user?.id}</code>. للبدء، قم بتعبئة بيانات مطعمك لربط السجل رسميًا عبر <code className="font-mono text-slate-800">restaurants.owner_user_id</code>.
              </p>
              {onGoToRegister && (
                <button
                  onClick={onGoToRegister}
                  className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl shadow-xs transition-colors"
                >
                  تعبئة نموذج تسجيل المطعم &larr;
                </button>
              )}
            </div>
          )}

          {/* Rejection alert box if rejected */}
          {isRejected && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl">
              <div className="flex items-center gap-2 text-rose-800 font-bold text-sm mb-1.5">
                <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
                <span>سبب الرفض المسجل في قاعدة البيانات:</span>
              </div>
              <p className="text-xs text-rose-700 leading-relaxed font-semibold">
                {restaurant.rejectionReason || 'نقص في مستندات السجل التجاري والمطابقة الصحية أو عدم تطابق العنوان المسجل.'}
              </p>
              <div className="mt-3 pt-2 border-t border-rose-200/60 text-[11px] text-rose-600 flex items-center justify-between">
                <span>تاريخ الفحص الإداري: {restaurant.registrationDate ? new Date(restaurant.registrationDate).toLocaleDateString('ar-EG') : '—'}</span>
                <span className="font-bold">يرجى التواصل مع إدارة طلبات البيت</span>
              </div>
            </div>
          )}

          {/* Pending timeline if pending */}
          {isPending && (
            <div className="p-4 bg-amber-50/70 border border-amber-200/80 rounded-2xl space-y-3">
              <h3 className="text-xs font-bold text-amber-900">مراحل المراجعة والاعتماد الرسمية:</h3>
              <div className="space-y-2 text-xs">
                <div className="flex items-center gap-2.5 text-emerald-700 font-semibold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>1. تم تسجيل المطعم بنجاح في قاعدة البيانات (الحالة: Pending)</span>
                </div>
                <div className="flex items-center gap-2.5 text-amber-800 font-bold">
                  <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>2. مراجعة وتدقيق المستندات والتراخيص ونطاق التغطية</span>
                </div>
                <div className="flex items-center gap-2.5 text-slate-400">
                  <span className="w-4 h-4 rounded-full border border-slate-300 flex items-center justify-center text-[10px]">3</span>
                  <span>3. اعتماد نسبة العمولة وتفعيل استقبال الطلبات</span>
                </div>
              </div>
              <p className="text-[11px] text-slate-500 pt-1 border-t border-amber-200/60">
                عند قيام الإدارة بتحديث حالة المطعم إلى Approved في قاعدة البيانات، ستتمكن من الدخول للوحة التحكم فورًا.
              </p>
            </div>
          )}

          {/* Submitted Restaurant & Owner Overview from Real Data */}
          {hasRestaurant && (
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-3">
              <h4 className="font-bold text-slate-800 flex items-center gap-2 border-b border-slate-200 pb-2">
                <Store className="w-4 h-4 text-amber-600" />
                بيانات المطعم الفعلية المسجلة
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <span className="text-slate-500 block text-[11px]">اسم المطعم:</span>
                  <span className="font-bold text-slate-900 text-sm">{restaurant.name}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">معرف المطعم (id):</span>
                  <span className="font-mono text-slate-700 text-[11px] truncate block">{restaurant.id}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">مالك المطعم:</span>
                  <span className="font-bold text-slate-900">{owner.fullName}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">هاتف المطعم:</span>
                  <span className="font-mono text-slate-800 dir-ltr text-right">{restaurant.phone || '—'}</span>
                </div>
                <div className="sm:col-span-2">
                  <span className="text-slate-500 block text-[11px]">العنوان والموقع:</span>
                  <span className="font-medium text-slate-800">{restaurant.address || '—'}</span>
                </div>
              </div>
            </div>
          )}

          {/* Real Supabase Refresh Card */}
          <div className="p-4 bg-slate-100 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-slate-700">
              <Database className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                التحقق اللحظي من حالة الاعتماد في Supabase:
              </span>
            </div>

            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="px-4 py-2 bg-white hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl border border-slate-300 shadow-2xs flex items-center gap-1.5 transition-colors disabled:opacity-60 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>{isRefreshing ? 'جاري الفحص...' : 'تحديث الحالة الآن'}</span>
            </button>
          </div>

          {/* Action Footer */}
          <div className="pt-2 flex items-center justify-between gap-3 border-t border-slate-100">
            <button
              onClick={logout}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 font-bold text-xs flex items-center gap-1.5"
            >
              <LogOut className="w-4 h-4 text-slate-500" />
              <span>تسجيل الخروج</span>
            </button>

            {isApproved ? (
              <button
                onClick={onEnterDashboard}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-emerald-600/25 cursor-pointer"
              >
                <span>الانتقال إلى لوحة تحكم المطعم &larr;</span>
              </button>
            ) : (
              <span className="text-[11px] text-slate-400 font-medium">
                لوحة التحكم مغلقة حتى يتم اعتماد السجل في قاعدة البيانات
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
