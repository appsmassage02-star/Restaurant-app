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
    case 'preparing':
      return 'PREPARING';
    case 'ready':
      return 'READY';
    case 'assigned_to_driver':
    case 'picked_up':
    case 'on_the_way':
      return 'ACCEPTED'; // حالة نشطة مع المندوب
    case 'delivered':
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
      return 'بانتظار التأكيد';
    case 'awaiting_restaurant_confirmation':
      return 'بانتظار موافقة المطعم';
    case 'accepted':
      return 'تم القبول';
    case 'preparing':
      return 'قيد التجهيز بالمطبخ';
    case 'ready':
      return 'جاهز للتسليم';
    case 'assigned_to_driver':
      return 'تم تعيين مندوب';
    case 'picked_up':
      return 'تم الاستلام من المطعم';
    case 'on_the_way':
      return 'في الطريق للعميل';
    case 'delivered':
    case 'completed':
      return 'مكتمل ومسلّم';
    case 'rejected':
      return 'مرفوض من المطعم';
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

  const commissionRatePct = Number(dbOrder.commission_percent_snapshot) || 10;
  const adminCommissionRate = commissionRatePct / 100;
  const adminFeeShare =
    dbOrder.admin_fee_share !== undefined && dbOrder.admin_fee_share !== null
      ? Number(dbOrder.admin_fee_share)
      : Number((foodTotal * adminCommissionRate).toFixed(2));

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
      itemId: item.menu_item_id || item.id,
      name: item.item_name_snapshot || 'صنف بدون اسم',
      priceAtOrder: unitPrice,
      quantity: qty,
      selectedOptions: [],
      itemDiscount: discount,
      notes: undefined,
    };
  });

  // تحويل سجل الحالات
  const history: OrderStatusHistory[] = statusHistory.map((h) => ({
    status: mapDbStatusToOrderStatus(h.new_status),
    rawStatus: h.new_status,
    timestamp: h.created_at || dbOrder.created_at,
    note: h.note || undefined,
    updatedBy: h.changed_by || 'نظام طلبات البيت',
  }));

  // إذا كان سجل الحالات فارغاً، نضع الحالة الحالية على الأقل
  if (history.length === 0) {
    history.push({
      status: mapDbStatusToOrderStatus(dbOrder.status),
      rawStatus: dbOrder.status,
      timestamp: dbOrder.created_at,
      note: 'تم استلام الطلب وتسجيله في قاعدة البيانات',
      updatedBy: 'نظام طلبات البيت',
    });
  }

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
    try {
      const { data: itemsData, error: itemsError } = await supabase
        .from('restaurant_order_items')
        .select('*')
        .in('order_id', orderIds);

      if (itemsError) {
        console.warn('Warning: Failed to fetch restaurant_order_items:', itemsError);
      } else if (itemsData) {
        (itemsData as DbRestaurantOrderItem[]).forEach((item) => {
          if (!itemsMap[item.order_id]) {
            itemsMap[item.order_id] = [];
          }
          itemsMap[item.order_id].push(item);
        });
      }
    } catch (e) {
      console.warn('Non-blocking error reading order items:', e);
    }

    // 3. جلب سجل الحالات المرتبط بهذه الطلبات
    let historyMap: Record<string, DbRestaurantOrderStatusHistory[]> = {};
    try {
      const { data: historyData, error: historyError } = await supabase
        .from('restaurant_order_status_history')
        .select('*')
        .in('order_id', orderIds)
        .order('created_at', { ascending: true });

      if (historyError) {
        console.warn('Warning: Failed to fetch restaurant_order_status_history:', historyError);
      } else if (historyData) {
        (historyData as DbRestaurantOrderStatusHistory[]).forEach((hist) => {
          if (!historyMap[hist.order_id]) {
            historyMap[hist.order_id] = [];
          }
          historyMap[hist.order_id].push(hist);
        });
      }
    } catch (e) {
      console.warn('Non-blocking error reading status history:', e);
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
