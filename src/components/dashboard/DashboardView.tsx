import React from 'react';
import {
  AlertTriangle,
  PlusCircle,
  ShoppingBag,
  Sparkles,
  ArrowUpRight,
  Clock,
  PhoneCall,
  CheckCircle,
  Truck,
  Eye,
  ChevronLeft,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { StatCards } from './StatCards';
import { SalesChart } from './SalesChart';
import { Order } from '../../types';

interface DashboardViewProps {
  onNavigate: (view: string, filter?: string) => void;
  onOpenOrderDetails: (order: Order) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onNavigate,
  onOpenOrderDetails,
}) => {
  const { restaurant, orders, stats, updateRestaurant } = useApp();

  const recentOrders = orders.slice(0, 5);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return (
          <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1 w-fit">
            <Clock className="w-3 h-3 text-amber-600" />
            منتظر التأكيد
          </span>
        );
      case 'ACCEPTED':
        return (
          <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-blue-100 text-blue-800 border border-blue-200">
            تم القبول
          </span>
        );
      case 'PREPARING':
        return (
          <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-orange-100 text-orange-800 border border-orange-200">
            قيد التجهيز
          </span>
        );
      case 'READY':
        return (
          <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-purple-100 text-purple-800 border border-purple-200">
            جاهز للتسليم
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1 w-fit">
            <CheckCircle className="w-3 h-3 text-emerald-600" />
            مكتمل
          </span>
        );
      case 'REJECTED':
      case 'CANCELLED':
        return (
          <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-rose-100 text-rose-800 border border-rose-200">
            مرفوض / ملغي
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Closed Warning Banner */}
      {!restaurant.isOpen && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-rose-100 text-rose-700 rounded-xl shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-rose-900">
                المطعم مغلق حاليًا أمام استقبال طلبات الزبائن
              </h4>
              <p className="text-xs text-rose-700 mt-0.5">
                لن يظهر مطعمك كمتاح للطلب في تطبيق العملاء، ولكن يمكنك متابعة الطلبات السابقة وتحديث المنيو بشكل طبيعي.
              </p>
            </div>
          </div>
          <button
            onClick={() => updateRestaurant({ isOpen: true })}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs shrink-0 cursor-pointer"
          >
            فتح استقبال الطلبات الآن
          </button>
        </div>
      )}

      {/* Urgent Pending Orders Banner */}
      {stats.pendingOrdersCount > 0 && (
        <div className="p-4 bg-gradient-to-r from-amber-500 via-amber-600 to-amber-500 text-slate-950 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg shadow-amber-500/15">
          <div className="flex items-center gap-3">
            <span className="flex h-3 w-3 relative shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
            </span>
            <div>
              <h4 className="text-sm font-black text-white">
                لديك {stats.pendingOrdersCount} طلب جديد بانتظار الموافقة وإصدار الفاتورة!
              </h4>
              <p className="text-xs text-amber-100 mt-0.5">
                تأكيد الطلبات سريعًا يضمن سرعة التوصيل ورضا العملاء.
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigate('orders', 'PENDING')}
            className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-900 font-black text-xs rounded-xl shadow-xs shrink-0 flex items-center gap-1.5 cursor-pointer"
          >
            <span>مراجعة الطلبات المنتظرة</span>
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Stats Cards */}
      <StatCards
        onNavigateToOrders={(filter) => onNavigate('orders', filter)}
        onNavigateToFinance={() => onNavigate('finance')}
      />

      {/* Quick Action Shortcuts */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button
          onClick={() => onNavigate('menu')}
          className="p-3.5 bg-white hover:bg-amber-50/50 rounded-2xl border border-slate-200 text-right transition-all flex items-center justify-between group"
        >
          <div>
            <div className="text-xs font-bold text-slate-800">إضافة صنف للمنيو</div>
            <div className="text-[11px] text-slate-400 mt-0.5">تحديث الأسعار والإضافات</div>
          </div>
          <PlusCircle className="w-5 h-5 text-amber-500 group-hover:scale-110 transition-transform" />
        </button>

        <button
          onClick={() => onNavigate('offers')}
          className="p-3.5 bg-white hover:bg-amber-50/50 rounded-2xl border border-slate-200 text-right transition-all flex items-center justify-between group"
        >
          <div>
            <div className="text-xs font-bold text-slate-800">إدارة عروض السلايدر</div>
            <div className="text-[11px] text-slate-400 mt-0.5">خصومات وبانرات حصرية</div>
          </div>
          <Sparkles className="w-5 h-5 text-amber-500 group-hover:scale-110 transition-transform" />
        </button>

        <button
          onClick={() => onNavigate('orders')}
          className="p-3.5 bg-white hover:bg-amber-50/50 rounded-2xl border border-slate-200 text-right transition-all flex items-center justify-between group"
        >
          <div>
            <div className="text-xs font-bold text-slate-800">كافة الطلبات والمسارات</div>
            <div className="text-[11px] text-slate-400 mt-0.5">ذاتي وهاتف مندوب</div>
          </div>
          <ShoppingBag className="w-5 h-5 text-amber-500 group-hover:scale-110 transition-transform" />
        </button>

        <button
          onClick={() => onNavigate('finance')}
          className="p-3.5 bg-white hover:bg-amber-50/50 rounded-2xl border border-slate-200 text-right transition-all flex items-center justify-between group"
        >
          <div>
            <div className="text-xs font-bold text-slate-800">كشف الحساب والتسويات</div>
            <div className="text-[11px] text-slate-400 mt-0.5">عمولة 10% وسجل الإيصالات</div>
          </div>
          <ArrowUpRight className="w-5 h-5 text-emerald-600 group-hover:scale-110 transition-transform" />
        </button>
      </div>

      {/* Sales Performance Chart */}
      <SalesChart />

      {/* Recent Orders Overview */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">أحدث الطلبات الواردة</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              متابعة آخر العمليات ومسارات التوصيل المعتمدة
            </p>
          </div>
          <button
            onClick={() => onNavigate('orders')}
            className="text-xs font-bold text-amber-600 hover:text-amber-700 flex items-center gap-1 hover:underline"
          >
            <span>عرض كل الطلبات ({orders.length})</span>
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-100 font-semibold">
              <tr>
                <th className="py-3 px-4">رقم الطلب</th>
                <th className="py-3 px-4">العميل والعنوان</th>
                <th className="py-3 px-4">مسار التنفيذ</th>
                <th className="py-3 px-4">إجمالي المبلغ</th>
                <th className="py-3 px-4">الحالة</th>
                <th className="py-3 px-4 text-center">الإجراء</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {recentOrders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center">
                    <div className="flex flex-col items-center justify-center text-slate-400">
                      <ShoppingBag className="w-12 h-12 stroke-[1.5] text-slate-300 mb-3" />
                      <p className="text-sm font-bold text-slate-700">لا توجد طلبات واردة حتى الآن</p>
                      <p className="text-xs text-slate-400 mt-1">
                        ستظهر أحدث طلبات الزبائن وتفاصيل التوصيل الذاتي والمندوب هنا فور تسجيلها.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                recentOrders.map((ord) => (
                  <tr key={ord.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                      #{ord.orderNumber}
                      <span className="block text-[10px] text-slate-400 font-sans font-normal">
                        {new Date(ord.createdAt).toLocaleTimeString('ar-EG', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <p className="font-bold text-slate-900">{ord.customer.name}</p>
                      <p className="text-[11px] text-slate-500 truncate max-w-xs">
                        {ord.customer.address}
                      </p>
                    </td>
                    <td className="py-3.5 px-4">
                      {ord.route === 'SELF_DELIVERY' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-800 font-medium text-[11px] border border-emerald-200">
                          <Truck className="w-3 h-3 text-emerald-600" />
                          توصيل ذاتي (إلكتروني)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-blue-50 text-blue-800 font-medium text-[11px] border border-blue-200">
                          <PhoneCall className="w-3 h-3 text-blue-600" />
                          مندوب (اتصال هاتفي)
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-black text-slate-900">
                        {ord.grandTotal.toLocaleString('ar-EG')} ج.م
                      </span>
                      <span className="block text-[10px] text-slate-400">
                        صافي المطعم: {ord.netRestaurantDue.toLocaleString('ar-EG')} ج.م
                      </span>
                    </td>
                    <td className="py-3.5 px-4">{getStatusBadge(ord.status)}</td>
                    <td className="py-3.5 px-4 text-center">
                      <button
                        onClick={() => onOpenOrderDetails(ord)}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-amber-100 text-slate-700 hover:text-amber-900 rounded-lg font-bold text-xs transition-colors inline-flex items-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>التفاصيل</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
