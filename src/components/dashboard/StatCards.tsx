import React from 'react';
import {
  Clock,
  CheckCircle,
  Flame,
  PackageCheck,
  CheckCheck,
  XCircle,
  TrendingUp,
  Wallet,
  Receipt,
  Scale,
  Truck,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

interface StatCardsProps {
  onNavigateToOrders: (statusFilter?: string) => void;
  onNavigateToFinance: () => void;
}

export const StatCards: React.FC<StatCardsProps> = ({
  onNavigateToOrders,
  onNavigateToFinance,
}) => {
  const { stats, restaurant } = useApp();

  const orderStats = [
    {
      title: 'طلبات منتظرة',
      count: stats.pendingOrdersCount,
      icon: Clock,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
      border: 'border-amber-200',
      filter: 'PENDING',
      urgent: stats.pendingOrdersCount > 0,
    },
    {
      title: 'طلبات مقبولة',
      count: stats.acceptedOrdersCount,
      icon: CheckCircle,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      filter: 'ACCEPTED',
      urgent: false,
    },
    {
      title: 'بانتظار تأمين طيار',
      count: stats.awaitingDriverOrdersCount,
      icon: Truck,
      color: 'text-sky-600',
      bg: 'bg-sky-50',
      border: 'border-sky-200',
      filter: 'AWAITING_DRIVER',
      urgent: stats.awaitingDriverOrdersCount > 0,
    },
    {
      title: 'قيد التجهيز',
      count: stats.preparingOrdersCount,
      icon: Flame,
      color: 'text-orange-600',
      bg: 'bg-orange-50',
      border: 'border-orange-200',
      filter: 'PREPARING',
      urgent: false,
    },
    {
      title: 'جاهزة للتسليم',
      count: stats.readyOrdersCount,
      icon: PackageCheck,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
      border: 'border-purple-200',
      filter: 'READY',
      urgent: stats.readyOrdersCount > 0,
    },
    {
      title: 'طلبات مكتملة',
      count: stats.completedOrdersCount,
      icon: CheckCheck,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
      border: 'border-emerald-200',
      filter: 'COMPLETED',
      urgent: false,
    },
    {
      title: 'مرفوضة / ملغاة',
      count: stats.rejectedOrdersCount,
      icon: XCircle,
      color: 'text-rose-600',
      bg: 'bg-rose-50',
      border: 'border-rose-200',
      filter: 'REJECTED',
      urgent: false,
    },
  ];

  return (
    <div className="space-y-4">
      {/* 4 Financial Highlight Cards - 2 Cards Per Row (Including Mobile) */}
      <div className="grid grid-cols-2 gap-2.5 sm:gap-4">
        {/* الصف الأول: 1. صافي مستحقات المطعم */}
        <div
          onClick={onNavigateToFinance}
          className="bg-white p-3.5 sm:p-5 rounded-2xl border border-emerald-200/80 shadow-xs hover:border-emerald-400 transition-all cursor-pointer group bg-gradient-to-br from-white to-emerald-50/30 w-full"
        >
          <div className="flex items-center justify-between mb-2 sm:mb-2.5">
            <span className="text-[11px] sm:text-xs font-bold text-emerald-800 leading-tight">صافي مستحقات المطعم</span>
            <div className="p-2 sm:p-2.5 bg-emerald-100 text-emerald-700 rounded-xl group-hover:scale-110 transition-transform shrink-0">
              <Wallet className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-1 sm:gap-1.5">
            <span className="text-lg sm:text-2xl font-black text-emerald-700">
              {stats.totalNetRestaurantDue.toLocaleString('ar-EG')}
            </span>
            <span className="text-[10px] sm:text-xs font-bold text-emerald-800">ج.م</span>
          </div>
          <p className="text-[10px] sm:text-[11px] text-emerald-700/80 mt-1 sm:mt-1.5 leading-tight">
            شامل رسوم التوصيل الذاتي بعد خصم العمولة
          </p>
        </div>

        {/* الصف الأول: 2. إجمالي مبيعات الطعام */}
        <div
          onClick={onNavigateToFinance}
          className="bg-white p-3.5 sm:p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-amber-400 transition-all cursor-pointer group w-full"
        >
          <div className="flex items-center justify-between mb-2 sm:mb-2.5">
            <span className="text-[11px] sm:text-xs font-bold text-slate-500 leading-tight">إجمالي مبيعات الطعام</span>
            <div className="p-2 sm:p-2.5 bg-blue-50 text-blue-600 rounded-xl group-hover:scale-110 transition-transform shrink-0">
              <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-1 sm:gap-1.5">
            <span className="text-lg sm:text-2xl font-black text-slate-900">
              {stats.netFoodSales.toLocaleString('ar-EG')}
            </span>
            <span className="text-[10px] sm:text-xs font-bold text-slate-500">ج.م</span>
          </div>
          <p className="text-[10px] sm:text-[11px] text-slate-400 mt-1 sm:mt-1.5 leading-tight">
            صافي قيمة الطعام بعد الخصم للمبيعات المكتملة
          </p>
        </div>

        {/* الصف الثاني: 3. المبالغ غير المسواة */}
        <div
          onClick={onNavigateToFinance}
          className="bg-white p-3.5 sm:p-5 rounded-2xl border border-amber-200 shadow-xs hover:border-amber-400 transition-all cursor-pointer group bg-gradient-to-br from-white to-amber-50/30 w-full"
        >
          <div className="flex items-center justify-between mb-2 sm:mb-2.5">
            <span className="text-[11px] sm:text-xs font-bold text-amber-900 leading-tight">المبالغ غير المسواة</span>
            <div className="p-2 sm:p-2.5 bg-amber-100 text-amber-700 rounded-xl group-hover:scale-110 transition-transform shrink-0">
              <Receipt className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-1 sm:gap-1.5">
            <span className="text-lg sm:text-2xl font-black text-amber-700">
              {stats.totalUnsettled.toLocaleString('ar-EG')}
            </span>
            <span className="text-[10px] sm:text-xs font-bold text-amber-900">ج.م</span>
          </div>
          <p className="text-[10px] sm:text-[11px] text-amber-800/80 mt-1 sm:mt-1.5 leading-tight">
            جاهزة للإرسال في دورة التسوية القادمة
          </p>
        </div>

        {/* الصف الثاني: 4. عمولة الإدارة المستحقة */}
        <div
          onClick={onNavigateToFinance}
          className="bg-white p-3.5 sm:p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-amber-400 transition-all cursor-pointer group w-full"
        >
          <div className="flex items-center justify-between mb-2 sm:mb-2.5">
            <span className="text-[11px] sm:text-xs font-bold text-slate-500 leading-tight">
              عمولة الإدارة المستحقة ({restaurant.adminCommissionPercent}%)
            </span>
            <div className="p-2 sm:p-2.5 bg-amber-50 text-amber-600 rounded-xl group-hover:scale-110 transition-transform shrink-0">
              <Scale className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>
          <div className="flex items-baseline gap-1 sm:gap-1.5">
            <span className="text-lg sm:text-2xl font-black text-slate-900">
              {stats.totalAdminCommission.toLocaleString('ar-EG')}
            </span>
            <span className="text-[10px] sm:text-xs font-bold text-slate-500">ج.م</span>
          </div>
          <p className="text-[10px] sm:text-[11px] text-slate-400 mt-1 sm:mt-1.5 leading-tight">
            محتسبة على صافي الطعام فقط (بدون التوصيل)
          </p>
        </div>
      </div>

      {/* Order Lifecycle Counters */}
      <div>
        <div className="flex items-center justify-between mb-2.5">
          <h3 className="text-xs font-bold text-slate-700">متابعة مسار الطلبات الحالية:</h3>
          <span className="text-[11px] text-slate-400">إجمالي {stats.totalOrdersCount} طلب مسجل</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-2.5">
          {orderStats.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.title}
                onClick={() => onNavigateToOrders(item.filter)}
                className={`p-3 rounded-2xl border transition-all text-right cursor-pointer hover:shadow-xs relative ${
                  item.bg
                } ${item.border} ${item.urgent ? 'ring-2 ring-amber-400/50' : ''}`}
              >
                {item.urgent && (
                  <span className="absolute top-2 left-2 flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                  </span>
                )}
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Icon className={`w-4 h-4 ${item.color}`} />
                  <span className="text-xs font-bold text-slate-700">{item.title}</span>
                </div>
                <div className="text-xl font-black text-slate-900">
                  {item.count}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
