/**
 * خدمة إدارة دورة حياة وتدفق طلبات المطعم (المرحلة الثانية)
 * تتولى استدعاء إجراءات RPC المعتمدة في قاعدة بيانات Supabase:
 * 1. restaurant_accept_order_with_route
 * 2. restaurant_reject_order
 * 3. restaurant_record_item_fulfillment
 * 4. restaurant_get_order_workflow
 * 5. restaurant_set_preparing
 * 6. restaurant_mark_order_ready
 * 7. restaurant_set_delivery_enabled
 * 8. restaurant_list_pending_cancellations
 * 9. restaurant_decide_cancellation
 */

import { supabase, isSupabaseConfigured } from './supabase';
import { DbOrderWorkflowItem, DbPendingCancellation } from '../types/database';

export interface ServiceOperationResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * قبول الطلب مع تحديد مسار التوصيل (دليفري المطعم أو دليفري طلباتي)
 * @param orderId معرف الطلب
 * @param fulfillmentRoute 'restaurant_delivery' | 'driver_delivery'
 */
export async function acceptOrderWithRoute(
  orderId: string,
  fulfillmentRoute: 'restaurant_delivery' | 'driver_delivery'
): Promise<ServiceOperationResult> {
  if (!isSupabaseConfigured) {
    return { success: false, error: 'الاتصال بـ Supabase غير مهيأ.' };
  }
  if (!orderId) {
    return { success: false, error: 'معرف الطلب غير محدد.' };
  }

  try {
    const { data, error } = await supabase.rpc('restaurant_accept_order_with_route', {
      p_order_id: orderId,
      p_fulfillment_route: fulfillmentRoute,
    });

    if (error) {
      console.error('Error in restaurant_accept_order_with_route:', error);
      return {
        success: false,
        error: `فشل قبول الطلب في قاعدة البيانات: ${error.message}`,
      };
    }

    return { success: true, data };
  } catch (err: any) {
    console.error('Unexpected error accepting order:', err);
    return {
      success: false,
      error: err?.message || 'حدث خطأ غير متوقع أثناء قبول الطلب.',
    };
  }
}

/**
 * رفض الطلب مع تسجيل السبب الإلزامي
 * @param orderId معرف الطلب
 * @param reason سبب الرفض
 */
export async function rejectOrder(
  orderId: string,
  reason: string
): Promise<ServiceOperationResult> {
  if (!isSupabaseConfigured) {
    return { success: false, error: 'الاتصال بـ Supabase غير مهيأ.' };
  }
  if (!orderId) {
    return { success: false, error: 'معرف الطلب غير محدد.' };
  }
  if (!reason || !reason.trim()) {
    return { success: false, error: 'يرجى إدخال سبب واضح لرفض الطلب.' };
  }

  try {
    const { data, error } = await supabase.rpc('restaurant_reject_order', {
      p_order_id: orderId,
      p_reason: reason.trim(),
    });

    if (error) {
      console.error('Error in restaurant_reject_order:', error);
      return {
        success: false,
        error: `فشل تسجيل رفض الطلب في قاعدة البيانات: ${error.message}`,
      };
    }

    return { success: true, data };
  } catch (err: any) {
    console.error('Unexpected error rejecting order:', err);
    return {
      success: false,
      error: err?.message || 'حدث خطأ غير متوقع أثناء رفض الطلب.',
    };
  }
}

/**
 * تسجيل الكمية المتاحة فعلياً لصنف في الطلب (لتحديد النواقص والبدائل)
 * @param orderItemId معرف بند الطلب
 * @param availableQuantity الكمية المتوفرة فعلياً لدى المطعم
 */
