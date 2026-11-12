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
  DbRestaurantDeliveryOrder,
  DbRestaurantOrderItemOption,
} from '../types/database';
import {
  Order,
  OrderItem,
  OrderStatus,
  OrderStatusHistory,
  ExecutionRoute,
  DriverInfo,
  SelectedOption,
} from '../types';

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
 * الطلب الذي حالته الفعلية accepted ومسار توصيله driver_delivery
 * يظهر في تصنيف «بانتظار تأمين طيار» إلى أن يتم إسناد الطيار
 */
export function mapDbStatusToOrderStatus(
  dbStatus: string,
  fulfillmentRoute?: string
): OrderStatus {
  const s = (dbStatus || '').toLowerCase().trim();
  const route = (fulfillmentRoute || '').toLowerCase().trim();

  switch (s) {
    case 'pending':
    case 'awaiting_restaurant_confirmation':
      return 'PENDING';
    case 'accepted':
      if (route === 'driver_delivery' || route === 'courier_phone') {
        return 'AWAITING_DRIVER';
      }
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
export function getArabicStatusLabel(
  dbStatus: string | OrderStatus,
  fulfillmentRoute?: string
): string {
  const s = String(dbStatus || '').toLowerCase().trim();
  const r = String(fulfillmentRoute || '').toLowerCase().trim();

  switch (s) {
    case 'pending':
      return 'بانتظار القبول';
    case 'awaiting_restaurant_confirmation':
      return 'بانتظار موافقة المطعم';
    case 'accepted':
      if (r === 'driver_delivery' || r === 'courier_phone') {
        return 'بانتظار تأمين طيار';
      }
      return 'تم القبول';
    case 'awaiting_driver':
    case 'searching_driver':
    case 'awaiting_driver_assignment':
      return 'بانتظار تأمين طيار';
    case 'assigned_to_driver':
    case 'driver_assigned':
      return 'تم إسناد الطيار';
    case 'preparing':
      return 'جاري التجهيز';
    case 'ready':
      return 'جاهز للتسليم';
    case 'picked_up':
      return 'تم استلام المندوب';
    case 'on_the_way':
      return 'في الطريق للعميل';
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
  statusHistory: DbRestaurantOrderStatusHistory[] = [],
  deliveryOrder?: DbRestaurantDeliveryOrder | null,
  driverProfile?: { full_name?: string | null; phone?: string | null } | null,
  optionsMap: Record<string, DbRestaurantOrderItemOption[]> = {}
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

  // تحويل الأصناف مع ربط الخيارات الفعلية من جدول restaurant_order_item_options
  const items: OrderItem[] = orderItems.map((item) => {
    const unitPrice = Number(item.unit_price_snapshot) || 0;
    const qty = Number(item.quantity) || 1;
    const discount = Number(item.discount_amount) || 0;
    const itemOpts = optionsMap[item.id] || [];
    const selectedOptions: SelectedOption[] = itemOpts.map((opt) => ({
      groupId: opt.id,
      groupName: opt.option_name_snapshot || 'خيار',
      optionId: opt.id,
      optionName: opt.value_name_snapshot || '',
      price: Number(opt.extra_price_snapshot) || 0,
    }));

    return {
      id: item.id,
      itemId: item.menu_item_id || item.id,
      name: item.item_name_snapshot || 'صنف بدون اسم',
      priceAtOrder: unitPrice,
      quantity: qty,
      selectedOptions,
      itemDiscount: discount,
      notes: undefined,
    };
  });

  // تحويل سجل الحالات الفعلي فقط من قاعدة البيانات (دون اختراع سجلات وهمية)
  const history: OrderStatusHistory[] = statusHistory.map((h) => ({
    status: mapDbStatusToOrderStatus(h.new_status, dbOrder.fulfillment_route),
    rawStatus: h.new_status,
    timestamp: h.created_at || dbOrder.created_at,
    note: h.note || undefined,
    updatedBy: h.changed_by || 'نظام طلبات البيت',
  }));

  // استخلاص بيانات السائق عند وجود أمر توصيل
  let driverInfo: DriverInfo | undefined = undefined;
  if (deliveryOrder && (deliveryOrder.driver_user_id || deliveryOrder.assigned_at)) {
    driverInfo = {
      id: deliveryOrder.driver_user_id || undefined,
      name: driverProfile?.full_name || 'كابتن المنظومة',
      phone: driverProfile?.phone || '',
      assignedAt: deliveryOrder.assigned_at || undefined,
      pickedUpAt: deliveryOrder.picked_up_at || undefined,
      deliveredAt: deliveryOrder.delivered_at || undefined,
      status: deliveryOrder.status,
    };
  }

  // تسوية الحالة الفعلية مع الأخذ بالاعتبار حالة التوصيل في restaurant_delivery_orders
  // تطبيق أسبقية الحالات التنازلية الصحيحة بحيث لا يتم طمس COMPLETED أو CANCELLED
  let resolvedStatus = mapDbStatusToOrderStatus(dbOrder.status, dbOrder.fulfillment_route);
  const dbStatusLower = (dbOrder.status || '').toLowerCase().trim();

  if (dbStatusLower === 'cancelled' || dbStatusLower === 'rejected') {
    resolvedStatus = dbStatusLower === 'cancelled' ? 'CANCELLED' : 'REJECTED';
  } else if (dbOrder.fulfillment_route === 'driver_delivery') {
    const delivStatus = (deliveryOrder?.status || '').toLowerCase().trim();
    if (delivStatus === 'cancelled') {
      resolvedStatus = 'CANCELLED';
    } else if (delivStatus === 'completed' || dbStatusLower === 'completed') {
      resolvedStatus = 'COMPLETED';
    } else if (delivStatus === 'delivered' || deliveryOrder?.delivered_at) {
      resolvedStatus = 'DELIVERED';
    } else if (delivStatus === 'on_the_way') {
      resolvedStatus = 'ON_THE_WAY';
    } else if (delivStatus === 'picked_up' || deliveryOrder?.picked_up_at) {
      resolvedStatus = 'PICKED_UP';
    } else if (
      delivStatus === 'assigned' ||
      delivStatus === 'driver_assigned' ||
      delivStatus === 'assigned_to_driver' ||
      deliveryOrder?.driver_user_id ||
      deliveryOrder?.assigned_at
    ) {
      if (
        dbStatusLower === 'accepted' ||
        dbStatusLower === 'awaiting_driver' ||
        dbStatusLower === 'pending'
      ) {
        resolvedStatus = 'ASSIGNED_TO_DRIVER';
      }
    }
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
    status: resolvedStatus,
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
    driverInfo,
    deliveryOrder: deliveryOrder || undefined,
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

    const allOrderItems = (itemsData as DbRestaurantOrderItem[]) || [];
    allOrderItems.forEach((item) => {
      if (!itemsMap[item.order_id]) {
        itemsMap[item.order_id] = [];
      }
      itemsMap[item.order_id].push(item);
    });

    // 2.1 جلب خيارات الأصناف من جدول restaurant_order_item_options الفعلي
    let optionsMap: Record<string, DbRestaurantOrderItemOption[]> = {};
    const itemIds = allOrderItems.map((item) => item.id);
    if (itemIds.length > 0) {
      try {
        const { data: optionsData, error: optionsError } = await supabase
          .from('restaurant_order_item_options')
          .select('*')
          .in('order_item_id', itemIds);

        if (optionsError) {
          console.warn('Could not fetch restaurant_order_item_options (non-fatal):', optionsError.message);
        } else if (optionsData) {
          (optionsData as DbRestaurantOrderItemOption[]).forEach((opt) => {
            if (!optionsMap[opt.order_item_id]) {
              optionsMap[opt.order_item_id] = [];
            }
            optionsMap[opt.order_item_id].push(opt);
          });
        }
      } catch (optErr) {
        console.warn('Unexpected error in restaurant_order_item_options query:', optErr);
      }
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

    // 4. جلب أوامر التوصيل وسجلات السائقين لطلبات دليفري طلباتي مع معالجة الأخطاء بشفافية
    let deliveryOrdersMap: Record<string, DbRestaurantDeliveryOrder> = {};
    let driverUserIds: string[] = [];

    try {
      const { data: deliveryData, error: deliveryError } = await supabase
        .from('restaurant_delivery_orders')
        .select('*')
        .in('order_id', orderIds);

      if (deliveryError) {
        console.warn('Warning: Failed to fetch restaurant_delivery_orders (non-fatal):', deliveryError.message);
      } else if (deliveryData) {
        (deliveryData as DbRestaurantDeliveryOrder[]).forEach((d) => {
          deliveryOrdersMap[d.order_id] = d;
          if (d.driver_user_id && !driverUserIds.includes(d.driver_user_id)) {
            driverUserIds.push(d.driver_user_id);
          }
        });
      }
    } catch (delivErr) {
      console.warn('Could not fetch restaurant_delivery_orders (non-fatal):', delivErr);
    }

    // 5. جلب بيانات السائقين (الاسم ورقم الهاتف) من جدول profiles
    let driverProfilesMap: Record<string, { full_name?: string | null; phone?: string | null }> = {};
    if (driverUserIds.length > 0) {
      try {
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, full_name, phone')
          .in('id', driverUserIds);

        if (profilesError) {
          console.warn('Warning: Failed to fetch driver profiles (non-fatal):', profilesError.message);
        } else if (profilesData) {
          profilesData.forEach((p: any) => {
            driverProfilesMap[p.id] = { full_name: p.full_name, phone: p.phone };
          });
        }
      } catch (profErr) {
        console.warn('Could not fetch driver profiles (non-fatal):', profErr);
      }
    }

    // 6. دمج البيانات وبناء كائنات الطلبات
    const parsedOrders: Order[] = orderRows.map((dbOrder) => {
      const ordItems = itemsMap[dbOrder.id] || [];
      const ordHist = historyMap[dbOrder.id] || [];
      const delivOrder = deliveryOrdersMap[dbOrder.id] || null;
      const driverProf = delivOrder?.driver_user_id ? driverProfilesMap[delivOrder.driver_user_id] : null;
      return mapDbOrderToAppOrder(dbOrder, ordItems, ordHist, delivOrder, driverProf, optionsMap);
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
 * جلب تفاصيل طلب مفرد بالكامل مع أصنافه وسجل حالاته وبيانات التوصيل
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

    const [itemsRes, histRes, delivRes] = await Promise.all([
      supabase.from('restaurant_order_items').select('*').eq('order_id', orderId),
      supabase
        .from('restaurant_order_status_history')
        .select('*')
        .eq('order_id', orderId)
        .order('created_at', { ascending: true }),
      supabase
        .from('restaurant_delivery_orders')
        .select('*')
        .eq('order_id', orderId)
        .maybeSingle(),
    ]);

    if (itemsRes.error) {
      return { order: null, error: `فشل جلب تفاصيل أصناف الطلب: ${itemsRes.error.message}` };
    }
    if (histRes.error) {
      return { order: null, error: `فشل جلب سجل حالات الطلب: ${histRes.error.message}` };
    }

    const orderItemRows = (itemsRes.data as DbRestaurantOrderItem[]) || [];
    let optionsMap: Record<string, DbRestaurantOrderItemOption[]> = {};
    const itemIds = orderItemRows.map((it) => it.id);
    if (itemIds.length > 0) {
      try {
        const { data: optionsData, error: optionsError } = await supabase
          .from('restaurant_order_item_options')
          .select('*')
          .in('order_item_id', itemIds);

        if (optionsError) {
          console.warn('Non-fatal error fetching options for order:', optionsError.message);
        } else if (optionsData) {
          (optionsData as DbRestaurantOrderItemOption[]).forEach((opt) => {
            if (!optionsMap[opt.order_item_id]) {
              optionsMap[opt.order_item_id] = [];
            }
            optionsMap[opt.order_item_id].push(opt);
          });
        }
      } catch (optErr) {
        console.warn('Unexpected error fetching item options:', optErr);
      }
    }

    const delivOrder = (delivRes.data as DbRestaurantDeliveryOrder) || null;
    let driverProf: { full_name?: string | null; phone?: string | null } | null = null;
    if (delivOrder?.driver_user_id) {
      try {
        const { data: prof, error: profError } = await supabase
          .from('profiles')
          .select('id, full_name, phone')
          .eq('id', delivOrder.driver_user_id)
          .maybeSingle();

        if (profError) {
          console.warn('Could not fetch driver profile for single order:', profError.message);
        } else if (prof) {
          driverProf = { full_name: prof.full_name, phone: prof.phone };
        }
      } catch (pErr) {
        console.warn('Could not fetch driver profile for single order:', pErr);
      }
    }

    const order = mapDbOrderToAppOrder(
      orderData as DbRestaurantOrder,
      orderItemRows,
      (histRes.data as DbRestaurantOrderStatusHistory[]) || [],
      delivOrder,
      driverProf,
      optionsMap
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
