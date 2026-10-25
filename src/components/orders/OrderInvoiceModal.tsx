import React from 'react';
import { X, Printer, Store, CheckCircle, ShieldCheck } from 'lucide-react';
import { Order } from '../../types';
import { useApp } from '../../context/AppContext';

interface OrderInvoiceModalProps {
  order: Order | null;
  onClose: () => void;
}

export const OrderInvoiceModal: React.FC<OrderInvoiceModalProps> = ({ order, onClose }) => {
  const { restaurant } = useApp();

  if (!order) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden text-right">
        {/* Controls Bar (hidden during browser print) */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50 print:hidden">
          <div className="flex items-center gap-2">
            <Printer className="w-5 h-5 text-amber-600" />
            <h3 className="text-sm font-bold text-slate-800">فاتورة الطلب الإلكترونية</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 font-bold text-xs text-slate-950 rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>طباعة الفاتورة</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Invoice Receipt Body */}
        <div id="printable-receipt" className="p-6 sm:p-8 space-y-5 font-mono text-xs">
          {/* Header */}
          <div className="text-center pb-4 border-b-2 border-dashed border-slate-300">
            <div className="w-12 h-12 bg-amber-100 text-amber-800 rounded-2xl mx-auto flex items-center justify-center mb-2 font-bold">
              <Store className="w-6 h-6" />
            </div>
            <h2 className="text-base font-black text-slate-900 font-sans">{restaurant.name}</h2>
            <p className="text-[11px] text-slate-500 mt-0.5 font-sans">
              منظومة طلبات البيت — {restaurant.city}
            </p>
            <p className="text-[11px] text-slate-500 font-sans">هاتف: {restaurant.phone}</p>
          </div>

          {/* Order Meta */}
          <div className="grid grid-cols-2 gap-2 text-[11px] pb-3 border-b border-dashed border-slate-200">
            <div>
              <span className="text-slate-500">رقم الفاتورة: </span>
              <span className="font-bold text-slate-900 font-mono">#{order.orderNumber}</span>
            </div>
            <div className="text-left dir-ltr">
              <span className="text-slate-500">التاريخ: </span>
              <span className="font-mono text-slate-900">
                {new Date(order.createdAt).toLocaleDateString('ar-EG')} - {new Date(order.createdAt).toLocaleTimeString('ar-EG')}
              </span>
            </div>
            <div className="col-span-2">
              <span className="text-slate-500">العميل: </span>
              <span className="font-bold text-slate-900 font-sans">{order.customer.name}</span>
            </div>
            <div className="col-span-2">
              <span className="text-slate-500">العنوان: </span>
              <span className="text-slate-800 font-sans">{order.customer.address}</span>
            </div>
            <div>
              <span className="text-slate-500">مسار التوصيل: </span>
              <span className="font-bold font-sans">
                {order.route === 'SELF_DELIVERY' ? 'دليفري المطعم الذاتي' : 'مندوب هاتف'}
              </span>
            </div>
            <div className="text-left">
              <span className="text-slate-500">حالة الفاتورة: </span>
              <span className="font-bold text-emerald-700 font-sans">معتمدة ومصدرة</span>
            </div>
          </div>

          {/* Table Items */}
          <div className="space-y-2">
            <div className="flex justify-between font-bold text-slate-500 text-[11px] border-b border-slate-200 pb-1">
              <span>الصنف والخيارات</span>
              <span className="w-12 text-center">الكمية</span>
              <span className="w-20 text-left">الإجمالي</span>
            </div>

            {order.items.map((item, idx) => {
              const addOns = item.selectedOptions.reduce((s, o) => s + o.price, 0);
              const singlePrice = item.priceAtOrder + addOns;
              const lineTotal = singlePrice * item.quantity;
              return (
                <div key={idx} className="space-y-1 text-slate-800 py-1 border-b border-slate-100">
                  <div className="flex justify-between items-start">
                    <span className="font-bold font-sans">{item.name}</span>
                    <span className="w-12 text-center font-bold">{item.quantity}</span>
                    <span className="w-20 text-left font-bold">{lineTotal} ج.م</span>
                  </div>
                  {item.selectedOptions.length > 0 && (
                    <div className="text-[10px] text-slate-500 pr-2">
                      {item.selectedOptions.map((o) => o.optionName).join(' + ')}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Totals */}
          <div className="pt-2 border-t-2 border-dashed border-slate-300 space-y-1.5 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>قيمة الطعام:</span>
              <span>{order.subtotal} ج.م</span>
            </div>
            {order.discountTotal > 0 && (
              <div className="flex justify-between text-rose-600">
                <span>الخصم المطبق:</span>
                <span>-{order.discountTotal} ج.م</span>
              </div>
            )}
            <div className="flex justify-between text-slate-800 font-bold">
              <span>صافي الطعام:</span>
              <span>{order.foodTotal} ج.م</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>خدمة التوصيل:</span>
              <span>{order.deliveryFee} ج.م</span>
            </div>
            <div className="flex justify-between text-base font-black text-slate-900 border-t-2 border-slate-900 pt-2">
              <span>المطلوب دفعه كاش:</span>
              <span>{order.grandTotal} جنيه مصري</span>
            </div>
          </div>

          {/* Footer note */}
          <div className="pt-4 border-t border-dashed border-slate-300 text-center text-[10px] text-slate-400 font-sans space-y-1">
            <p>شكرًا لطلبكم من {restaurant.name} عبر منظومة «طلبات البيت»</p>
            <p>فاتورة إلكترونية معتمدة بعد موافقة المطعم</p>
          </div>
        </div>
      </div>
    </div>
  );
};
