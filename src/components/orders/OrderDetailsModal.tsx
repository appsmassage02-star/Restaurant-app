import React, { useState, useEffect, useCallback } from 'react';
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
  Loader2,
  Check,
  XCircle,
  AlertCircle,
  HelpCircle,
  Flame,
  PackageCheck,
} from 'lucide-react';
import { Order } from '../../types';
import { useApp } from '../../context/AppContext';
import { getArabicStatusLabel, getArabicRouteLabel } from '../../services/orderService';
import {
  getOrderWorkflow,
  recordItemFulfillment,
} from '../../services/orderWorkflowService';
import { DbOrderWorkflowItem } from '../../types/database';

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
  const {
    restaurant,
    refreshOrders,
    acceptOrderWorkflow,
    rejectOrderWorkflow,
    setOrderPreparingWorkflow,
    markOrderReadyWorkflow,
    decideCancellationWorkflow,
    requestOrderCancellationWorkflow,
    pendingCancellations,
  } = useApp();

  // Workflow items state
  const [workflowItems, setWorkflowItems] = useState<DbOrderWorkflowItem[]>([]);
  const [loadingWorkflow, setLoadingWorkflow] = useState(false);

  // Fulfillment route selection modal for accepting order
  const [showAcceptDialog, setShowAcceptDialog] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState<'restaurant_delivery' | 'driver_delivery'>(
    restaurant.restaurantDeliveryEnabled ? 'restaurant_delivery' : 'driver_delivery'
  );

  // Reject order dialog
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  // Cancel decision state (when customer or driver requested cancellation)
  const [showCancelRejectDialog, setShowCancelRejectDialog] = useState(false);
  const [cancelRejectReason, setCancelRejectReason] = useState('');

  // Restaurant requested cancellation state
  const [showRestaurantCancelDialog, setShowRestaurantCancelDialog] = useState(false);
  const [restaurantCancelReason, setRestaurantCancelReason] = useState('');

  // Item availability editing state
  const [editingItemQtyId, setEditingItemQtyId] = useState<string | null>(null);
  const [editingQtyValue, setEditingQtyValue] = useState<number>(0);

  // Action status / feedback
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Find if this order has a pending cancellation request
  const pendingCancel = pendingCancellations.find(
    (c) => c.order_id === order?.id && c.status === 'pending'
  );

  // Load workflow items whenever order changes
  const loadWorkflow = useCallback(async (orderId: string) => {
    setLoadingWorkflow(true);
    const res = await getOrderWorkflow(orderId);
    if (res.data) {
      setWorkflowItems(res.data);
    }
    setLoadingWorkflow(false);
  }, []);

  useEffect(() => {
    if (order?.id) {
      loadWorkflow(order.id);
      setSelectedRoute(
        restaurant.restaurantDeliveryEnabled ? 'restaurant_delivery' : 'driver_delivery'
      );
      setActionError(null);
      setActionSuccess(null);
      setShowAcceptDialog(false);
      setShowRejectDialog(false);
      setShowCancelRejectDialog(false);
    }
  }, [order?.id, restaurant.restaurantDeliveryEnabled, loadWorkflow]);

  if (!order) return null;

  // Determine current order status category
  const rawStatus = (order.rawStatus || order.status).toLowerCase();
  const isPending =
    rawStatus === 'pending' ||
    rawStatus === 'placed' ||
    rawStatus === 'submitted' ||
    order.status === 'PENDING';

  const isAccepted =
    rawStatus === 'accepted' ||
    rawStatus === 'awaiting_driver' ||
    rawStatus === 'assigned_to_driver' ||
    order.status === 'ACCEPTED' ||
    order.status === 'AWAITING_DRIVER' ||
    order.status === 'ASSIGNED_TO_DRIVER';

  const isPreparing =
    rawStatus === 'preparing' || order.status === 'PREPARING';

  const isReady =
    rawStatus === 'ready' || order.status === 'READY';

  // Rule 1: Check unresolved missing items
  // احسب الكمية المطلوبة من ordered_quantity
  // لا يعتبر الصنف مكتملاً لمجرد تسجيل الكمية المتاحة إذا كان يحتاج إلى قرار العميل
  const hasUnresolvedMissingItems = workflowItems.some((item) => {
    const ordered = Number(item.ordered_quantity ?? item.requested_quantity ?? 1);
    const available = item.available_quantity;
    if (available === null || available === undefined) {
      return false; // لم يُسجل نقص في هذا الصنف
    }
    if (available >= ordered) {
      return false; // الصنف متوفر بالكامل
    }

    // هنا توجد كمية ناقصة: يجب حسمها بقرار العميل المعتمد (remove_shortage أو substitute)
    const isApproved = item.customer_approved === true || item.is_customer_approved === true;
    const res = item.resolution ?? item.customer_decision;
    const hasValidResolution =
      res === 'remove_shortage' ||
      res === 'substitute' ||
      res === 'remove_item' ||
      res === 'approved_replacement';

    return !(isApproved && hasValidResolution);
  });

  // Rule 2: For driver_delivery (COURIER_PHONE), preparation is blocked until driver is assigned
  const isDriverDelivery =
    order.route === 'COURIER_PHONE' ||
    order.rawRoute === 'driver_delivery' ||
    order.rawRoute === 'courier_phone';

  const isDriverAssigned =
    rawStatus === 'assigned_to_driver' ||
    rawStatus === 'driver_assigned' ||
    order.status === 'ASSIGNED_TO_DRIVER';

  const canStartPreparing =
    (isAccepted || isPending) &&
    !hasUnresolvedMissingItems &&
    (!isDriverDelivery || isDriverAssigned);

  // Handlers
  const handleAcceptOrder = async () => {
    setActionError(null);
    setActionSuccess(null);
    setIsSubmitting(true);

    const res = await acceptOrderWorkflow(order.id, selectedRoute);
    if (!res.success) {
      setActionError(res.error || 'فشل قبول الطلب في قاعدة البيانات.');
    } else {
      setActionSuccess('تم قبول الطلب وتحديد مسار التوصيل بنجاح في قاعدة البيانات.');
      setShowAcceptDialog(false);
      refreshOrders();
      loadWorkflow(order.id);
      setTimeout(() => setActionSuccess(null), 3500);
    }
    setIsSubmitting(false);
  };

  const handleRejectOrder = async () => {
    if (!rejectReason.trim()) {
      setActionError('يرجى كتابة سبب واضح لرفض الطلب.');
      return;
    }
    setActionError(null);
    setActionSuccess(null);
    setIsSubmitting(true);

    const res = await rejectOrderWorkflow(order.id, rejectReason.trim());
    if (!res.success) {
      setActionError(res.error || 'فشل تسجيل رفض الطلب.');
    } else {
      setActionSuccess('تم تسجيل رفض الطلب بنجاح في قاعدة البيانات.');
      setShowRejectDialog(false);
      refreshOrders();
      setTimeout(() => {
        setActionSuccess(null);
        onClose();
      }, 1500);
    }
    setIsSubmitting(false);
  };

  const handleStartPreparing = async () => {
    if (hasUnresolvedMissingItems) {
      setActionError('لا يمكن بدء التجهيز: توجد أصناف ناقصة بانتظار قرار العميل.');
      return;
    }
    if (isDriverDelivery && !isDriverAssigned) {
      setActionError('لا يمكن بدء التجهيز: في دليفري طلباتي يجب إسناد طيار أولاً (assigned_to_driver).');
      return;
    }

    setActionError(null);
    setActionSuccess(null);
    setIsSubmitting(true);

    const res = await setOrderPreparingWorkflow(order.id);
    if (!res.success) {
      setActionError(res.error || 'فشل نقل الطلب إلى التجهيز.');
    } else {
      setActionSuccess('تم بدء تجهيز الطلب في المطبخ بنجاح.');
      refreshOrders();
      loadWorkflow(order.id);
      setTimeout(() => setActionSuccess(null), 3500);
    }
    setIsSubmitting(false);
  };

  const handleMarkReady = async () => {
    setActionError(null);
    setActionSuccess(null);
    setIsSubmitting(true);

    const res = await markOrderReadyWorkflow(order.id);
    if (!res.success) {
      setActionError(res.error || 'فشل تحديد الطلب كجاهز.');
    } else {
      setActionSuccess('تم تحديد الطلب كجاهز للتسليم بنجاح.');
      refreshOrders();
      loadWorkflow(order.id);
      setTimeout(() => setActionSuccess(null), 3500);
    }
    setIsSubmitting(false);
  };

  const handleSaveItemFulfillment = async (orderItemId: string) => {
    setActionError(null);
    setActionSuccess(null);
    setIsSubmitting(true);

    const res = await recordItemFulfillment(orderItemId, editingQtyValue);
    if (!res.success) {
      setActionError(res.error || 'فشل تسجيل توفر الصنف.');
    } else {
      setActionSuccess('تم تسجيل توفر الصنف بنجاح.');
      setEditingItemQtyId(null);
      await loadWorkflow(order.id);
      refreshOrders();
      setTimeout(() => setActionSuccess(null), 3000);
    }
    setIsSubmitting(false);
  };

  const handleDecideCancellation = async (approve: boolean) => {
    if (!pendingCancel) return;
    if (!approve && !cancelRejectReason.trim()) {
      setActionError('يرجى ذكر سبب رفض طلب الإلغاء.');
      return;
    }

    setActionError(null);
    setActionSuccess(null);
    setIsSubmitting(true);

    const res = await decideCancellationWorkflow(
      pendingCancel.id,
      approve,
      approve ? undefined : cancelRejectReason.trim()
    );

    if (!res.success) {
      setActionError(res.error || 'فشل البت في طلب الإلغاء.');
    } else {
      setActionSuccess(
        approve
          ? 'تمت الموافقة على إلغاء الطلب بناءً على رغبة العميل.'
          : 'تم رفض طلب الإلغاء مع إشعار مقدم الطلب بالسبب.'
      );
      setShowCancelRejectDialog(false);
      refreshOrders();
      setTimeout(() => setActionSuccess(null), 3500);
    }
    setIsSubmitting(false);
  };

  const handleRequestRestaurantCancel = async () => {
    if (!restaurantCancelReason.trim()) {
      setActionError('يرجى ذكر سبب واضح لطلب الإلغاء من قِبل المطعم.');
      return;
    }
    setActionError(null);
    setActionSuccess(null);
    setIsSubmitting(true);

    const res = await requestOrderCancellationWorkflow(
      order.id,
      restaurantCancelReason.trim()
    );

    if (!res.success) {
      setActionError(res.error || 'فشل إرسال طلب الإلغاء.');
    } else {
      setActionSuccess('تم إرسال طلب إلغاء الطلب بنجاح إلى الإدارة والمنظومة.');
      setShowRestaurantCancelDialog(false);
      setRestaurantCancelReason('');
      refreshOrders();
      setTimeout(() => setActionSuccess(null), 3500);
    }
    setIsSubmitting(false);
  };

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
                  {getArabicStatusLabel(order.rawStatus || order.status, order.rawRoute || order.route)}
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
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 text-xs">
          {/* Feedback messages */}
          {actionSuccess && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between text-emerald-900 font-bold text-xs">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                <span>{actionSuccess}</span>
              </div>
              <button onClick={() => setActionSuccess(null)} className="text-emerald-600 text-xs">
                إغلاق
              </button>
            </div>
          )}

          {actionError && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex items-center justify-between text-rose-900 font-bold text-xs">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{actionError}</span>
              </div>
              <button onClick={() => setActionError(null)} className="text-rose-600 text-xs">
                إغلاق
              </button>
            </div>
          )}

          {/* Pending Cancellation Alert Banner */}
          {pendingCancel && (
            <div className="p-4 bg-rose-50 border-2 border-rose-300 rounded-2xl space-y-3 shadow-xs">
              <div className="flex items-center gap-2 text-rose-900 font-black text-sm">
                <ShieldAlert className="w-5 h-5 text-rose-600 animate-bounce" />
                <span>
                  {pendingCancel.requested_by_role === 'restaurant'
                    ? 'تنبيه: يوجد طلب إلغاء لهذا الأوردر مرسل من قِبل المطعم'
                    : pendingCancel.requested_by_role === 'driver'
                    ? 'تنبيه: ورد طلب لإلغاء هذا الأوردر من مندوب التوصيل (الطيار)'
                    : pendingCancel.requested_by_role === 'customer'
                    ? 'تنبيه هام: ورد طلب لإلغاء هذا الأوردر من العميل'
                    : 'تنبيه: ورد طلب لإلغاء هذا الأوردر (مصدر الطلب غير متاح)'}
                  !
                </span>
              </div>

              <p className="text-xs text-rose-800 bg-white/70 p-2.5 rounded-xl border border-rose-200">
                <span className="font-bold">
                  سبب الإلغاء المذكور{' '}
                  {pendingCancel.requested_by_role === 'restaurant'
                    ? '(من المطعم)'
                    : pendingCancel.requested_by_role === 'driver'
                    ? '(من الطيار)'
                    : pendingCancel.requested_by_role === 'customer'
                    ? '(من العميل)'
                    : '(المصدر غير محدد)'}
                  :{' '}
                </span>
                <span>{pendingCancel.reason}</span>
              </p>

              {/* إذا كان المطعم هو مقدم الطلب: منع البت الذاتي */}
              {pendingCancel.requested_by_role === 'restaurant' ? (
                <div className="p-3 bg-amber-50 text-amber-900 rounded-xl border border-amber-200 font-medium text-xs leading-relaxed">
                  طلب الإلغاء تم إرساله من قِبل المطعم وهو قيد مراجعة واعتماد الإدارة أو العميل وفق دورة العمل المعتمدة ولا يمكن للمطعم البت فيه ذاتياً.
                </div>
              ) : pendingCancel.requested_by_role === 'unknown' ? (
                /* إذا كان المصدر غير محدد: حظر أزرار القرار لحماية دورة العمل */
                <div className="p-3 bg-slate-100 text-slate-800 rounded-xl border border-slate-300 font-medium text-xs leading-relaxed space-y-1">
                  <div className="font-bold text-slate-900">مصدر طلب الإلغاء غير متاح في بيانات المنظومة:</div>
                  <p className="text-[11px] text-slate-600">
                    تم إيقاف أزرار الموافقة والرفض لحماية دورة العمل؛ حيث لا يمكن اتخاذ قرار إلغاء دون التحقق من هوية مقدم الطلب وصلاحية المطعم في البت فيه. يلزم تحديث دالة RPC في قاعدة البيانات لإرجاع هوية ودور مقدم الطلب.
                  </p>
                </div>
              ) : pendingCancel.requested_by_role === 'driver' ? (
                /* إذا كان الطلب من الطيار: يتطلب مراجعة الإدارة */
                <div className="p-3 bg-blue-50 text-blue-900 rounded-xl border border-blue-200 font-medium text-xs leading-relaxed">
                  طلب الإلغاء مقدم من كابتن التوصيل (الطيار) وهو قيد مراجعة واعتماد الإدارة وفق دورة العمل المعتمدة.
                </div>
              ) : showCancelRejectDialog ? (
                /* يظهر هذا الخيار فقط وفقط عندما يكون مقدم الطلب عميلاً مؤكداً */
                <div className="space-y-2 pt-1 bg-white p-3 rounded-xl border border-rose-200">
                  <label className="block font-bold text-slate-800 text-xs">
                    سبب رفض إلغاء الطلب (سيظهر للعميل) *
                  </label>
                  <input
                    type="text"
                    value={cancelRejectReason}
                    onChange={(e) => setCancelRejectReason(e.target.value)}
                    placeholder="مثال: تم إعداد وتجهيز الوجبة بالكامل ولا يمكن التراجع..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-rose-500 font-medium"
                  />
                  <div className="flex items-center gap-2 justify-end pt-1">
                    <button
                      onClick={() => setShowCancelRejectDialog(false)}
                      disabled={isSubmitting}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold text-xs"
                    >
                      تراجع
                    </button>
                    <button
                      onClick={() => handleDecideCancellation(false)}
                      disabled={isSubmitting || !cancelRejectReason.trim()}
                      className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold text-xs flex items-center gap-1.5"
                    >
                      {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                      <span>تأكيد رفض الإلغاء</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* تظهر أزرار الموافقة والرفض فقط إذا كان الطلب من العميل بصورة مؤكدة */
                <div className="flex items-center gap-2 justify-end pt-1">
                  <button
                    onClick={() => setShowCancelRejectDialog(true)}
                    disabled={isSubmitting}
                    className="px-4 py-2 bg-white hover:bg-slate-100 text-rose-700 font-bold border border-rose-300 rounded-xl text-xs transition-colors cursor-pointer"
                  >
                    رفض طلب الإلغاء
                  </button>
                  <button
                    onClick={() => handleDecideCancellation(true)}
                    disabled={isSubmitting}
                    className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-black rounded-xl text-xs transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>الموافقة على الإلغاء</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Driver Information Card (when courier is assigned) */}
          {order.driverInfo && (
            <div className="bg-indigo-50/90 border border-indigo-200 p-3.5 rounded-2xl flex items-center justify-between gap-3 text-xs shadow-2xs">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 bg-indigo-600 text-white rounded-xl shadow-xs">
                  <Truck className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-black text-indigo-950">
                      كابتن التوصيل: {order.driverInfo.name}
                    </span>
                    {order.driverInfo.assignedAt && (
                      <span className="text-[10px] text-indigo-700 font-mono bg-indigo-100 px-2 py-0.5 rounded-md">
                        إسناد: {new Date(order.driverInfo.assignedAt).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </div>
                  {order.driverInfo.phone ? (
                    <span className="text-slate-600 text-[11px] font-mono dir-ltr block text-right mt-0.5">
                      هاتف: {order.driverInfo.phone}
                    </span>
                  ) : (
                    <span className="text-slate-400 text-[10px] block mt-0.5">
                      رقم الهاتف غير مسجل
                    </span>
                  )}
                </div>
              </div>
              {order.driverInfo.phone && (
                <a
                  href={`tel:${order.driverInfo.phone}`}
                  className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>اتصال</span>
                </a>
              )}
            </div>
          )}

          {/* Fulfillment Route Banner */}
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
                    <span>المسار: توصيل ذاتي للمطعم (دليفري المطعم)</span>
                  </>
                ) : (
                  <>
                    <PhoneCall className="w-4 h-4 text-blue-600" />
                    <span>المسار: دليفري طلباتي (كابتن المنظومة)</span>
                  </>
                )}
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/80 shadow-2xs">
                {order.route === 'SELF_DELIVERY' ? 'رسوم التوصيل للمطعم' : 'رسوم التوصيل للمندوب'}
              </span>
            </div>

            <p className="text-[11px] leading-relaxed text-slate-700">
              {order.route === 'SELF_DELIVERY'
                ? 'يستقبل المطعم الطلب، يجهزه، ويقوم طيار المطعم بتوصيله للعميل. رسوم التوصيل المقررة تذهب للمطعم، وعمولة الإدارة تُخصم فقط من صافي قيمة الطعام بعد الخصم.'
                : 'يتم توجيه هذا الطلب إلى شبكة كباتن طلباتي. لا يمكن بدء التجهيز في هذا المسار إلا بعد إسناد طيار للطلب.'}
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

          {/* Ordered Items List & Missing Items Management */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-800 flex items-center gap-1.5 text-xs">
                <Utensils className="w-4 h-4 text-amber-600" />
                أصناف الطلب وتأكيد التوفر والنواقص ({order.items.length})
              </h3>
              {loadingWorkflow && (
                <span className="text-[11px] text-amber-600 flex items-center gap-1">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  تحديث حالة النواقص...
                </span>
              )}
            </div>

            <div className="border border-slate-200 rounded-2xl overflow-hidden divide-y divide-slate-100">
              {order.items.length === 0 ? (
                <div className="p-4 text-center text-slate-400">لا توجد تفاصيل أصناف مسجلة لهذا الطلب.</div>
              ) : (
                order.items.map((item, idx) => {
                  const rowTotal = item.priceAtOrder * item.quantity - (item.itemDiscount || 0);

                  // Find matching workflow item if available
                  const itemId = item.id || item.itemId;
                  const wf = workflowItems.find(
                    (w) =>
                      w.order_item_id === itemId ||
                      w.item_name === item.name ||
                      (w as any).item_name_snapshot === item.name
                  );

                  const orderedQty = Number(
                    wf?.ordered_quantity ?? wf?.requested_quantity ?? item.quantity
                  );
                  const availableQty = wf?.available_quantity;
                  const approvedQty = wf?.approved_quantity ?? wf?.customer_approved_quantity;
                  const isShortage =
                    availableQty !== null &&
                    availableQty !== undefined &&
                    availableQty < orderedQty;

                  const resolution = wf?.resolution ?? wf?.customer_decision;
                  const subName = wf?.substitute_name ?? wf?.substitute_item_name;
                  const subPrice = wf?.substitute_unit_price ?? wf?.substitute_price;

                  const isEditingQty = editingItemQtyId === (wf?.order_item_id || itemId);

                  return (
                    <div key={idx} className="p-3 bg-white hover:bg-slate-50/50 transition-colors space-y-2">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-md bg-amber-100 text-amber-800 font-bold flex items-center justify-center text-xs">
                              {orderedQty}×
                            </span>
                            <span className="font-bold text-slate-900 text-xs">{item.name}</span>
                          </div>

                          {/* خيارات وإضافات الصنف الفعلية */}
                          {item.selectedOptions && item.selectedOptions.length > 0 && (
                            <div className="mt-1 flex flex-wrap gap-1">
                              {item.selectedOptions.map((opt, oIdx) => (
                                <span
                                  key={oIdx}
                                  className="inline-flex items-center gap-1 text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md border border-slate-200"
                                >
                                  <span className="font-semibold">{opt.groupName}:</span>
                                  <span>{opt.optionName}</span>
                                  {opt.price > 0 && (
                                    <span className="text-amber-700 font-mono font-medium">(+{opt.price} ج.م)</span>
                                  )}
                                </span>
                              ))}
                            </div>
                          )}

                          {item.itemDiscount > 0 && (
                            <span className="mt-1 inline-block text-[10px] text-rose-600 font-bold bg-rose-50 px-2 py-0.5 rounded">
                              خصم خاص: -{item.itemDiscount} ج.م
                            </span>
                          )}
                        </div>

                        <div className="text-left font-bold text-slate-900 shrink-0">
                          <span>{rowTotal.toLocaleString('ar-EG')} ج.م</span>
                          {orderedQty > 1 && (
                            <span className="block text-[10px] text-slate-400 font-normal">
                              ({item.priceAtOrder} ج.م للقطعة)
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Item Fulfillment & Shortage Status Bar */}
                      <div className="bg-slate-50 p-2 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                        <div className="flex items-center gap-2">
                          <span className="text-slate-500 font-medium">الكمية المطلوبة:</span>
                          <span className="font-bold text-slate-800">{orderedQty}</span>

                          <span className="text-slate-400">|</span>

                          <span className="text-slate-500 font-medium">المتوفر بالمطبخ:</span>
                          <span className="font-bold text-slate-900">
                            {availableQty !== null && availableQty !== undefined
                              ? `${availableQty} قطعة`
                              : `${orderedQty} قطعة (افتراضي)`}
                          </span>

                          {approvedQty !== null && approvedQty !== undefined && (
                            <>
                              <span className="text-slate-400">|</span>
                              <span className="text-slate-500 font-medium">الكمية المعتمدة:</span>
                              <span className="font-bold text-emerald-800">{approvedQty} قطعة</span>
                            </>
                          )}
                        </div>

                        {/* Customer Decision Badge */}
                        {isShortage && (
                          <div className="flex items-center gap-1.5">
                            {resolution === 'remove_shortage' || resolution === 'remove_item' ? (
                              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-md font-bold text-[10px] flex items-center gap-1">
                                <CheckCircle className="w-3 h-3 text-emerald-600" />
                                <span>
                                  وافق العميل على حذف الكمية الناقصة
                                  {approvedQty !== null && approvedQty !== undefined
                                    ? ` (المعتمد: ${approvedQty} قطعة)`
                                    : ''}
                                </span>
                              </span>
                            ) : resolution === 'substitute' || resolution === 'approved_replacement' ? (
                              <span className="px-2 py-0.5 bg-blue-100 text-blue-800 border border-blue-200 rounded-md font-bold text-[10px] flex items-center gap-1">
                                <CheckCircle className="w-3 h-3 text-blue-600" />
                                <span>
                                  وافق العميل على البديل: {subName || 'صنف بديل'}
                                  {subPrice !== null && subPrice !== undefined ? ` (${subPrice} ج.م)` : ''}
                                </span>
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 bg-amber-100 text-amber-800 border border-amber-300 rounded-md font-bold text-[10px] flex items-center gap-1 animate-pulse">
                                <HelpCircle className="w-3 h-3 text-amber-600" />
                                <span>بانتظار قرار العميل على النقص</span>
                              </span>
                            )}
                          </div>
                        )}

                        {/* Inline quantity update for missing items */}
                        {(isPending || isAccepted) && (
                          <div className="mr-auto flex items-center gap-1.5">
                            {isEditingQty ? (
                              <div className="flex items-center gap-1">
                                <input
                                  type="number"
                                  min="0"
                                  max={orderedQty}
                                  value={editingQtyValue}
                                  onChange={(e) => setEditingQtyValue(parseInt(e.target.value) || 0)}
                                  className="w-14 px-2 py-0.5 bg-white border border-amber-400 rounded-md font-bold text-center text-xs"
                                />
                                <button
                                  onClick={() => handleSaveItemFulfillment(wf?.order_item_id || itemId)}
                                  disabled={isSubmitting}
                                  className="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-[10px] font-bold"
                                  title="حفظ الكمية المتاحة"
                                >
                                  حفظ
                                </button>
                                <button
                                  onClick={() => setEditingItemQtyId(null)}
                                  className="px-1.5 py-0.5 text-slate-400 hover:text-slate-600 text-[10px]"
                                >
                                  إلغاء
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => {
                                  setEditingItemQtyId(wf?.order_item_id || itemId);
                                  setEditingQtyValue(availableQty ?? orderedQty);
                                }}
                                className="px-2 py-0.5 bg-white hover:bg-amber-50 text-amber-800 font-bold border border-slate-200 rounded-md text-[10px] cursor-pointer"
                              >
                                تسجيل نقص الصنف
                              </button>
                            )}
                          </div>
                        )}
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
                      {getArabicStatusLabel(h.rawStatus || h.status, order.rawRoute || order.route)}
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

        {/* Phase 2 Interactive Action Flow Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50 space-y-3">
          {/* Sub-Dialog: Acceptance Route Selector */}
          {showAcceptDialog && (
            <div className="p-4 bg-white rounded-2xl border-2 border-amber-400 shadow-md space-y-3">
              <h4 className="font-black text-slate-900 text-xs flex items-center gap-1.5">
                <Truck className="w-4 h-4 text-amber-600" />
                اختر طريقة التوصيل لقبول الطلب:
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {/* Option 1: Restaurant Delivery */}
                <label
                  className={`p-3 rounded-xl border flex items-start gap-2.5 cursor-pointer transition-all ${
                    !restaurant.restaurantDeliveryEnabled
                      ? 'bg-slate-100 border-slate-200 opacity-60 cursor-not-allowed'
                      : selectedRoute === 'restaurant_delivery'
                      ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-500/20'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="route_choice"
                    value="restaurant_delivery"
                    disabled={!restaurant.restaurantDeliveryEnabled}
                    checked={selectedRoute === 'restaurant_delivery'}
                    onChange={() => setSelectedRoute('restaurant_delivery')}
                    className="mt-0.5 text-emerald-600 focus:ring-emerald-500"
                  />
                  <div>
                    <span className="font-bold text-slate-900 block">دليفري المطعم (توصيل ذاتي)</span>
                    <span className="text-[11px] text-slate-500 block">
                      يقوم طيار المطعم بتوصيل الطلب للعميل مباشرة.
                    </span>
                    {!restaurant.restaurantDeliveryEnabled && (
                      <span className="text-[10px] text-rose-600 font-bold block mt-1">
                        (غير مفعل في إعدادات المطعم)
                      </span>
                    )}
                  </div>
                </label>

                {/* Option 2: Talabaty Driver Delivery */}
                <label
                  className={`p-3 rounded-xl border flex items-start gap-2.5 cursor-pointer transition-all ${
                    selectedRoute === 'driver_delivery'
                      ? 'bg-blue-50 border-blue-500 ring-2 ring-blue-500/20'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="route_choice"
                    value="driver_delivery"
                    checked={selectedRoute === 'driver_delivery'}
                    onChange={() => setSelectedRoute('driver_delivery')}
                    className="mt-0.5 text-blue-600 focus:ring-blue-500"
                  />
                  <div>
                    <span className="font-bold text-slate-900 block">دليفري طلباتي (مندوب)</span>
                    <span className="text-[11px] text-slate-500 block">
                      إسناد الطلب لشبكة كباتن التوصيل بمنظومة طلباتي.
                    </span>
                  </div>
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  onClick={() => setShowAcceptDialog(false)}
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  onClick={handleAcceptOrder}
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl text-xs flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>تأكيد قبول الطلب</span>
                </button>
              </div>
            </div>
          )}

          {/* Sub-Dialog: Rejection Prompt */}
          {showRejectDialog && (
            <div className="p-4 bg-white rounded-2xl border-2 border-rose-400 shadow-md space-y-3">
              <h4 className="font-black text-rose-900 text-xs flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                يرجى كتابة سبب رفض الطلب (إلزامي):
              </h4>
              <textarea
                rows={2}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="مثال: انتهاء بعض المكونات الأساسية، المطعم لديه ضغط طلبات كبير..."
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-rose-500"
              />
              <div className="flex items-center justify-end gap-2">
                <button
                  onClick={() => setShowRejectDialog(false)}
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  onClick={handleRejectOrder}
                  disabled={isSubmitting || !rejectReason.trim()}
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-black rounded-xl text-xs flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>تأكيد الرفض</span>
                </button>
              </div>
            </div>
          )}

          {/* Sub-Dialog: Restaurant Request Cancellation Prompt */}
          {showRestaurantCancelDialog && (
            <div className="p-4 bg-white rounded-2xl border-2 border-rose-400 shadow-md space-y-3">
              <h4 className="font-black text-rose-900 text-xs flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                طلب إلغاء الأوردر من إدارة المطعم (إلزامي ذكر السبب):
              </h4>
              <textarea
                rows={2}
                value={restaurantCancelReason}
                onChange={(e) => setRestaurantCancelReason(e.target.value)}
                placeholder="مثال: تعذر إكمال الطلب بسبب مشكلة طارئة في المطبخ..."
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-rose-500 font-medium"
              />
              <div className="flex items-center justify-end gap-2">
                <button
                  onClick={() => setShowRestaurantCancelDialog(false)}
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs cursor-pointer"
                >
                  تراجع
                </button>
                <button
                  onClick={handleRequestRestaurantCancel}
                  disabled={isSubmitting || !restaurantCancelReason.trim()}
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-black rounded-xl text-xs flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>إرسال طلب الإلغاء</span>
                </button>
              </div>
            </div>
          )}

          {/* Action Buttons Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            {/* Status condition notes / tooltips */}
            <div className="text-[11px] text-slate-500">
              {hasUnresolvedMissingItems && (
                <span className="text-amber-700 font-bold block">
                  • يوجد نقص في الأصناف بانتظار قرار العميل قبل السماح ببدء التجهيز.
                </span>
              )}
              {isDriverDelivery && !isDriverAssigned && isAccepted && (
                <span className="text-blue-700 font-bold block">
                  • في توصيل طلباتي: لا يمكن بدء التجهيز إلا بعد إسناد طيار للطلب.
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 self-end sm:self-center">
              {/* If Order is Pending: Show Accept & Reject */}
              {isPending && !showAcceptDialog && !showRejectDialog && (
                <>
                  <button
                    onClick={() => setShowRejectDialog(true)}
                    disabled={isSubmitting}
                    className="px-4 py-2 bg-rose-100 hover:bg-rose-200 text-rose-800 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                  >
                    رفض الطلب
                  </button>
                  <button
                    onClick={() => setShowAcceptDialog(true)}
                    disabled={isSubmitting}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl text-xs flex items-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <CheckCircle className="w-4 h-4" />
                    <span>قبول الطلب...</span>
                  </button>
                </>
              )}

              {/* If Order is Accepted / Awaiting Driver: Show Start Preparing */}
              {isAccepted && !isPreparing && (
                <button
                  onClick={handleStartPreparing}
                  disabled={isSubmitting || !canStartPreparing}
                  className="px-5 py-2 bg-orange-600 hover:bg-orange-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-black rounded-xl text-xs flex items-center gap-1.5 shadow-xs cursor-pointer disabled:cursor-not-allowed"
                  title={
                    !canStartPreparing
                      ? hasUnresolvedMissingItems
                        ? 'بانتظار قرار العميل على الأصناف الناقصة'
                        : 'بانتظار إسناد كابتن للطلب'
                      : 'نقل الطلب لحالة قيد التجهيز في المطبخ'
                  }
                >
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Flame className="w-4 h-4" />
                  )}
                  <span>بدء التجهيز بالمطبخ</span>
                </button>
              )}

              {/* If Order is Preparing: Show Mark Ready */}
              {isPreparing && (
                <button
                  onClick={handleMarkReady}
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white font-black rounded-xl text-xs flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <PackageCheck className="w-4 h-4" />
                  )}
                  <span>جاهز للتسليم</span>
                </button>
              )}

              {/* If Order is Ready: Notice */}
              {isReady && (
                <span className="px-3 py-1.5 bg-purple-50 text-purple-900 border border-purple-200 rounded-xl font-bold text-xs flex items-center gap-1">
                  <Check className="w-3.5 h-3.5 text-purple-600" />
                  <span>الطلب جاهز وبانتظار الاستلام للتوصيل</span>
                </span>
              )}

              {/* Button for restaurant to request cancellation if order is in progress and no cancel request is pending */}
              {(isAccepted || isPreparing) && !isReady && !pendingCancel && !showRestaurantCancelDialog && (
                <button
                  onClick={() => setShowRestaurantCancelDialog(true)}
                  disabled={isSubmitting}
                  className="px-3.5 py-2 bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-700 font-bold rounded-xl text-xs transition-colors cursor-pointer border border-slate-200"
                  title="إرسال طلب إلغاء هذا الطلب من إدارة المطعم"
                >
                  طلب إلغاء الأوردر
                </button>
              )}

              <button
                onClick={onClose}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold text-xs transition-colors cursor-pointer"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
