/**
 * خدمة الطلبات المركزية لتطبيق المطعم — منظومة طلبات البيت (المرحلة الأولى)
 * مسؤولة عن:
 * 1. جلب الطلبات من جدول public.restaurant_orders المطابقة لـ restaurant_id فقط
 * 2. جلب تفاصيل الأصناف من public.restaurant_order_items
 * 3. جلب سجل الحالات من public.restaurant_order_status_history
 * 4. ربط السجلات بالأرقام والأنواع الصحيحة
 * 5. معالجة أخطاء RLS والشبكة بشفافية دون إخفائها أو عرض نتائج فارغة وهمية
 */

import { supabase, isSupabaseConfigured } from './supabase';
import {
  DbRestaurantOrder,
  DbRestaurantOrderItem,
  DbRestaurantOrderStatusHistory,
} from '../types/database';
import { Order, OrderItem, OrderStatus, OrderStatusHistory, ExecutionRoute } from '../types';

export interface OrdersFetchResult {
  orders: Order[];
  error: string | null;
}

export interface SingleOrderFetchResult {
  order: Order | null;
  error: string | null;
}

/**
 * تحويل مسار التنفيذ من صيغة قاعدة البيانات إلى صيغة واجهة العرض
 */
export function mapDbRouteToExecutionRoute(dbRoute: string): ExecutionRoute {
  if (dbRoute === 'restaurant_delivery') {
    return 'SELF_DELIVERY';
  }
  return 'COURIER_PHONE';
}

/**
 * تحويل حالة الطلب الفعلية في قاعدة البيانات إلى تصنيف واجهة المطعم
 */
export function mapDbStatusToOrderStatus(dbStatus: string): OrderStatus {
  const s = (dbStatus || '').toLowerCase().trim();
  switch (s) {
    case 'pending':
    case 'awaiting_restaurant_confirmation':
      return 'PENDING';
    case 'accepted':
      return 'ACCEPTED';
    case 'awaiting_driver':
    case 'searching_driver':
    case 'awaiting_driver_assignment':
      return 'AWAITING_DRIVER';
    case 'assigned_to_driver':
    case 'driver_assigned':
      return 'ASSIGNED_TO_DRIVER';
    case 'preparing':
      return 'PREPARING';
    case 'ready':
      return 'READY';
    case 'picked_up':
      return 'PICKED_UP';
    case 'on_the_way':
      return 'ON_THE_WAY';
    case 'delivered':
      return 'DELIVERED';
    case 'completed':
      return 'COMPLETED';
    case 'rejected':
      return 'REJECTED';
    case 'cancelled':
      return 'CANCELLED';
    default:
      return 'PENDING';
  }
}

/**
 * الحصول على تسمية الحالة بالعربية الفصحى الدقيقة
 */
export function getArabicStatusLabel(dbStatus: string | OrderStatus): string {
  const s = String(dbStatus || '').toLowerCase().trim();
  switch (s) {
    case 'pending':
      return 'بانتظار القبول';
    case 'awaiting_restaurant_confirmation':
      return 'بانتظار موافقة المطعم';
    case 'accepted':
      return 'تم القبول';
    case 'awaiting_driver':
    case 'searching_driver':
    case 'awaiting_driver_assignment':
      return 'بانتظار تأمين سائق';
    case 'assigned_to_driver':
    case 'driver_assigned':
      return 'تم تأمين السائق';
    case 'preparing':
      return 'جاري التجهيز';
    case 'ready':
      return 'جاهز للتسليم';
    case 'picked_up':
      return 'تم الاستلام';
    case 'on_the_way':
      return 'في الطريق';
    case 'delivered':
      return 'تم التوصيل';
    case 'completed':
      return 'مكتمل ومسلّم';
    case 'rejected':
      return 'مرفوض';
    case 'cancelled':
      return 'ملغي';
    default:
      return dbStatus || 'غير محدد';
  }
}

/**
 * الحصول على تسمية مسار التنفيذ بالعربية
 */
