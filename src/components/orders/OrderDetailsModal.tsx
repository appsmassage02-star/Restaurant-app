import React, { useState } from 'react';
import {
  X,
  Phone,
  MapPin,
  Clock,
  Printer,
  Truck,
  CheckCircle,
  AlertTriangle,
  Receipt,
  Utensils,
  PhoneCall,
  User,
  History,
  Info,
  ShieldAlert,
} from 'lucide-react';
import { Order } from '../../types';
import { useApp } from '../../context/AppContext';
import { getArabicStatusLabel, getArabicRouteLabel } from '../../services/orderService';

interface OrderDetailsModalProps {
  order: Order | null;
  onClose: () => void;
  onOpenInvoice: (order: Order) => void;
}

export const OrderDetailsModal: React.FC<OrderDetailsModalProps> = ({
  order,
  onClose,
  onOpenInvoice,
}) => {
  if (!order) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 font-['Cairo',sans-serif]">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-2xl w-full max-h-[92vh] flex flex-col overflow-hidden text-right">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500 text-white rounded-2xl shadow-sm">
              <Receipt className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-slate-900">
                  تفاصيل الطلب #{order.orderNumber}
                </h2>
                <span className="text-[11px] font-mono bg-slate-200 text-slate-700 px-2 py-0.5 rounded-md">
                  {new Date(order.createdAt).toLocaleTimeString('ar-EG', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-200">
                  {getArabicStatusLabel(order.rawStatus || order.status)}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                طريقة الدفع: {order.paymentMethod === 'CASH_ON_DELIVERY' ? 'الدفع نقدًا عند الاستلام (كاش)' : order.paymentMethod}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onOpenInvoice(order)}
              className="p-2 text-slate-600 hover:text-amber-600 hover:bg-white rounded-xl border border-slate-200 transition-colors cursor-pointer"
              title="طباعة فاتورة الطلب"
            >
              <Printer className="w-5 h-5" />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-white rounded-xl border border-slate-200 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 text-xs">
          {/* Execution Route Banner & Explanation */}
          <div
            className={`p-4 rounded-2xl border ${
              order.route === 'SELF_DELIVERY'
                ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
                : 'bg-blue-50/80 border-blue-200 text-blue-950'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2 font-bold">
                {order.route === 'SELF_DELIVERY' ? (
                  <>
                    <Truck className="w-4 h-4 text-emerald-600" />
                    <span>المسار الأول: توصيل ذاتي للمطعم (إلكتروني)</span>
                  </>
                ) : (
                  <>
                    <PhoneCall className="w-4 h-4 text-blue-600" />
                    <span>المسار الثاني: اتصال هاتفي وتوصيل المندوب</span>
                  </>
                )}
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/80 shadow-2xs">
                مسار ثابت عند الإنشاء
              </span>
            </div>

            <p className="text-[11px] leading-relaxed text-slate-700">
              {order.route === 'SELF_DELIVERY'
                ? 'يستقبل المطعم الطلب إلكترونيًا، يجهزه، ويقوم طيار المطعم بتوصيله للعميل. رسوم التوصيل المقررة تذهب للمطعم، وعمولة الإدارة تُخصم فقط من صافي قيمة الطعام بعد الخصم.'
                : 'يتم توجيه هذا الطلب إلى منظومة المندوب المستقل للتأكيد والتوصيل، وتعود رسوم التوصيل للمندوب.'}
            </p>
          </div>

          {/* Customer Information */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
            <h3 className="font-bold text-slate-800 flex items-center gap-1.5 text-xs">
              <User className="w-4 h-4 text-amber-600" />
              بيانات العميل والتسليم
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-slate-500">اسم العميل: </span>
                <span className="font-bold text-slate-900">{order.customer.name}</span>
              </div>
              <div>
                <span className="text-slate-500">رقم الهاتف: </span>
                <span className="font-bold text-slate-900 dir-ltr text-right">
                  {order.customer.phone}
                </span>
              </div>
              <div className="sm:col-span-2">
                <span className="text-slate-500">النطاق الجغرافي: </span>
                <span className="font-bold text-amber-800">
                  {order.customer.governorate}
                  {order.customer.center ? ` — ${order.customer.center}` : ''}
                  {order.customer.area ? ` (${order.customer.area})` : ''}
                </span>
              </div>
              <div className="sm:col-span-2">
                <span className="text-slate-500">العنوان التفصيلي: </span>
                <span className="font-medium text-slate-800">
                  {order.customer.address}
                </span>
              </div>
              {order.rejectionReason && (
                <div className="sm:col-span-2 p-2.5 bg-rose-50 rounded-xl border border-rose-200 text-rose-900">
                  <span className="font-bold">سبب الرفض أو الإلغاء: </span>
                  <span>{order.rejectionReason}</span>
                </div>
              )}
            </div>
          </div>

          {/* Ordered Items List */}
          <div className="space-y-2">
            <h3 className="font-bold text-slate-800 flex items-center gap-1.5 text-xs">
              <Utensils className="w-4 h-4 text-amber-600" />
              أصناف وفاتورة الطلب ({order.items.length})
            </h3>
            <div className="border border-slate-200 rounded-2xl overflow-hidden divide-y divide-slate-100">
              {order.items.length === 0 ? (
                <div className="p-4 text-center text-slate-400">لا توجد تفاصيل أصناف مسجلة لهذا الطلب.</div>
              ) : (
                order.items.map((item, idx) => {
                  const rowTotal = (item.priceAtOrder * item.quantity) - (item.itemDiscount || 0);
                  return (
                    <div key={idx} className="p-3 bg-white hover:bg-slate-50/50 transition-colors">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-md bg-amber-100 text-amber-800 font-bold flex items-center justify-center text-xs">
                              {item.quantity}×
                            </span>
                            <span className="font-bold text-slate-900 text-xs">{item.name}</span>
                          </div>

                          {item.itemDiscount > 0 && (
                            <span className="mt-1 inline-block text-[10px] text-rose-600 font-bold bg-rose-50 px-2 py-0.5 rounded">
                              خصم خاص: -{item.itemDiscount} ج.م
                            </span>
                          )}
                        </div>

                        <div className="text-left font-bold text-slate-900 shrink-0">
                          <span>{rowTotal.toLocaleString('ar-EG')} ج.م</span>
                          {item.quantity > 1 && (
                            <span className="block text-[10px] text-slate-400 font-normal">
                              ({item.priceAtOrder} ج.م للقطعة)
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Financial Calculation Breakdown */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
            <h3 className="font-bold text-slate-800 text-xs border-b border-slate-200 pb-1.5">
              الحسابات المالية وتوزيع المستحقات الفعلية
            </h3>

            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>إجمالي قيمة الطعام قبل الخصم:</span>
                <span className="font-semibold text-slate-900">
                  {order.subtotal.toLocaleString('ar-EG')} ج.م
                </span>
              </div>

              {order.discountTotal > 0 && (
                <div className="flex justify-between text-rose-600 font-medium">
                  <span>الخصومات الممنوحة:</span>
                  <span>-{order.discountTotal.toLocaleString('ar-EG')} ج.م</span>
                </div>
              )}

              <div className="flex justify-between text-slate-800 font-bold border-t border-slate-200/80 pt-1">
                <span>صافي قيمة الطعام بعد الخصم:</span>
                <span>{order.foodTotal.toLocaleString('ar-EG')} ج.م</span>
              </div>

              <div className="flex justify-between text-slate-600">
                <span>رسوم التوصيل:</span>
                <span className="font-semibold text-slate-900">
                  {order.deliveryFee.toLocaleString('ar-EG')} ج.م{' '}
                  <span className="text-[10px] text-slate-400">
                    ({order.route === 'SELF_DELIVERY' ? 'مستحقة للمطعم' : 'مستحقة للمندوب'})
                  </span>
                </span>
              </div>

              <div className="flex justify-between text-slate-950 font-black text-sm border-t border-slate-300 pt-1.5">
                <span>إجمالي ما يدفعه العميل:</span>
                <span className="text-amber-700">
                  {order.grandTotal.toLocaleString('ar-EG')} ج.م
                </span>
              </div>

              {/* Commission deduction breakdown */}
              <div className="mt-2 pt-2 border-t border-dashed border-slate-300 space-y-1 text-[11px] text-slate-600 bg-white p-2.5 rounded-xl border">
                <div className="flex justify-between">
                  <span>
                    عمولة الإدارة ({(order.adminCommissionRate * 100).toFixed(0)}% على صافي الطعام {order.foodTotal} ج.م):
                  </span>
                  <span className="font-bold text-rose-700">
                    -{order.adminCommissionAmount.toLocaleString('ar-EG')} ج.م
                  </span>
                </div>
                <div className="flex justify-between font-black text-emerald-800 pt-1 border-t border-slate-100 text-xs">
                  <span>صافي مستحقات المطعم من هذا الطلب:</span>
                  <span>{order.netRestaurantDue.toLocaleString('ar-EG')} ج.م</span>
                </div>
              </div>
            </div>
          </div>

          {/* Status Timeline History */}
          <div className="space-y-2">
            <h3 className="font-bold text-slate-800 flex items-center gap-1.5 text-xs">
              <History className="w-4 h-4 text-amber-600" />
              سجل تطور وتغير حالات الطلب (المسجل في قاعدة البيانات)
            </h3>
            <div className="space-y-2 pr-2 border-r-2 border-amber-200">
              {order.statusHistory.map((h, i) => (
                <div key={i} className="relative pr-3 text-[11px]">
                  <span className="absolute -right-[19px] top-1 w-2.5 h-2.5 rounded-full bg-amber-500 ring-2 ring-white" />
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-800">
                      {getArabicStatusLabel(h.rawStatus || h.status)}
                    </span>
                    <span className="text-slate-400 font-mono text-[10px]">
                      {new Date(h.timestamp).toLocaleTimeString('ar-EG')}
                    </span>
                    <span className="text-slate-500 font-medium">بواسطة: {h.updatedBy}</span>
                  </div>
                  {h.note && <p className="text-slate-600 mt-0.5">{h.note}</p>}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer Notice & Controlled Actions (Stage 1 Policy) */}
        <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-amber-900 bg-amber-50 border border-amber-200/80 px-3 py-2 rounded-xl w-full sm:w-auto">
            <Info className="w-4 h-4 text-amber-600 shrink-0" />
            <div>
              <span className="font-bold">المرحلة الأولى (الجلب والاستقبال اللحظي): </span>
              <span className="text-slate-700 text-[11px]">
                دورة تغيير حالات الطلب (قبول/رفض/تجهيز) محجوزة للمرحلة الثانية بعد اعتماد الصلاحيات الرسمية.
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={onClose}
              className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold text-xs transition-colors cursor-pointer"
            >
              إغلاق النافذة
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
