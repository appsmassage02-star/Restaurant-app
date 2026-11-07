import React, { useState } from 'react';
import {
  Search,
  Filter,
  ShoppingBag,
  Truck,
  PhoneCall,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Flame,
  PackageCheck,
  Eye,
  RefreshCw,
  Radio,
  Wifi,
  WifiOff,
  Loader2,
  AlertCircle,
  ShieldAlert,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Order, OrderStatus, ExecutionRoute } from '../../types';
import { getArabicStatusLabel, getArabicRouteLabel } from '../../services/orderService';

interface OrdersViewProps {
  onOpenOrderDetails: (order: Order) => void;
  initialFilter?: string;
}

export const OrdersView: React.FC<OrdersViewProps> = ({
  onOpenOrderDetails,
  initialFilter = 'ALL',
}) => {
  const {
    orders,
    ordersLoading,
    ordersError,
    ordersRealtimeStatus,
    refreshOrders,
    hasRestaurant,
    restaurant,
    pendingCancellations,
  } = useApp();

  const [statusFilter, setStatusFilter] = useState<string>(initialFilter);
  const [routeFilter, setRouteFilter] = useState<'ALL' | ExecutionRoute>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredOrders = orders.filter((ord) => {
    // Status filter
    if (statusFilter !== 'ALL') {
      if (statusFilter === 'REJECTED') {
        if (ord.status !== 'REJECTED' && ord.status !== 'CANCELLED') return false;
      } else if (ord.status !== statusFilter) {
        return false;
      }
    }
    // Route filter
    if (routeFilter !== 'ALL' && ord.route !== routeFilter) {
      return false;
    }
    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchNum = ord.orderNumber.toLowerCase().includes(q);
      const matchName = ord.customer.name.toLowerCase().includes(q);
      const matchPhone = ord.customer.phone.includes(q);
      if (!matchNum && !matchName && !matchPhone) return false;
    }
    return true;
  });

  const getStatusBadge = (status: OrderStatus, rawStatus?: string, fulfillmentRoute?: string) => {
    const label = getArabicStatusLabel(rawStatus || status, fulfillmentRoute);

    switch (status) {
      case 'PENDING':
        return (
          <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-amber-600 animate-spin-slow" />
            {label}
          </span>
        );
      case 'ACCEPTED':
        return (
          <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-blue-100 text-blue-800 border border-blue-200">
            {label}
          </span>
        );
      case 'AWAITING_DRIVER':
        return (
          <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-sky-100 text-sky-800 border border-sky-200 flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-sky-600" />
            {label}
          </span>
        );
      case 'ASSIGNED_TO_DRIVER':
        return (
          <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-indigo-100 text-indigo-800 border border-indigo-200 flex items-center gap-1">
            <Truck className="w-3.5 h-3.5 text-indigo-600" />
            {label}
          </span>
        );
      case 'PREPARING':
        return (
          <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-orange-100 text-orange-800 border border-orange-200 flex items-center gap-1">
            <Flame className="w-3.5 h-3.5 text-orange-600" />
            {label}
          </span>
        );
      case 'READY':
        return (
          <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-purple-100 text-purple-800 border border-purple-200 flex items-center gap-1">
            <PackageCheck className="w-3.5 h-3.5 text-purple-600" />
            {label}
          </span>
        );
      case 'PICKED_UP':
        return (
          <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-teal-100 text-teal-800 border border-teal-200 flex items-center gap-1">
            <PackageCheck className="w-3.5 h-3.5 text-teal-600" />
            {label}
          </span>
        );
      case 'ON_THE_WAY':
        return (
          <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-cyan-100 text-cyan-800 border border-cyan-200 flex items-center gap-1">
            <Truck className="w-3.5 h-3.5 text-cyan-600" />
            {label}
          </span>
        );
      case 'DELIVERED':
        return (
          <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            {label}
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-slate-100 text-slate-800 border border-slate-200 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-slate-600" />
            {label}
          </span>
        );
      case 'REJECTED':
      case 'CANCELLED':
        return (
          <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-rose-100 text-rose-800 border border-rose-200 flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
            {label}
          </span>
        );
    }
  };

  const statusCounts = {
    ALL: orders.length,
    PENDING: orders.filter((o) => o.status === 'PENDING').length,
    ACCEPTED: orders.filter((o) => o.status === 'ACCEPTED').length,
    AWAITING_DRIVER: orders.filter((o) => o.status === 'AWAITING_DRIVER').length,
    ASSIGNED_TO_DRIVER: orders.filter((o) => o.status === 'ASSIGNED_TO_DRIVER').length,
    PREPARING: orders.filter((o) => o.status === 'PREPARING').length,
    READY: orders.filter((o) => o.status === 'READY').length,
    PICKED_UP: orders.filter((o) => o.status === 'PICKED_UP').length,
    ON_THE_WAY: orders.filter((o) => o.status === 'ON_THE_WAY').length,
    DELIVERED: orders.filter((o) => o.status === 'DELIVERED').length,
    COMPLETED: orders.filter((o) => o.status === 'COMPLETED').length,
    REJECTED: orders.filter((o) => o.status === 'REJECTED' || o.status === 'CANCELLED').length,
  };

  return (
    <div className="space-y-5 font-['Cairo',sans-serif]">
      {/* Top Header & Realtime Connection Status */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-amber-500" />
            إدارة الطلبات ومسارات التنفيذ
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            استقبال الطلبات الحقيقية ومتابعة التجهيز وتتبع مسار التوصيل الذاتي واتصال المندوب
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Realtime Status Indicator */}
          <div
            className={`px-3 py-1.5 rounded-xl border flex items-center gap-1.5 text-xs font-bold ${
              ordersRealtimeStatus === 'CONNECTED'
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : ordersRealtimeStatus === 'CONNECTING'
                ? 'bg-amber-50 text-amber-700 border-amber-200'
                : 'bg-slate-100 text-slate-600 border-slate-200'
            }`}
          >
            {ordersRealtimeStatus === 'CONNECTED' ? (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>استقبال لحظي نشط</span>
              </>
            ) : ordersRealtimeStatus === 'CONNECTING' ? (
              <>
                <Loader2 className="w-3.5 h-3.5 text-amber-600 animate-spin" />
                <span>جاري المزامنة...</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3.5 h-3.5 text-slate-400" />
                <span>اتصال احتياطي</span>
              </>
            )}
          </div>

          {/* Manual Refresh / Sync Button */}
          <button
            onClick={refreshOrders}
            disabled={ordersLoading}
            title="مزامنة الطلبات وتحديث القائمة الآن"
            className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl border border-slate-200 shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${ordersLoading ? 'animate-spin text-amber-600' : ''}`} />
            <span>تحديث</span>
          </button>
        </div>
      </div>

      {/* Database Error Banner */}
      {ordersError && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 flex items-start justify-between gap-3 text-xs">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">تعذر استعلام الطلبات من قاعدة البيانات:</p>
              <p className="text-rose-700 mt-0.5 leading-relaxed font-mono text-[11px] dir-ltr text-right">
                {ordersError}
              </p>
            </div>
          </div>
          <button
            onClick={refreshOrders}
            className="px-3 py-1.5 bg-rose-600 text-white font-bold rounded-xl text-xs hover:bg-rose-700 shrink-0 cursor-pointer"
          >
            إعادة المحاولة
          </button>
        </div>
      )}

      {/* Pending Cancellations Global Alert Banner */}
      {pendingCancellations && pendingCancellations.length > 0 && (
        <div className="p-4 rounded-2xl bg-rose-50 border-2 border-rose-300 text-rose-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs shadow-xs">
          <div className="flex items-center gap-2.5">
            <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 animate-bounce" />
            <div>
              <p className="font-black text-sm">
                تنبيه: يوجد {pendingCancellations.length} طلب إلغاء معلق من الزبائن بانتظار قرارك!
              </p>
              <p className="text-rose-800 text-xs mt-0.5">
                يرجى فتح تفاصيل الطلب للبت في طلب الإلغاء بالموافقة أو الرفض مع ذكر السبب.
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              const targetOrder = orders.find((o) => o.id === pendingCancellations[0].order_id);
              if (targetOrder) {
                onOpenOrderDetails(targetOrder);
              }
            }}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-black rounded-xl text-xs transition-colors shrink-0 shadow-xs cursor-pointer"
          >
            فتح أول طلب معلق (#{pendingCancellations[0].order_number || ''})
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث برقم الطلب (مثال: 19 أو TB-8491) أو اسم العميل أو الهاتف..."
              className="w-full pl-4 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-amber-500 focus:bg-white"
            />
            <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
          </div>

          {/* Route filter selector */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold shrink-0">
            <span className="text-slate-400 px-2 text-[11px]">المسار:</span>
            <button
              onClick={() => setRouteFilter('ALL')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                routeFilter === 'ALL'
                  ? 'bg-white text-slate-900 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              كافة المسارات
            </button>
            <button
              onClick={() => setRouteFilter('SELF_DELIVERY')}
              className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 ${
                routeFilter === 'SELF_DELIVERY'
                  ? 'bg-emerald-600 text-white shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Truck className="w-3.5 h-3.5" />
              <span>توصيل ذاتي</span>
            </button>
            <button
              onClick={() => setRouteFilter('COURIER_PHONE')}
              className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 ${
                routeFilter === 'COURIER_PHONE'
                  ? 'bg-blue-600 text-white shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <PhoneCall className="w-3.5 h-3.5" />
              <span>اتصال مندوب</span>
            </button>
          </div>
        </div>

        {/* Status Tabs with counters */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs border-t border-slate-100 pt-3">
          {[
            { key: 'ALL', label: 'الكل', count: statusCounts.ALL },
            { key: 'PENDING', label: 'منتظرة', count: statusCounts.PENDING, urgent: statusCounts.PENDING > 0 },
            { key: 'ACCEPTED', label: 'مقبولة', count: statusCounts.ACCEPTED },
            { key: 'AWAITING_DRIVER', label: 'بانتظار تأمين طيار', count: statusCounts.AWAITING_DRIVER, urgent: statusCounts.AWAITING_DRIVER > 0 },
            { key: 'ASSIGNED_TO_DRIVER', label: 'تم إسناد الطيار', count: statusCounts.ASSIGNED_TO_DRIVER },
            { key: 'PREPARING', label: 'قيد التجهيز', count: statusCounts.PREPARING },
            { key: 'READY', label: 'جاهزة', count: statusCounts.READY, urgent: statusCounts.READY > 0 },
            { key: 'PICKED_UP', label: 'استلم المندوب', count: statusCounts.PICKED_UP },
            { key: 'ON_THE_WAY', label: 'في الطريق', count: statusCounts.ON_THE_WAY },
            { key: 'DELIVERED', label: 'تم التوصيل', count: statusCounts.DELIVERED },
            { key: 'COMPLETED', label: 'مكتملة', count: statusCounts.COMPLETED },
            { key: 'REJECTED', label: 'مرفوضة وملغاة', count: statusCounts.REJECTED },
          ].map((tab) => {
            const isActive = statusFilter === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setStatusFilter(tab.key)}
                className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-amber-500 text-slate-950 shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                    isActive
                      ? 'bg-slate-900 text-white'
                      : tab.urgent
                      ? 'bg-rose-500 text-white animate-pulse'
                      : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Loading Skeleton */}
      {ordersLoading && orders.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 space-y-3">
          <Loader2 className="w-8 h-8 text-amber-500 animate-spin mx-auto" />
          <h4 className="text-sm font-bold text-slate-800">
            جاري جلب الطلبات الفعلية من قاعدة البيانات...
          </h4>
          <p className="text-xs text-slate-400">
            يتم الاتصال بجدول public.restaurant_orders بفلتر المطعم الحالي
          </p>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200">
          <ShoppingBag className="w-12 h-12 text-slate-300 mx-auto mb-3 stroke-1" />
          <h4 className="text-sm font-bold text-slate-700">لا توجد طلبات مطابقة</h4>
          <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
            {orders.length === 0
              ? 'لا توجد طلبات مسجلة لمطعمك في قاعدة البيانات حالياً. عند إرسال أي عميل طلباً جديداً سيظهر تلقائياً هنا عبر الاستقبال اللحظي.'
              : 'لا توجد طلبات مطابقة للفلتر أو البحث المحدد. جرّب تغيير معايير البحث.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredOrders.map((ord) => {
            const isSelf = ord.route === 'SELF_DELIVERY';
            return (
              <div
                key={ord.id}
                className="bg-white rounded-2xl border border-slate-200 hover:border-amber-300 hover:shadow-md transition-all p-4 flex flex-col justify-between space-y-3 relative group"
              >
                {/* Card Top: Order Number & Route */}
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-1.5 font-mono font-black text-slate-900 text-sm">
                      #{ord.orderNumber}
                      <span className="text-[11px] font-sans font-normal text-slate-400">
                        ({new Date(ord.createdAt).toLocaleTimeString('ar-EG', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })})
                      </span>
                    </div>
                    {getStatusBadge(ord.status, ord.rawStatus, ord.rawRoute || ord.route)}
                  </div>

                  {/* Route Indicator Tag */}
                  <div className="mb-2">
                    {isSelf ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 text-[10px] font-bold border border-emerald-200">
                        <Truck className="w-3 h-3 text-emerald-600" />
                        مسار 1: {getArabicRouteLabel(ord.rawRoute || ord.route)}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 text-blue-800 text-[10px] font-bold border border-blue-200">
                        <PhoneCall className="w-3 h-3 text-blue-600" />
                        مسار 2: {getArabicRouteLabel(ord.rawRoute || ord.route)}
                      </span>
                    )}
                  </div>

                  {/* Customer Brief */}
                  <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-xs space-y-1 mb-2.5">
                    <div className="flex justify-between items-center font-bold text-slate-900">
                      <span>{ord.customer.name}</span>
                      <span className="font-mono text-slate-600 dir-ltr text-[11px]">
                        {ord.customer.phone}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 truncate">
                      {ord.customer.address}
                    </p>
                  </div>

                  {/* Items summary */}
                  <div className="space-y-1 text-xs border-b border-slate-100 pb-2">
                    <span className="text-[11px] text-slate-400 font-semibold block">
                      الأصناف ({ord.items.length}):
                    </span>
                    {ord.items.map((item, i) => (
                      <div key={i} className="flex justify-between text-slate-700 text-xs">
                        <span className="truncate max-w-[200px]">
                          {item.quantity}× {item.name}
                        </span>
                        <span className="font-semibold text-slate-900">
                          {item.priceAtOrder * item.quantity} ج.م
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Card Footer: Financial & Action */}
                <div className="pt-1">
                  <div className="flex items-baseline justify-between mb-3 text-xs">
                    <div>
                      <span className="text-[11px] text-slate-400 block">إجمالي العميل:</span>
                      <span className="text-base font-black text-slate-900">
                        {ord.grandTotal.toLocaleString('ar-EG')} ج.م
                      </span>
                    </div>
                    <div className="text-left">
                      <span className="text-[10px] text-slate-400 block">صافي المطعم:</span>
                      <span className="text-xs font-bold text-emerald-700">
                        {ord.netRestaurantDue.toLocaleString('ar-EG')} ج.م
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => onOpenOrderDetails(ord)}
                    className="w-full py-2 px-3 bg-slate-100 hover:bg-amber-500 hover:text-slate-950 text-slate-800 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Eye className="w-4 h-4" />
                    <span>عرض التفاصيل والسجل</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