export function getArabicRouteLabel(route: string | ExecutionRoute): string {
  if (route === 'restaurant_delivery' || route === 'SELF_DELIVERY') {
    return 'توصيل ذاتي للمطعم';
  }
  if (route === 'driver_delivery' || route === 'COURIER_PHONE') {
    return 'اتصال وتوصيل مندوب';
  }
  return String(route || 'غير محدد');
}

/**
 * دمج وتحويل سجلات قاعدة البيانات إلى نموذج الطلب المعتمد في التطبيق
 */
export function mapDbOrderToAppOrder(
  dbOrder: DbRestaurantOrder,
  orderItems: DbRestaurantOrderItem[] = [],
  statusHistory: DbRestaurantOrderStatusHistory[] = []
): Order {
  const foodSubtotal = Number(dbOrder.food_subtotal) || 0;
  const discountTotal = Number(dbOrder.discount_amount) || 0;
  const foodTotal = Math.max(0, foodSubtotal - discountTotal);
  const deliveryFee = Number(dbOrder.delivery_fee) || 0;
  const grandTotal = Number(dbOrder.customer_total) || foodTotal + deliveryFee;

  // لا نضع أي نسبة عمولة افتراضية من عندنا — نعتمد حصرياً على البيانات الفعلية
  const commissionRatePct =
    dbOrder.commission_percent_snapshot !== undefined && dbOrder.commission_percent_snapshot !== null
      ? Number(dbOrder.commission_percent_snapshot)
      : null;
  const adminCommissionRate = commissionRatePct !== null ? commissionRatePct / 100 : 0;
  const adminFeeShare =
    dbOrder.admin_fee_share !== undefined && dbOrder.admin_fee_share !== null
      ? Number(dbOrder.admin_fee_share)
      : (commissionRatePct !== null ? Number((foodTotal * adminCommissionRate).toFixed(2)) : 0);

  const restaurantFeeShare =
    dbOrder.restaurant_fee_share !== undefined && dbOrder.restaurant_fee_share !== null
      ? Number(dbOrder.restaurant_fee_share)
      : dbOrder.fulfillment_route === 'restaurant_delivery'
      ? foodTotal - adminFeeShare + deliveryFee
      : foodTotal - adminFeeShare;

  const driverFeeShare =
    dbOrder.driver_fee_share !== undefined && dbOrder.driver_fee_share !== null
      ? Number(dbOrder.driver_fee_share)
      : dbOrder.fulfillment_route === 'driver_delivery'
      ? deliveryFee
      : 0;

  // تحويل الأصناف
  const items: OrderItem[] = orderItems.map((item) => {
    const unitPrice = Number(item.unit_price_snapshot) || 0;
    const qty = Number(item.quantity) || 1;
    const discount = Number(item.discount_amount) || 0;
    return {
      id: item.id,
      itemId: item.menu_item_id || item.id,
      name: item.item_name_snapshot || 'صنف بدون اسم',
      priceAtOrder: unitPrice,
      quantity: qty,
      selectedOptions: [],
      itemDiscount: discount,
      notes: undefined,
    };
  });

  // تحويل سجل الحالات الفعلي فقط من قاعدة البيانات (دون اختراع سجلات وهمية)
  const history: OrderStatusHistory[] = statusHistory.map((h) => ({
    status: mapDbStatusToOrderStatus(h.new_status),
    rawStatus: h.new_status,
    timestamp: h.created_at || dbOrder.created_at,
    note: h.note || undefined,
    updatedBy: h.changed_by || 'نظام طلبات البيت',
  }));

  const governorate =
    dbOrder.delivery_governorate_name_snapshot || 'غير محدد';
  const center =
    dbOrder.delivery_center_name_snapshot || '';
  const area =
    dbOrder.delivery_area_name_snapshot || '';

  return {
    id: dbOrder.id,
    orderNumber: String(dbOrder.order_number),
    createdAt: dbOrder.created_at,
    customer: {
      name: dbOrder.customer_name || 'عميل طلبات البيت',
      phone: dbOrder.customer_phone || '',
      address: dbOrder.delivery_address || 'العنوان غير محدد',
      governorate,
      city: center || governorate,
      center,
      area,
    },
    items,
    subtotal: foodSubtotal,
    discountTotal,
    foodTotal,
    deliveryFee,
    grandTotal,
    paymentMethod: dbOrder.payment_method || 'CASH_ON_DELIVERY',
    route: mapDbRouteToExecutionRoute(dbOrder.fulfillment_route),
    rawRoute: dbOrder.fulfillment_route,
    status: mapDbStatusToOrderStatus(dbOrder.status),
    rawStatus: dbOrder.status,
    rejectionReason: dbOrder.cancellation_reason || undefined,
    statusHistory: history,
    adminCommissionRate,
    adminCommissionAmount: adminFeeShare,
    netRestaurantDue: restaurantFeeShare,
    settlementStatus: 'PENDING',
    adminFeeShare,
    restaurantFeeShare,
    driverFeeShare,
    deliveryGovernorateSnapshot: dbOrder.delivery_governorate_name_snapshot || undefined,
    deliveryCenterSnapshot: dbOrder.delivery_center_name_snapshot || undefined,
    deliveryAreaSnapshot: dbOrder.delivery_area_name_snapshot || undefined,
  };
}

