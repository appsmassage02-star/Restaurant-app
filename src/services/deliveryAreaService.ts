import { supabase, isSupabaseConfigured } from './supabase';
import { FoodGovernorate, FoodCenter, FoodArea } from '../types/database';

export interface ServiceResult<T> {
  data: T | null;
  error: string | null;
}

export interface RestaurantServiceAreaItem {
  id: string; // restaurant_service_areas.id
  restaurant_id: string;
  governorate_id: string;
  center_id: string;
  area_id: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;

  // Joined names for display
  governorate_name?: string;
  center_name?: string;
  area_name?: string;

  // Linked delivery fee from restaurant_area_delivery_fees
  delivery_fee?: number;
  fee_id?: string;
  fee_notes?: string;
}

export interface RestaurantSectionSettings {
  id: string;
  section_enabled: boolean;
  global_max_delivery_radius_km: number;
  no_driver_timeout_minutes: number;
  created_at?: string;
  updated_at?: string;
}

/**
 * جلب المناطق المخدومة للمطعم الحالي مع أسماء المحافظة والمركز والمنطقة ورسوم التوصيل
 */
export async function fetchRestaurantServiceAreas(
  restaurantId: string
): Promise<ServiceResult<RestaurantServiceAreaItem[]>> {
  if (!isSupabaseConfigured || !restaurantId) {
    return { data: [], error: null };
  }

  try {
    // 1. جلب سجلات restaurant_service_areas
    const { data: areasData, error: areasErr } = await supabase
      .from('restaurant_service_areas')
      .select('id, restaurant_id, governorate_id, center_id, area_id, is_active, created_at, updated_at')
      .eq('restaurant_id', restaurantId)
      .order('created_at', { ascending: false });

    if (areasErr) {
      console.error('Error fetching restaurant_service_areas:', areasErr);
      return { data: null, error: `تعذر جلب نطاقات الخدمة للمطعم: ${areasErr.message}` };
    }

    if (!areasData || areasData.length === 0) {
      return { data: [], error: null };
    }

    // 2. جلب رسوم التوصيل المحددة لكل منطقة من جدول restaurant_area_delivery_fees
    const areaIds = areasData.map((a) => a.area_id).filter(Boolean);
    const feesMap: Record<string, { fee: number; feeId: string; notes?: string }> = {};

    if (areaIds.length > 0) {
      try {
        const { data: feesData } = await supabase
          .from('restaurant_area_delivery_fees')
          .select('id, restaurant_id, area_id, delivery_fee, is_active, notes')
          .eq('restaurant_id', restaurantId)
          .in('area_id', areaIds);

        (feesData || []).forEach((f: any) => {
          feesMap[f.area_id] = {
            fee: Number(f.delivery_fee ?? 0),
            feeId: f.id,
            notes: f.notes || '',
          };
        });
      } catch (fErr) {
        console.warn('Could not enrich area delivery fees:', fErr);
      }
    }

    // 3. إثراء الأسماء العربية للمحافظات والمراكز والمناطق
    const govIds = [...new Set(areasData.map((a) => a.governorate_id).filter(Boolean))];
    const centerIds = [...new Set(areasData.map((a) => a.center_id).filter(Boolean))];

    const govMap: Record<string, string> = {};
    const centerMap: Record<string, string> = {};
    const areaMap: Record<string, string> = {};

    try {
      if (govIds.length > 0) {
        const { data: govs } = await supabase
          .from('food_governorates')
          .select('id, name_ar')
          .in('id', govIds);
        (govs || []).forEach((g: any) => {
          govMap[g.id] = g.name_ar;
        });
      }

      if (centerIds.length > 0) {
        const { data: cents } = await supabase
          .from('food_centers')
          .select('id, name_ar')
          .in('id', centerIds);
        (cents || []).forEach((c: any) => {
          centerMap[c.id] = c.name_ar;
        });
      }

      if (areaIds.length > 0) {
        const { data: ars } = await supabase
          .from('food_areas')
          .select('id, name_ar')
          .in('id', areaIds);
        (ars || []).forEach((a: any) => {
          areaMap[a.id] = a.name_ar;
        });
      }
    } catch {
      // Non-blocking enrichment
    }

    const items: RestaurantServiceAreaItem[] = areasData.map((row) => ({
      id: row.id,
      restaurant_id: row.restaurant_id,
      governorate_id: row.governorate_id,
      center_id: row.center_id,
      area_id: row.area_id,
      is_active: row.is_active !== false,
      created_at: row.created_at,
      updated_at: row.updated_at,
      governorate_name: govMap[row.governorate_id] || 'محافظة',
      center_name: centerMap[row.center_id] || 'مركز/مدينة',
      area_name: areaMap[row.area_id] || 'حي/منطقة',
      delivery_fee: feesMap[row.area_id]?.fee,
      fee_id: feesMap[row.area_id]?.feeId,
      fee_notes: feesMap[row.area_id]?.notes,
    }));

    return { data: items, error: null };
  } catch (err: any) {
    return { data: null, error: err?.message || 'فشل الاتصال بقاعدة البيانات لجلب مناطق التوصيل.' };
  }
}

