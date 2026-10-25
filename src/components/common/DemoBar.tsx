import React, { useState } from 'react';
import {
  Sparkles,
  RotateCcw,
  CheckCircle2,
  Clock,
  XCircle,
  Plus,
  PhoneCall,
  Sliders,
  ChevronUp,
  ChevronDown,
  Info,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const DemoBar: React.FC = () => {
  const {
    restaurant,
    setRegistrationStatus,
    resetAllData,
    injectMockOrder,
    isAuthenticated,
  } = useApp();

  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="fixed bottom-3 left-3 right-3 sm:right-auto sm:left-6 z-50 max-w-xl">
      <div className="bg-slate-900/95 backdrop-blur-md text-white rounded-2xl shadow-2xl border border-slate-700/80 overflow-hidden">
        {/* Toggle header */}
        <div
          onClick={() => setIsOpen(!isOpen)}
          className="px-4 py-2.5 flex items-center justify-between cursor-pointer hover:bg-slate-800/80 transition-colors"
        >
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
            </span>
            <span className="text-xs font-bold text-amber-400">
              أدوات محاكاة واختبار المرحلة الأولى
            </span>
            <span className="text-[11px] bg-slate-800 px-2 py-0.5 rounded-full text-slate-300 font-mono">
              حالة التسجيل: {restaurant.registrationStatus === 'APPROVED' ? 'مقبول' : restaurant.registrationStatus === 'PENDING' ? 'قيد المراجعة' : 'مرفوض'}
            </span>
          </div>

          <button className="text-slate-400 hover:text-white p-1">
            {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
        </div>

        {isOpen && (
          <div className="p-3.5 border-t border-slate-800 space-y-3 text-xs">
            {/* Registration status switch */}
            <div>
              <p className="text-[11px] text-slate-400 mb-1.5 font-semibold">
                تبديل حالة تسجيل المطعم لاختبار الشاشات:
              </p>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  onClick={() => setRegistrationStatus('APPROVED')}
                  className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg font-bold transition-all ${
                    restaurant.registrationStatus === 'APPROVED'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>معتمد (لوحة التحكم)</span>
                </button>
                <button
                  onClick={() => setRegistrationStatus('PENDING')}
                  className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg font-bold transition-all ${
                    restaurant.registrationStatus === 'PENDING'
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
                  className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg font-bold transition-all ${
                    restaurant.registrationStatus === 'REJECTED'
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  <XCircle className="w-3.5 h-3.5" />
                  <span>مرفوض مع سبب</span>
                </button>
              </div>
            </div>

            {/* Mock Order Injections */}
            <div>
              <p className="text-[11px] text-slate-400 mb-1.5 font-semibold">
                محاكاة طلب جديد لاختبار المسارين:
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => injectMockOrder('SELF_DELIVERY')}
                  className="flex items-center justify-center gap-1.5 py-2 px-3 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-lg transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>طلب توصيل ذاتي</span>
                </button>
                <button
                  onClick={() => injectMockOrder('COURIER_PHONE')}
                  className="flex items-center justify-center gap-1.5 py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors"
                >
                  <PhoneCall className="w-3.5 h-3.5" />
                  <span>طلب هاتف / مندوب</span>
                </button>
              </div>
            </div>

            {/* Reset data */}
            <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
              <span className="text-[11px] text-slate-400">
                إرجاع البيانات التجريبية لحالتها الأولى:
              </span>
              <button
                onClick={resetAllData}
                className="flex items-center gap-1 text-[11px] font-bold text-rose-400 hover:text-rose-300 bg-rose-950/60 hover:bg-rose-900/60 px-2.5 py-1 rounded-md border border-rose-800/50 transition-colors"
              >
                <RotateCcw className="w-3 h-3" />
                <span>إعادة ضبط البيانات</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