export async function recordItemFulfillment(
  orderItemId: string,
  availableQuantity: number
): Promise<ServiceOperationResult> {
  if (!isSupabaseConfigured) {
    return { success: false, error: 'الاتصال بـ Supabase غير مهيأ.' };
  }
  if (!orderItemId) {
    return { success: false, error: 'معرف بند الطلب غير محدد.' };
  }
  if (availableQuantity < 0) {
    return { success: false, error: 'الكمية المتوفرة لا يمكن أن تكون سالبة.' };
  }

  try {
    const { data, error } = await supabase.rpc('restaurant_record_item_fulfillment', {
      p_order_item_id: orderItemId,
      p_available_quantity: availableQuantity,
    });

    if (error) {
      console.error('Error in restaurant_record_item_fulfillment:', error);
      return {
        success: false,
        error: `فشل تسجيل توفر الصنف: ${error.message}`,
      };
    }

    return { success: true, data };
  } catch (err: any) {
    console.error('Unexpected error recording item fulfillment:', err);
    return {
      success: false,
      error: err?.message || 'حدث خطأ أثناء تسجيل كمية الصنف المتوفرة.',
    };
  }
}

/**
 * جلب تفاصيل تدفق الطلب والنواقص وقرارات العميل
 * @param orderId معرف الطلب
 */
export async function getOrderWorkflow(
  orderId: string
): Promise<ServiceOperationResult<DbOrderWorkflowItem[]>> {
  if (!isSupabaseConfigured || !orderId) {
    return { success: false, error: 'معرف الطلب غير متوفر.' };
  }

  try {
    const { data, error } = await supabase.rpc('restaurant_get_order_workflow', {
      p_order_id: orderId,
    });

    if (error) {
      console.error('Error in restaurant_get_order_workflow:', error);
      return {
        success: false,
        error: `فشل جلب تفاصيل تدفق الطلب: ${error.message}`,
      };
    }

    // تسوية البيانات سواء كانت مصفوفة أو كائناً يحتوي على items
    let rawItems: any[] = [];
    if (Array.isArray(data)) {
      rawItems = data;
    } else if (data && typeof data === 'object') {
      if (Array.isArray((data as any).items)) {
        rawItems = (data as any).items;
      } else if (Array.isArray((data as any).workflow)) {
        rawItems = (data as any).workflow;
      } else {
        rawItems = [data];
      }
    }

    const items: DbOrderWorkflowItem[] = rawItems.map((item: any) => {
      const orderedQty = Number(
        item.ordered_quantity ?? item.requested_quantity ?? item.quantity ?? 1
      );
      const availableQty =
        item.available_quantity !== undefined && item.available_quantity !== null
          ? Number(item.available_quantity)
          : null;
      const approvedQty =
        item.approved_quantity !== undefined && item.approved_quantity !== null
          ? Number(item.approved_quantity)
          : item.customer_approved_quantity !== undefined &&
            item.customer_approved_quantity !== null
          ? Number(item.customer_approved_quantity)
          : null;
      const isApproved =
        item.customer_approved !== undefined && item.customer_approved !== null
          ? Boolean(item.customer_approved)
          : item.is_customer_approved !== undefined && item.is_customer_approved !== null
          ? Boolean(item.is_customer_approved)
          : null;
      const resolution = item.resolution ?? item.customer_decision ?? null;
      const subName = item.substitute_name ?? item.substitute_item_name ?? null;
      const subPrice =
        item.substitute_unit_price !== undefined && item.substitute_unit_price !== null
          ? Number(item.substitute_unit_price)
          : item.substitute_price !== undefined && item.substitute_price !== null
          ? Number(item.substitute_price)
          : null;

      return {
        order_item_id: item.order_item_id || item.id || '',
        item_name: item.item_name || item.item_name_snapshot || '',
        ordered_quantity: orderedQty,
        available_quantity: availableQty,
        availability_status: item.availability_status ?? item.status ?? null,
        approved_quantity: approvedQty,
        resolution,
        substitute_name: subName,
        substitute_unit_price: subPrice,
        customer_approved: isApproved,
        // توافقية داخلية
        requested_quantity: orderedQty,
        customer_decision: resolution,
        substitute_item_name: subName,
        substitute_price: subPrice,
        is_customer_approved: isApproved,
        customer_approved_quantity: approvedQty,
      };
    });

    return { success: true, data: items };
  } catch (err: any) {
    console.error('Unexpected error in getOrderWorkflow:', err);
    return {
      success: false,
      error: err?.message || 'حدث خطأ أثناء جلب تدفق الطلب.',
    };
  }
}

