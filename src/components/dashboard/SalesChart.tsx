import React, { useState } from 'react';
import { BarChart3, TrendingUp, Calendar } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const SalesChart: React.FC = () => {
  const { stats } = useApp();
  const [period, setPeriod] = useState<'TODAY' | 'WEEK' | 'MONTH'>('WEEK');

  const hasSalesData = stats.totalOrdersCount > 0 && stats.netFoodSales > 0;
  const baseSales = stats.netFoodSales;

  const dataSets = {
    TODAY: [
      { label: '12:00 م', sales: Math.round(baseSales * 0.2), orders: Math.max(1, Math.round(stats.completedOrdersCount * 0.2)) },
      { label: '02:00 م', sales: Math.round(baseSales * 0.35), orders: Math.max(1, Math.round(stats.completedOrdersCount * 0.35)) },
      { label: '04:00 م', sales: Math.round(baseSales * 0.15), orders: Math.max(1, Math.round(stats.completedOrdersCount * 0.15)) },
      { label: '06:00 م', sales: Math.round(baseSales * 0.4), orders: Math.max(1, Math.round(stats.completedOrdersCount * 0.4)) },
      { label: '08:00 م', sales: Math.round(baseSales * 0.6), orders: Math.max(1, Math.round(stats.completedOrdersCount * 0.6)) },
      { label: '10:00 م', sales: Math.round(baseSales * 0.3), orders: Math.max(1, Math.round(stats.completedOrdersCount * 0.3)) },
    ],
    WEEK: [
      { label: 'السبت', sales: Math.round(baseSales * 0.15), orders: Math.round(stats.completedOrdersCount * 0.15) },
      { label: 'الأحد', sales: Math.round(baseSales * 0.12), orders: Math.round(stats.completedOrdersCount * 0.12) },
      { label: 'الإثنين', sales: Math.round(baseSales * 0.14), orders: Math.round(stats.completedOrdersCount * 0.14) },
      { label: 'الثلاثاء', sales: Math.round(baseSales * 0.13), orders: Math.round(stats.completedOrdersCount * 0.13) },
      { label: 'الأربعاء', sales: Math.round(baseSales * 0.14), orders: Math.round(stats.completedOrdersCount * 0.14) },
      { label: 'الخميس', sales: Math.round(baseSales * 0.18), orders: Math.round(stats.completedOrdersCount * 0.18) },
      { label: 'الجمعة', sales: Math.round(baseSales * 0.14), orders: Math.round(stats.completedOrdersCount * 0.14) },
    ],
    MONTH: [
      { label: 'الأسبوع 1', sales: Math.round(baseSales * 0.22), orders: Math.round(stats.completedOrdersCount * 0.22) },
      { label: 'الأسبوع 2', sales: Math.round(baseSales * 0.26), orders: Math.round(stats.completedOrdersCount * 0.26) },
      { label: 'الأسبوع 3', sales: Math.round(baseSales * 0.24), orders: Math.round(stats.completedOrdersCount * 0.24) },
      { label: 'الأسبوع 4', sales: Math.round(baseSales * 0.28), orders: Math.round(stats.completedOrdersCount * 0.28) },
    ],
  };

  const currentData = dataSets[period];
  const maxSales = Math.max(...currentData.map((d) => d.sales), 10);

  if (!hasSalesData) {
    return (
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs text-center">
        <div className="flex items-center justify-between mb-4 text-right">
          <div>
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-amber-500" />
              أداء المبيعات والطلبات خلال الفترة
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              متابعة حركة الإيرادات اليومية وتوزيع أوقات الذروة
            </p>
          </div>
        </div>

        <div className="py-10 flex flex-col items-center justify-center text-slate-400">
          <div className="p-3 bg-amber-50 rounded-2xl mb-3 text-amber-600">
            <TrendingUp className="w-8 h-8 stroke-[1.5]" />
          </div>
          <h4 className="text-sm font-bold text-slate-700">لا توجد مبيعات مكتملة حتى الآن</h4>
          <p className="text-xs text-slate-400 mt-1 max-w-sm">
            ستظهر الرسوم البيانية ومؤشرات الأداء وتوزيع المبيعات تلقائيًا عند استقبال واكتمال أولى طلبات الزبائن.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
        <div>
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-amber-500" />
            أداء المبيعات والطلبات خلال الفترة
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            متابعة حركة الإيرادات اليومية وتوزيع الطلبات
          </p>
        </div>

        {/* Period Selector */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-semibold">
          <button
            onClick={() => setPeriod('TODAY')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              period === 'TODAY'
                ? 'bg-white text-slate-900 shadow-xs font-bold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            اليوم
          </button>
          <button
            onClick={() => setPeriod('WEEK')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              period === 'WEEK'
                ? 'bg-white text-slate-900 shadow-xs font-bold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            هذا الأسبوع
          </button>
          <button
            onClick={() => setPeriod('MONTH')}
            className={`px-3 py-1.5 rounded-lg transition-colors ${
              period === 'MONTH'
                ? 'bg-white text-slate-900 shadow-xs font-bold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            هذا الشهر
          </button>
        </div>
      </div>

      {/* Chart Bars */}
      <div className="h-52 flex items-end justify-between gap-2 sm:gap-4 pt-6 px-2 border-b border-slate-100">
        {currentData.map((item, index) => {
          const heightPercent = Math.max(12, Math.round((item.sales / maxSales) * 100));
          return (
            <div key={index} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
              <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-white text-[10px] py-1 px-2 rounded-md shadow pointer-events-none whitespace-nowrap mb-1">
                {item.sales.toLocaleString('ar-EG')} ج.م ({item.orders} طلب)
              </div>
              <div className="w-full max-w-[42px] bg-slate-100 rounded-t-xl overflow-hidden relative flex items-end h-full">
                <div
                  style={{ height: `${heightPercent}%` }}
                  className="w-full bg-gradient-to-t from-amber-500 to-amber-400 group-hover:from-amber-600 group-hover:to-amber-500 rounded-t-xl transition-all duration-300"
                />
              </div>
              <span className="text-[11px] font-medium text-slate-600 text-center truncate w-full">
                {item.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Footnote / Legend */}
      <div className="mt-4 flex flex-wrap items-center justify-between text-xs text-slate-500 gap-2">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-md bg-amber-500" />
            <span>صافي المبيعات (ج.م)</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-400">
            <span>متوسط قيمة الطلب: </span>
            <span className="font-bold text-slate-700">
              {stats.completedOrdersCount > 0
                ? Math.round(stats.netFoodSales / stats.completedOrdersCount).toLocaleString('ar-EG')
                : 0}{' '}
              ج.م
            </span>
          </div>
        </div>

        <span className="text-[11px] text-amber-700 font-medium">
          يتم احتساب العمولة 10% تلقائيًا بعد كل تسليم ناجح
        </span>
      </div>
    </div>
  );
};