/**
 * جلب الإعدادات الإدارية المركزية العامة من جدول restaurant_section_settings (للقراءة فقط)
 */
export async function fetchSectionSettings(): Promise<ServiceResult<RestaurantSectionSettings>> {
  if (!isSupabaseConfigured) {
    return {
      data: {
        id: 'default',
        section_enabled: true,
        global_max_delivery_radius_km: 15,
        no_driver_timeout_minutes: 10,
      },
      error: null,
    };
  }

  try {
    const { data, error } = await supabase
      .from('restaurant_section_settings')
      .select('id, section_enabled, global_max_delivery_radius_km, no_driver_timeout_minutes, created_at, updated_at')
      .limit(1)
      .maybeSingle();

    if (error) {
      console.warn('Could not fetch restaurant_section_settings:', error.message);
      return {
        data: {
          id: 'default',
          section_enabled: true,
          global_max_delivery_radius_km: 15,
          no_driver_timeout_minutes: 10,
        },
        error: null,
      };
    }

    if (!data) {
      return {
        data: {
          id: 'default',
          section_enabled: true,
          global_max_delivery_radius_km: 15,
          no_driver_timeout_minutes: 10,
        },
        error: null,
      };
    }

    return {
      data: {
        id: data.id,
        section_enabled: data.section_enabled !== false,
        global_max_delivery_radius_km: Number(data.global_max_delivery_radius_km ?? 15),
        no_driver_timeout_minutes: Number(data.no_driver_timeout_minutes ?? 10),
        created_at: data.created_at,
        updated_at: data.updated_at,
      },
      error: null,
    };
  } catch (err: any) {
    return {
      data: {
        id: 'default',
        section_enabled: true,
        global_max_delivery_radius_km: 15,
        no_driver_timeout_minutes: 10,
      },
      error: null,
    };
  }
}

/**
 * إضافة منطقة مخدومة جديدة في جدول restaurant_service_areas مع منع التكرار
 * وتعيين رسوم التوصيل في restaurant_area_delivery_fees
 */
export async function addRestaurantServiceArea(
  restaurantId: string,
  governorateId: string,
  centerId: string,
  areaId: string,
  deliveryFee: number = 25,
  notes?: string
): Promise<ServiceResult<RestaurantServiceAreaItem>> {
  if (!isSupabaseConfigured || !restaurantId || !areaId) {
    return { data: null, error: 'معرف المطعم أو المنطقة غير صالح.' };
  }

  try {
    // 1. التحقق من عدم وجود المنطقة مسبقًا لنفس المطعم
    const { data: existing, error: checkErr } = await supabase
      .from('restaurant_service_areas')
      .select('id')
      .eq('restaurant_id', restaurantId)
      .eq('area_id', areaId)
      .maybeSingle();

    if (checkErr) {
      console.warn('Error checking existing service area:', checkErr);
    }

    if (existing) {
      return {
        data: null,
        error: 'هذه المنطقة مضافة بالفعل إلى نطاق خدمة المطعم. لا يمكن إضافة نفس المنطقة مرتين.',
      };
    }

    // 2. إدراج في restaurant_service_areas
    const { data: insertedArea, error: insertAreaErr } = await supabase
      .from('restaurant_service_areas')
      .insert({
        restaurant_id: restaurantId,
        governorate_id: governorateId,
        center_id: centerId,
        area_id: areaId,
        is_active: true,
      })
      .select('*')
      .single();

    if (insertAreaErr) {
      console.error('Error inserting restaurant_service_areas:', insertAreaErr);
      return { data: null, error: `فشل إضافة المنطقة المخدومة: ${insertAreaErr.message}` };
    }

    // 3. إدراج أو تحديث رسوم التوصيل في restaurant_area_delivery_fees
    let feeId: string | undefined;
    try {
      const { data: feeRow, error: feeErr } = await supabase
        .from('restaurant_area_delivery_fees')
        .insert({
          restaurant_id: restaurantId,
          area_id: areaId,
          delivery_fee: deliveryFee,
          is_active: true,
          notes: notes || null,
        })
        .select('id')
        .single();

      if (!feeErr && feeRow) {
        feeId = feeRow.id;
      }
    } catch (fErr) {
      console.warn('Could not insert area delivery fee:', fErr);
    }

    return {
      data: {
        id: insertedArea.id,
        restaurant_id: insertedArea.restaurant_id,
        governorate_id: insertedArea.governorate_id,
        center_id: insertedArea.center_id,
        area_id: insertedArea.area_id,
        is_active: true,
        delivery_fee: deliveryFee,
        fee_id: feeId,
        fee_notes: notes,
      },
      error: null,
    };
  } catch (err: any) {
    return { data: null, error: err?.message || 'حدث خطأ أثناء إضافة منطقة الخدمة.' };
  }
}

/**
 * تبديل حالة تفعيل منطقة الخدمة (is_active)
 */