/**
 * نقل الطلب لحالة قيد التجهيز بالمطبخ
 * @param orderId معرف الطلب
 */
export async function setOrderPreparing(
  orderId: string
): Promise<ServiceOperationResult> {
  if (!isSupabaseConfigured || !orderId) {
    return { success: false, error: 'معرف الطلب غير متوفر.' };
  }

  try {
    const { data, error } = await supabase.rpc('restaurant_set_preparing', {
      p_order_id: orderId,
    });

    if (error) {
      console.error('Error in restaurant_set_preparing:', error);
      return {
        success: false,
        error: `فشل نقل الطلب إلى التجهيز: ${error.message}`,
      };
    }

    return { success: true, data };
  } catch (err: any) {
    console.error('Unexpected error in setOrderPreparing:', err);
    return {
      success: false,
      error: err?.message || 'حدث خطأ أثناء بدء تجهيز الطلب.',
    };
  }
}

/**
 * نقل الطلب لحالة جاهز للتسليم
 * @param orderId معرف الطلب
 */
export async function markOrderReady(
  orderId: string
): Promise<ServiceOperationResult> {
  if (!isSupabaseConfigured || !orderId) {
    return { success: false, error: 'معرف الطلب غير متوفر.' };
  }

  try {
    const { data, error } = await supabase.rpc('restaurant_mark_order_ready', {
      p_order_id: orderId,
    });

    if (error) {
      console.error('Error in restaurant_mark_order_ready:', error);
      return {
        success: false,
        error: `فشل تحديد الطلب كجاهز: ${error.message}`,
      };
    }

    return { success: true, data };
  } catch (err: any) {
    console.error('Unexpected error in markOrderReady:', err);
    return {
      success: false,
      error: err?.message || 'حدث خطأ أثناء تحديد الطلب كجاهز.',
    };
  }
}

/**
 * تفعيل أو تعطيل خدمة دليفري المطعم
 * @param enabled true إذا كان دليفري المطعم متاحاً
 */
export async function setRestaurantDeliveryEnabled(
  enabled: boolean
): Promise<ServiceOperationResult> {
  if (!isSupabaseConfigured) {
    return { success: false, error: 'الاتصال بـ Supabase غير مهيأ.' };
  }

  try {
    const { data, error } = await supabase.rpc('restaurant_set_delivery_enabled', {
      p_enabled: enabled,
    });

    if (error) {
      console.error('Error in restaurant_set_delivery_enabled:', error);
      return {
        success: false,
        error: `فشل تحديث حالة دليفري المطعم: ${error.message}`,
      };
    }

    return { success: true, data };
  } catch (err: any) {
    console.error('Unexpected error in setRestaurantDeliveryEnabled:', err);
    return {
      success: false,
      error: err?.message || 'حدث خطأ أثناء تعديل إعداد دليفري المطعم.',
    };
  }
}

/**
 * إرسال طلب إلغاء طلب من قِبل المطعم
 * يستدعي الإجراء المخزن: restaurant_request_order_cancellation
 * @param orderId معرف الطلب
 * @param reason سبب الإلغاء
 */
export async function requestOrderCancellation(
  orderId: string,
  reason: string
): Promise<ServiceOperationResult> {
  if (!isSupabaseConfigured) {
    return { success: false, error: 'الاتصال بـ Supabase غير مهيأ.' };
  }
  if (!orderId) {
    return { success: false, error: 'معرف الطلب غير محدد.' };
  }
  if (!reason || !reason.trim()) {
    return { success: false, error: 'يرجى إدخال سبب واضح لطلب الإلغاء.' };
  }

  try {
    const { data, error } = await supabase.rpc('restaurant_request_order_cancellation', {
      p_order_id: orderId,
      p_reason: reason.trim(),
    });

    if (error) {
      console.error('Error in restaurant_request_order_cancellation:', error);
      return {
        success: false,
        error: `فشل إرسال طلب إلغاء الطلب: ${error.message}`,
      };
    }

    return { success: true, data };
  } catch (err: any) {
    console.error('Unexpected error in requestOrderCancellation:', err);
    return {
      success: false,
      error: err?.message || 'حدث خطأ أثناء إرسال طلب الإلغاء.',
    };
  }
}

