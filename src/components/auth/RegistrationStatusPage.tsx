import React from 'react';
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
  RotateCcw,
  ShieldAlert,
  Sliders,
  LogOut,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

interface RegistrationStatusPageProps {
  onEnterDashboard: () => void;
  onEditApplication?: () => void;
}

export const RegistrationStatusPage: React.FC<RegistrationStatusPageProps> = ({
  onEnterDashboard,
}) => {
  const {
    restaurant,
    owner,
    setRegistrationStatus,
    logout,
  } = useApp();

  const isPending = restaurant.registrationStatus === 'PENDING';
  const isRejected = restaurant.registrationStatus === 'REJECTED';
  const isApproved = restaurant.registrationStatus === 'APPROVED';

  return (
    <div className="min-h-screen bg-slate-900 py-10 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
      <div className="max-w-2xl w-full bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Status Top Banner */}
        <div
          className={`p-6 sm:p-8 text-white text-center relative ${
            isPending
              ? 'bg-gradient-to-l from-amber-600 to-amber-700'
              : isRejected
              ? 'bg-gradient-to-l from-rose-600 to-rose-700'
              : 'bg-gradient-to-l from-emerald-600 to-emerald-700'
          }`}
        >
          <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl mx-auto flex items-center justify-center mb-3">
            {isPending && <Clock className="w-8 h-8 text-white animate-spin-slow" />}
            {isRejected && <XCircle className="w-8 h-8 text-white" />}
            {isApproved && <CheckCircle2 className="w-8 h-8 text-white" />}
          </div>

          <h1 className="text-2xl font-black">
            {isPending && 'طلب تسجيل المطعم قيد المراجعة'}
            {isRejected && 'عذرًا، تم رفض طلب التسجيل'}
            {isApproved && 'تم قبول واعتماد المطعم بنجاح!'}
          </h1>

          <p className="text-white/80 text-xs mt-1 max-w-md mx-auto">
            {isPending && 'يقوم فريق الجودة والعمليات في طلبات البيت بمراجعة بيانات المطعم وعقد الاتفاق.'}
            {isRejected && 'يرجى مراجعة سبب الرفض أدناه وإعادة تحديث البيانات أو التواصل مع الإدارة.'}
            {isApproved && 'أهلاً بك شريكًا في طلبات البيت! يمكنك الآن الدخول والبدء في إدارة منيو مطعمك واستقبال الطلبات.'}
          </p>
        </div>

        {/* Content Body */}
        <div className="p-6 sm:p-8 space-y-6">
          {/* Rejection alert box if rejected */}
          {isRejected && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl">
              <div className="flex items-center gap-2 text-rose-800 font-bold text-sm mb-1.5">
                <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
                <span>سبب الرفض المسجل من قِبل الإدارة:</span>
              </div>
              <p className="text-xs text-rose-700 leading-relaxed font-semibold">
                {restaurant.rejectionReason || 'نقص في مستندات السجل التجاري والمطابقة الصحية أو عدم تطابق العنوان المسجل.'}
              </p>
              <div className="mt-3 pt-2 border-t border-rose-200/60 text-[11px] text-rose-600 flex items-center justify-between">
                <span>تاريخ الفحص الإداري: {new Date(restaurant.registrationDate).toLocaleDateString('ar-EG')}</span>
                <span className="font-bold underline cursor-pointer">تقديم التماس إداري</span>
              </div>
            </div>
          )}

          {/* Pending timeline if pending */}
          {isPending && (
            <div className="p-4 bg-amber-50/70 border border-amber-200/80 rounded-2xl space-y-3">
              <h3 className="text-xs font-bold text-amber-900">مراحل المراجعة والاعتماد المتبقية:</h3>
              <div className="space-y-2 text-xs">
                <div className="flex items-center gap-2.5 text-emerald-700 font-semibold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>1. تم استلام طلب التسجيل والبيانات الأولية بنجاح</span>
                </div>
                <div className="flex items-center gap-2.5 text-amber-800 font-bold">
                  <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>2. مراجعة وتدقيق المستندات والتراخيص ونطاق التوصيل (جاري الفحص)</span>
                </div>
                <div className="flex items-center gap-2.5 text-slate-400">
                  <span className="w-4 h-4 rounded-full border border-slate-300 flex items-center justify-center text-[10px]">3</span>
                  <span>3. إبرام اتفاقية التشغيل واعتماد نسبة العمولة (10%)</span>
                </div>
                <div className="flex items-center gap-2.5 text-slate-400">
                  <span className="w-4 h-4 rounded-full border border-slate-300 flex items-center justify-center text-[10px]">4</span>
                  <span>4. تفعيل حساب إدارة المنيو والطلبات رسميًا</span>
                </div>
              </div>
              <p className="text-[11px] text-slate-500 pt-1 border-t border-amber-200/60">
                الوقت المقدر للمراجعة: من 12 إلى 24 ساعة عمل. سيصلك إشعار بالنتيجة.
              </p>
            </div>
          )}

          {/* Submitted Restaurant & Owner Overview */}
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-3 text-xs">
            <h4 className="font-bold text-slate-800 flex items-center gap-2 border-b border-slate-200 pb-2">
              <Store className="w-4 h-4 text-amber-600" />
              تفاصيل المطعم المسجل
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <span className="text-slate-500 block">اسم المطعم:</span>
                <span className="font-bold text-slate-900 text-sm">{restaurant.name}</span>
              </div>
              <div>
                <span className="text-slate-500 block">صاحب الحساب:</span>
                <span className="font-bold text-slate-900">{owner.fullName}</span>
              </div>
              <div>
                <span className="text-slate-500 block">الهاتف والبريد:</span>
                <span className="font-medium text-slate-800 dir-ltr text-right">
                  {restaurant.phone} | {owner.email}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">المنطقة والنطاق:</span>
                <span className="font-medium text-slate-800">
                  {restaurant.city}، {restaurant.governorate} ({restaurant.deliveryRadiusKm} كم)
                </span>
              </div>
            </div>
          </div>

          {/* Interactive Simulation Switcher Box for Reviewers */}
          <div className="p-4 bg-slate-900 text-white rounded-2xl border border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                <Sliders className="w-4 h-4 text-amber-400" />
                محاكي فحص حالات التسجيل (خاص باختبار الواجهة):
              </span>
              <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded">
                المرحلة الأولى
              </span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              وفقًا للشروط، لا يمكن الانتقال للوحة التحكم إلا إذا كان الحساب معتمدًا. يمكنك تبديل الحالة هنا لاختبار كافة الشاشات:
            </p>

            <div className="grid grid-cols-3 gap-2 pt-1">
              <button
                onClick={() => setRegistrationStatus('APPROVED')}
                className={`py-2 px-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
                  isApproved
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>محاكاة الاعتماد (مقبول)</span>
              </button>

              <button
                onClick={() => setRegistrationStatus('PENDING')}
                className={`py-2 px-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
                  isPending
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>قيد المراجعة</span>
              </button>

              <button
                onClick={() =>
                  setRegistrationStatus(
                    'REJECTED',
                    'نقص في مستندات السجل التجاري والشهادة الصحية للعاملين، يرجى التعديل وإعادة الإرسال.'
                  )
                }
                className={`py-2 px-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
                  isRejected
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                <XCircle className="w-3.5 h-3.5" />
                <span>محاكاة الرفض</span>
              </button>
            </div>
          </div>

          {/* Action Footer */}
          <div className="pt-2 flex items-center justify-between gap-3">
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
              <div className="text-right">
                <span className="text-[11px] text-slate-400 block font-medium">
                  لوحة التحكم مغلقة حتى اعتماد الحساب
                </span>
                <button
                  onClick={() => setRegistrationStatus('APPROVED')}
                  className="text-xs text-amber-600 font-bold hover:underline"
                >
                  اضغط هنا للاعتماد الفوري والدخول
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