/**
 * جلب جميع طلبات المطعم الفعلي من Supabase
 * مرتبة تنازليًا حسب created_at
 * مع جلب تفاصيل الأصناف وسجل الحالات
 */
export async function fetchRestaurantOrders(
  restaurantId: string
): Promise<OrdersFetchResult> {
  if (!isSupabaseConfigured) {
    return {
      orders: [],
      error: 'إعدادات الاتصال بـ Supabase غير مهيأة. يرجى توفير مفاتيح الاتصال.',
    };
  }

  if (!restaurantId || !restaurantId.trim()) {
    return {
      orders: [],
      error: 'معرف المطعم غير محدد.',
    };
  }

  try {
    // 1. جلب سجلات الطلبات للمطعم الحالي فقط
    const { data: ordersData, error: ordersError } = await supabase
      .from('restaurant_orders')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .order('created_at', { ascending: false });

    if (ordersError) {
      console.error('Error fetching restaurant_orders:', ordersError);
      return {
        orders: [],
        error: `فشل استعلام الطلبات من قاعدة البيانات: ${ordersError.message} (رمز الخطأ: ${ordersError.code || 'RLS_OR_NETWORK'})`,
      };
    }

    if (!ordersData || ordersData.length === 0) {
      return {
        orders: [],
        error: null,
      };
    }

    const orderRows = ordersData as DbRestaurantOrder[];
    const orderIds = orderRows.map((o) => o.id);

    // 2. جلب تفاصيل الأصناف المرتبطة بهذه الطلبات
    let itemsMap: Record<string, DbRestaurantOrderItem[]> = {};
    const { data: itemsData, error: itemsError } = await supabase
      .from('restaurant_order_items')
      .select('*')
      .in('order_id', orderIds);

    if (itemsError) {
      console.error('Error fetching restaurant_order_items:', itemsError);
      return {
        orders: [],
        error: `فشل جلب تفاصيل أصناف الطلبات: ${itemsError.message}`,
      };
    }

    if (itemsData) {
      (itemsData as DbRestaurantOrderItem[]).forEach((item) => {
        if (!itemsMap[item.order_id]) {
          itemsMap[item.order_id] = [];
        }
        itemsMap[item.order_id].push(item);
      });
    }

    // 3. جلب سجل الحالات المرتبط بهذه الطلبات
    let historyMap: Record<string, DbRestaurantOrderStatusHistory[]> = {};
    const { data: historyData, error: historyError } = await supabase
      .from('restaurant_order_status_history')
      .select('*')
      .in('order_id', orderIds)
      .order('created_at', { ascending: true });

    if (historyError) {
      console.error('Error fetching restaurant_order_status_history:', historyError);
      return {
        orders: [],
        error: `فشل جلب سجل حالات الطلبات: ${historyError.message}`,
      };
    }

    if (historyData) {
      (historyData as DbRestaurantOrderStatusHistory[]).forEach((hist) => {
        if (!historyMap[hist.order_id]) {
          historyMap[hist.order_id] = [];
        }
        historyMap[hist.order_id].push(hist);
      });
    }

    // 4. دمج البيانات وبناء كائنات الطلبات
    const parsedOrders: Order[] = orderRows.map((dbOrder) => {
      const ordItems = itemsMap[dbOrder.id] || [];
      const ordHist = historyMap[dbOrder.id] || [];
      return mapDbOrderToAppOrder(dbOrder, ordItems, ordHist);
    });

    return {
      orders: parsedOrders,
      error: null,
    };
  } catch (err: any) {
    console.error('Fatal error in fetchRestaurantOrders:', err);
    return {
      orders: [],
      error: err?.message || 'حدث خطأ غير متوقع أثناء جلب الطلبات من قاعدة البيانات.',
    };
  }
}