/**
 * جلب قائمة طلبات الإلغاء المعلقة (من العملاء أو السائقين أو المطعم)
 */
export async function listPendingCancellations(): Promise<
  ServiceOperationResult<DbPendingCancellation[]>
> {
  if (!isSupabaseConfigured) {
    return { success: false, error: 'الاتصال بـ Supabase غير مهيأ.', data: [] };
  }

  try {
    const { data, error } = await supabase.rpc('restaurant_list_pending_cancellations');

    if (error) {
      console.error('Error in restaurant_list_pending_cancellations:', error);
      return {
        success: false,
        error: `فشل جلب طلبات الإلغاء المعلقة: ${error.message}`,
        data: [],
      };
    }

    const requests: DbPendingCancellation[] = Array.isArray(data)
      ? data.map((row: any) => {
          // استنتاج مصدر طلب الإلغاء بدقة (عميل، طيار، أو مطعم)
          const rawRole = (row.requested_by_role || row.requester_role || row.role || '').toLowerCase();
          const reqBy = String(row.requested_by || '').toLowerCase();

          let role: 'customer' | 'driver' | 'restaurant' = 'customer';
          if (rawRole.includes('driver') || reqBy.includes('driver') || row.is_driver) {
            role = 'driver';
          } else if (rawRole.includes('restaurant') || reqBy.includes('restaurant') || row.is_restaurant) {
            role = 'restaurant';
          } else {
            role = 'customer';
          }

          return {
            id: String(row.id || row.request_id || ''),
            order_id: String(row.order_id || ''),
            order_number: row.order_number ? String(row.order_number) : undefined,
            customer_name: row.customer_name || 'عميل',
            requested_by: row.requested_by || null,
            requested_by_role: role,
            reason: row.reason || row.cancellation_reason || 'طلب إلغاء الأوردر',
            created_at: row.created_at || new Date().toISOString(),
            status: row.status || 'pending',
          };
        })
      : [];

    return { success: true, data: requests };
  } catch (err: any) {
    console.error('Unexpected error in listPendingCancellations:', err);
    return {
      success: false,
      error: err?.message || 'حدث خطأ أثناء جلب طلبات الإلغاء.',
      data: [],
    };
  }
}

/**
 * البت في طلب الإلغاء (موافقة أو رفض مع سبب)
 * @param requestId معرف طلب الإلغاء
 * @param approve هل وافق المطعم على الإلغاء؟
 * @param reason سبب الرفض في حال رفض المطعم
 */
export async function decideCancellation(
  requestId: string,
  approve: boolean,
  reason?: string
): Promise<ServiceOperationResult> {
  if (!isSupabaseConfigured || !requestId) {
    return { success: false, error: 'معرف طلب الإلغاء غير محدد.' };
  }
  if (!approve && (!reason || !reason.trim())) {
    return { success: false, error: 'يرجى كتابة سبب رفض طلب الإلغاء.' };
  }

  try {
    const { data, error } = await supabase.rpc('restaurant_decide_cancellation', {
      p_request_id: requestId,
      p_approve: approve,
      p_reason: reason?.trim() || null,
    });

    if (error) {
      console.error('Error in restaurant_decide_cancellation:', error);
      return {
        success: false,
        error: `فشل البت في طلب الإلغاء: ${error.message}`,
      };
    }

    return { success: true, data };
  } catch (err: any) {
    console.error('Unexpected error in decideCancellation:', err);
    return {
      success: false,
      error: err?.message || 'حدث خطأ أثناء البت في طلب الإلغاء.',
    };
  }
}
