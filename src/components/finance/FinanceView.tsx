import React, { useState } from 'react';
import {
  Wallet,
  TrendingUp,
  Receipt,
  Scale,
  ArrowDownLeft,
  ArrowUpRight,
  ShieldCheck,
  Plus,
  HelpCircle,
  Truck,
  PhoneCall,
  Calendar,
  FileSpreadsheet,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { SettlementModal } from './SettlementModal';
import { FinancialMovement, MovementType } from '../../types';

export const FinanceView: React.FC = () => {
  const { stats, movements, restaurant, recordSettlement } = useApp();

  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [showSettlementModal, setShowSettlementModal] = useState(false);

  const filteredMovements = movements.filter((m) => {
    if (typeFilter === 'ALL') return true;
    return m.type === typeFilter;
  });

  const getMovementTypeBadge = (type: MovementType) => {
    switch (type) {
      case 'FOOD_SALE':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
            مبيعات طعام
          </span>
        );
      case 'DELIVERY_FEE_EARNED':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
            رسوم توصيل ذاتي
          </span>
        );
      case 'ADMIN_COMMISSION_DEDUCTION':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
            استقطاع عمولة إدارية
          </span>
        );
      case 'COURIER_COLLECTION':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-800 border border-purple-200">
            توريد طعام من المندوب
          </span>
        );
      case 'PARTIAL_SETTLEMENT':
      case 'CASH_PAYOUT':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-teal-50 text-teal-800 border border-teal-200">
            تسوية أرباح معتمدة
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-800">
            حركة مالية
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
            <Wallet className="w-5 h-5 text-emerald-600" />
            الحسابات المالية والتسويات وعمولة الإدارة
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            كشف دقيق للمبيعات، حساب العمولة الإدارية على صافي الطعام، وتتبع مستحقات التسوية
          </p>
        </div>

        <button
          onClick={() => setShowSettlementModal(true)}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>تسجيل تسوية مستحقات</span>
        </button>
      </div>

      {/* Main Financial Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Food Value */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-1.5 text-slate-500 text-xs font-bold">
            <span>إجمالي مبيعات الطعام</span>
            <TrendingUp className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-black text-slate-900">
            {stats.totalFoodSales.toLocaleString('ar-EG')} ج.م
          </div>
          <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
            <span className="text-slate-400">الخصومات الممنوحة:</span>
            <span className="text-rose-600 font-bold">
              -{stats.totalDiscounts.toLocaleString('ar-EG')} ج.م
            </span>
          </div>
        </div>

        {/* Net Food Sales */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-1.5 text-slate-500 text-xs font-bold">
            <span>قيمة الطعام بعد الخصم</span>
            <Receipt className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-black text-slate-900">
            {stats.netFoodSales.toLocaleString('ar-EG')} ج.م
          </div>
          <div className="mt-2 pt-2 border-t border-slate-100 text-[11px] text-slate-400">
            الأساس المعتمد لحساب عمولة الإدارة
          </div>
        </div>

        {/* Admin Commission */}
        <div className="bg-white p-4 rounded-2xl border border-amber-200 shadow-xs bg-amber-50/20">
          <div className="flex items-center justify-between mb-1.5 text-amber-900 text-xs font-bold">
            <span>عمولة الإدارة ({restaurant.adminCommissionPercent}%)</span>
            <Scale className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-black text-amber-700">
            {stats.totalAdminCommission.toLocaleString('ar-EG')} ج.م
          </div>
          <div className="mt-2 pt-2 border-t border-amber-100 text-[11px] text-amber-800/80">
            مستقطعة فقط من الطعام دون رسوم التوصيل
          </div>
        </div>

        {/* Net Restaurant Due & Unsettled */}
        <div className="bg-white p-4 rounded-2xl border border-emerald-200 shadow-xs bg-emerald-50/20">
          <div className="flex items-center justify-between mb-1.5 text-emerald-900 text-xs font-bold">
            <span>الرصيد غير المسوى</span>
            <Wallet className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-700">
            {stats.totalUnsettled.toLocaleString('ar-EG')} ج.م
          </div>
          <div className="mt-2 pt-2 border-t border-emerald-100 text-[11px] text-emerald-800">
            جاهز للصرف في دورة التسوية الحالية
          </div>
        </div>
      </div>

      {/* Official Commission Formula Explainer Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-amber-500" />
          <h3 className="text-sm font-bold text-slate-800">
            آلية احتساب عمولة إدارة «طلبات البيت» المعتمدة
          </h3>
        </div>

        <p className="text-xs text-slate-600 leading-relaxed">
          تُحتسب عمولة الإدارة <strong>({restaurant.adminCommissionPercent}%)</strong> حصريًا على قيمة الطعام بعد الخصم الممنوح للعميل. 
          ولا يجوز إدراج رسوم التوصيل ضمن وعاء احتساب العمولة، ولا يحق لصاحب المطعم تعديل نسبة العمولة المقررة إداريًا.
        </p>

        {/* Detailed Example Box (from the brief) */}
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs space-y-2">
          <div className="font-bold text-slate-800 flex items-center justify-between border-b border-slate-200 pb-1.5">
            <span>مثال تطبيقي توضيحي:</span>
            <span className="text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              قاعدة التطبيق المعتمدة
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <div className="p-2 bg-white rounded-lg border border-slate-200">
              <span className="text-[10px] text-slate-400 block">قيمة الطعام قبل الخصم</span>
              <span className="font-bold text-slate-800">1,100 ج.م</span>
            </div>
            <div className="p-2 bg-white rounded-lg border border-slate-200">
              <span className="text-[10px] text-slate-400 block">الخصم الممنوح</span>
              <span className="font-bold text-rose-600">-100 ج.م</span>
            </div>
            <div className="p-2 bg-white rounded-lg border border-slate-200">
              <span className="text-[10px] text-slate-400 block">صافي الطعام (أساس العمولة)</span>
              <span className="font-bold text-emerald-700">1,000 ج.م</span>
            </div>
            <div className="p-2 bg-white rounded-lg border border-slate-200">
              <span className="text-[10px] text-slate-400 block">عمولة الإدارة (10%)</span>
              <span className="font-bold text-amber-700">100 ج.م</span>
            </div>
          </div>

          <p className="text-[11px] text-slate-500 pt-1">
            * إذا كانت رسوم التوصيل 30 ج.م، فإن أساس العمولة يظل <strong>1,000 ج.م</strong> وليس 1,030 ج.م، وتذهب الـ 30 ج.م كاملة للمطعم في التوصيل الذاتي أو للمندوب في مسار الهاتف.
          </p>
        </div>
      </div>

      {/* The Two Distinct Execution Routes Finance Comparison */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Self Delivery */}
        <div className="bg-white p-4 rounded-2xl border border-emerald-200 shadow-xs space-y-2">
          <div className="flex items-center gap-2 font-bold text-xs text-emerald-950">
            <Truck className="w-4 h-4 text-emerald-600" />
            <span>المسار الأول: التوصيل الذاتي للمطعم</span>
          </div>
          <ul className="text-xs text-slate-600 space-y-1 leading-relaxed list-disc pr-4">
            <li>رسوم التوصيل (25 ج.م) تذهب للمطعم بالكامل كإيراد توصيل.</li>
            <li>العميل يدفع كاش لطيار المطعم عند باب المنزل.</li>
            <li>تستقطع الإدارة عمولتها (10%) على الطعام فقط في كشف الحساب الدوري.</li>
          </ul>
        </div>

        {/* Courier Phone */}
        <div className="bg-white p-4 rounded-2xl border border-blue-200 shadow-xs space-y-2">
          <div className="flex items-center gap-2 font-bold text-xs text-blue-950">
            <PhoneCall className="w-4 h-4 text-blue-600" />
            <span>المسار الثاني: اتصال وتوصيل المندوب المستقل</span>
          </div>
          <ul className="text-xs text-slate-600 space-y-1 leading-relaxed list-disc pr-4">
            <li>المندوب يستلم قيمة الطلب كاملة من العميل نقدًا.</li>
            <li>المندوب يسلم قيمة الطعام للمطعم ويحتفظ برسوم توصيله.</li>
            <li>عمولة الإدارة على المطعم مستقلة عن تسوية قيمة الطعام مع المندوب.</li>
          </ul>
        </div>
      </div>

      {/* Transaction Ledger (سجل الحركات المالية) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              سجل الحركات المالية والتسويات السابقة
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              توثيق الحركات الدائنة والمدينة مع مراجع الإيصالات الرسمية
            </p>
          </div>

          {/* Filter selector */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setTypeFilter('ALL')}
              className={`px-3 py-1 rounded-lg transition-colors ${
                typeFilter === 'ALL'
                  ? 'bg-white text-slate-900 shadow-xs font-bold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              الكل ({movements.length})
            </button>
            <button
              onClick={() => setTypeFilter('FOOD_SALE')}
              className={`px-3 py-1 rounded-lg transition-colors ${
                typeFilter === 'FOOD_SALE'
                  ? 'bg-white text-slate-900 shadow-xs font-bold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              مبيعات
            </button>
            <button
              onClick={() => setTypeFilter('PARTIAL_SETTLEMENT')}
              className={`px-3 py-1 rounded-lg transition-colors ${
                typeFilter === 'PARTIAL_SETTLEMENT'
                  ? 'bg-white text-slate-900 shadow-xs font-bold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              تسويات
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-100 font-semibold">
              <tr>
                <th className="py-3 px-4">التاريخ والرقم</th>
                <th className="py-3 px-4">نوع الحركة</th>
                <th className="py-3 px-4">البيان والملاحظات</th>
                <th className="py-3 px-4">المبلغ</th>
                <th className="py-3 px-4">مرجع الإيصال</th>
                <th className="py-3 px-4 text-center">حالة التسوية</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredMovements.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center">
                    <div className="flex flex-col items-center justify-center text-slate-400">
                      <Receipt className="w-12 h-12 stroke-[1.5] text-slate-300 mb-3" />
                      <p className="text-sm font-bold text-slate-700">لا توجد حركات مالية مسجلة بعد</p>
                      <p className="text-xs text-slate-400 mt-1">
                        ستظهر تفاصيل المبيعات وعمولات الإدارة والتسويات تلقائيًا عند إتمام الطلبات.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredMovements.map((mov) => (
                  <tr key={mov.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono">
                      <span className="font-bold text-slate-900 block">
                        {new Date(mov.date).toLocaleDateString('ar-EG')}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {new Date(mov.date).toLocaleTimeString('ar-EG', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </td>
                    <td className="py-3 px-4">{getMovementTypeBadge(mov.type)}</td>
                    <td className="py-3 px-4">
                      <p className="font-bold text-slate-800">{mov.description}</p>
                      {mov.notes && (
                        <p className="text-[11px] text-slate-400 mt-0.5">{mov.notes}</p>
                      )}
                    </td>
                    <td className="py-3 px-4 font-black">
                      <span
                        className={`text-sm ${
                          mov.isCredit ? 'text-emerald-700' : 'text-slate-800'
                        }`}
                      >
                        {mov.isCredit ? '+' : '-'}
                        {mov.amount.toLocaleString('ar-EG')} ج.م
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-500">
                      {mov.receiptNumber || '—'}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                        مسواة ومعتمدة
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Settlement Modal */}
      <SettlementModal
        isOpen={showSettlementModal}
        onClose={() => setShowSettlementModal(false)}
        onSave={(amt, rec, nts) => recordSettlement(amt, rec, nts)}
        maxAmount={stats.totalUnsettled}
      />
    </div>
  );
};