export async function toggleServiceAreaActive(
  serviceAreaId: string,
  isActive: boolean
): Promise<ServiceResult<boolean>> {
  if (!isSupabaseConfigured || !serviceAreaId) {
    return { data: null, error: 'معرف المنطقة غير صالح.' };
  }

  try {
    const { error } = await supabase
      .from('restaurant_service_areas')
      .update({
        is_active: isActive,
        updated_at: new Date().toISOString(),
      })
      .eq('id', serviceAreaId);

    if (error) {
      return { data: null, error: `فشل تعديل حالة تفعيل المنطقة: ${error.message}` };
    }

    return { data: true, error: null };
  } catch (err: any) {
    return { data: null, error: err?.message || 'حدث خطأ أثناء تعديل تفعيل المنطقة.' };
  }
}

/**
 * حذف منطقة من نطاق الخدمة ورسومها
 */
export async function deleteRestaurantServiceArea(
  serviceAreaId: string,
  restaurantId: string,
  areaId: string
): Promise<ServiceResult<boolean>> {
  if (!isSupabaseConfigured || !serviceAreaId) {
    return { data: null, error: 'معرف المنطقة غير صالح.' };
  }

  try {
    // 1. حذف من restaurant_service_areas
    const { error: areaErr } = await supabase
      .from('restaurant_service_areas')
      .delete()
      .eq('id', serviceAreaId);

    if (areaErr) {
      return { data: null, error: `فشل حذف المنطقة المخدومة: ${areaErr.message}` };
    }

    // 2. حذف رسوم التوصيل المرتبطة بها في restaurant_area_delivery_fees
    if (restaurantId && areaId) {
      try {
        await supabase
          .from('restaurant_area_delivery_fees')
          .delete()
          .eq('restaurant_id', restaurantId)
          .eq('area_id', areaId);
      } catch (fErr) {
        console.warn('Could not cleanup area delivery fee record:', fErr);
      }
    }

    return { data: true, error: null };
  } catch (err: any) {
    return { data: null, error: err?.message || 'حدث خطأ أثناء حذف المنطقة.' };
  }
}

/**
 * تحديث رسوم التوصيل المخصصة لمنطقة في restaurant_area_delivery_fees
 */
export async function updateAreaDeliveryFee(
  restaurantId: string,
  areaId: string,
  deliveryFee: number,
  notes?: string
): Promise<ServiceResult<boolean>> {
  if (!isSupabaseConfigured || !restaurantId || !areaId) {
    return { data: null, error: 'البيانات غير مكتملة لتحديث رسوم المنطقة.' };
  }

  try {
    // التحقق إن كان السجل موجودًا للتحديث أم الإدراج
    const { data: existing } = await supabase
      .from('restaurant_area_delivery_fees')
      .select('id')
      .eq('restaurant_id', restaurantId)
      .eq('area_id', areaId)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase
        .from('restaurant_area_delivery_fees')
        .update({
          delivery_fee: deliveryFee,
          notes: notes || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id);

      if (error) {
        return { data: null, error: `فشل تحديث رسوم المنطقة: ${error.message}` };
      }
    } else {
      const { error } = await supabase
        .from('restaurant_area_delivery_fees')
        .insert({
          restaurant_id: restaurantId,
          area_id: areaId,
          delivery_fee: deliveryFee,
          is_active: true,
          notes: notes || null,
        });

      if (error) {
        return { data: null, error: `فشل حفظ رسوم المنطقة: ${error.message}` };
      }
    }

    return { data: true, error: null };
  } catch (err: any) {
    return { data: null, error: err?.message || 'حدث خطأ أثناء تعديل رسوم التوصيل للمنطقة.' };
  }
}

/**
 * تحديث بيانات المطعم الأساسية في جدول restaurants
 * (حالة الفتح/الإغلاق، رسوم التوصيل العامة، العنوان، الهاتف، إلخ)
 */
export async function updateRestaurantDbSettings(
  restaurantId: string,
  updates: {
    name?: string;
    description?: string;
    phone?: string;
    address?: string;
    is_open?: boolean;
    delivery_fee?: number;
    max_delivery_radius_km?: number;
  }
): Promise<ServiceResult<boolean>> {
  if (!isSupabaseConfigured || !restaurantId) {
    return { data: null, error: 'معرف المطعم غير متوفر.' };
  }

  try {
    const payload: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (updates.name !== undefined) payload.name = updates.name.trim();
    if (updates.description !== undefined) payload.description = updates.description.trim() || null;
    if (updates.phone !== undefined) payload.phone = updates.phone.trim();
    if (updates.address !== undefined) payload.address = updates.address.trim();
    if (updates.is_open !== undefined) payload.is_open = updates.is_open;
    if (updates.delivery_fee !== undefined) payload.delivery_fee = updates.delivery_fee;
    if (updates.max_delivery_radius_km !== undefined) payload.max_delivery_radius_km = updates.max_delivery_radius_km;

    const { error } = await supabase
      .from('restaurants')
      .update(payload)
      .eq('id', restaurantId);

    if (error) {
      console.error('Error updating restaurant DB settings:', error);
      return { data: null, error: `فشل حفظ الإعدادات في قاعدة البيانات: ${error.message}` };
    }

    return { data: true, error: null };
  } catch (err: any) {
    return { data: null, error: err?.message || 'حدث خطأ أثناء تحديث إعدادات المطعم.' };
  }
}