/**
 * جلب تفاصيل طلب مفرد بالكامل مع أصنافه وسجل حالاته
 */
export async function fetchOrderDetails(
  orderId: string
): Promise<SingleOrderFetchResult> {
  if (!isSupabaseConfigured || !orderId) {
    return { order: null, error: 'معرف الطلب غير متوفر أو العميل غير مهيأ.' };
  }

  try {
    const { data: orderData, error: orderError } = await supabase
      .from('restaurant_orders')
      .select('*')
      .eq('id', orderId)
      .maybeSingle();

    if (orderError) {
      return { order: null, error: orderError.message };
    }

    if (!orderData) {
      return { order: null, error: 'الطلب غير موجود في قاعدة البيانات.' };
    }

    const [itemsRes, histRes] = await Promise.all([
      supabase.from('restaurant_order_items').select('*').eq('order_id', orderId),
      supabase
        .from('restaurant_order_status_history')
        .select('*')
        .eq('order_id', orderId)
        .order('created_at', { ascending: true }),
    ]);

    if (itemsRes.error) {
      return { order: null, error: `فشل جلب تفاصيل أصناف الطلب: ${itemsRes.error.message}` };
    }
    if (histRes.error) {
      return { order: null, error: `فشل جلب سجل حالات الطلب: ${histRes.error.message}` };
    }

    const order = mapDbOrderToAppOrder(
      orderData as DbRestaurantOrder,
      (itemsRes.data as DbRestaurantOrderItem[]) || [],
      (histRes.data as DbRestaurantOrderStatusHistory[]) || []
    );

    return { order, error: null };
  } catch (err: any) {
    return { order: null, error: err?.message || 'فشل جلب تفاصيل الطلب.' };
  }
}

/**
 * تشغيل نغمة تنبيه لطيفة للطلب الجديد باستخدام Web Audio API المدمجة في المتصفح
 * تعمل بالكامل دون الحاجة لأي ملفات صوتية خارجية قد تفشل بسبب الشبكة أو CORS
 */
let sharedAudioContext: AudioContext | null = null;

export function playNewOrderChime() {
  try {
    const AudioCtx =
      window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;

    if (!sharedAudioContext || sharedAudioContext.state === 'closed') {
      sharedAudioContext = new AudioCtx();
    }

    if (sharedAudioContext.state === 'suspended') {
      sharedAudioContext.resume().catch(() => {});
    }

    const ctx = sharedAudioContext;
    const now = ctx.currentTime;

    // النغمة الأولى: D5 (587.33 Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(587.33, now);
    gain1.gain.setValueAtTime(0.3, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.25);

    // النغمة الثانية: A5 (880.00 Hz) بارتفاع مبهج للإشعار
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880.0, now + 0.15);
    gain2.gain.setValueAtTime(0.4, now + 0.15);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.15);
    osc2.stop(now + 0.55);
  } catch (e) {
    console.warn('Audio playback not supported or blocked by browser gesture policy:', e);
  }
}
