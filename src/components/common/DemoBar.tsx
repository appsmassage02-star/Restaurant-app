import React, { useState } from 'react';
import {
  Database,
  CheckCircle2,
  Clock,
  XCircle,
  RefreshCw,
  ChevronUp,
  ChevronDown,
  ShieldCheck,
  AlertTriangle,
  User,
  Store,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const DemoBar: React.FC = () => {
  const {
    isSupabaseReady,
    isAuthenticated,
    user,
    restaurant,
    hasRestaurant,
    refreshRestaurant,
  } = useApp();

  const [isOpen, setIsOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshRestaurant();
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className="fixed bottom-3 left-3 right-3 sm:right-auto sm:left-6 z-50 max-w-md font-['Cairo',sans-serif]">
      <div className="bg-slate-900/95 backdrop-blur-md text-white rounded-2xl shadow-2xl border border-slate-700/80 overflow-hidden text-xs">
        {/* Toggle Header */}
        <div
          onClick={() => setIsOpen(!isOpen)}
          className="px-4 py-2.5 flex items-center justify-between cursor-pointer hover:bg-slate-800/80 transition-colors"
        >
          <div className="flex items-center gap-2">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                isSupabaseReady ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
              }`}
            />
            <span className="font-bold text-slate-200">
              حالة اتصال Supabase:
            </span>
            <span
              className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                isSupabaseReady
                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                  : 'bg-amber-950 text-amber-300 border border-amber-800'
              }`}
            >
              {isSupabaseReady ? 'متصل بالعميل' : 'بانتظار المفاتيح'}
            </span>
          </div>

          <button className="text-slate-400 hover:text-white p-1">
            {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
        </div>

        {isOpen && (
          <div className="p-3.5 border-t border-slate-800 space-y-2.5">
            <div className="space-y-1.5 text-[11px]">
              <div className="flex items-center justify-between text-slate-400">
                <span className="flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  المستخدم المصادق (auth.uid):
                </span>
                <span className="font-mono text-slate-200 truncate max-w-[170px]">
                  {isAuthenticated && user ? user.id : 'غير مسجل الدخول'}
                </span>
              </div>

              <div className="flex items-center justify-between text-slate-400">
                <span className="flex items-center gap-1">
                  <Store className="w-3.5 h-3.5 text-slate-400" />
                  المطعم المملوك:
                </span>
                <span className="font-bold text-slate-200 truncate max-w-[170px]">
                  {hasRestaurant ? restaurant.name : 'لا يوجد مطعم مرتبط بعد'}
                </span>
              </div>

              <div className="flex items-center justify-between text-slate-400">
                <span>حالة المطعم في قاعدة البيانات:</span>
                <span
                  className={`font-bold px-2 py-0.5 rounded text-[10px] ${
                    restaurant.registrationStatus === 'APPROVED'
                      ? 'bg-emerald-900/60 text-emerald-300'
                      : restaurant.registrationStatus === 'PENDING'
                      ? 'bg-amber-900/60 text-amber-300'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {restaurant.registrationStatus}
                </span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
              <span className="text-[10px] text-slate-400">
                المرحلة الأولى: فحص RLS والتحقق الفعلي
              </span>
              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="flex items-center gap-1 text-[11px] font-bold text-amber-400 hover:text-amber-300 bg-slate-800 hover:bg-slate-700 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
              >
                <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span>تحديث البيانات</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
