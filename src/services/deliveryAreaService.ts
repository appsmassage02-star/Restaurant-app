import { supabase, isSupabaseConfigured } from './supabase';
import { DbDeliveryAreaTariff } from '../types/database';

export interface ServiceResult<T> {
  data: T | null;
  error: string | null;
  isPermissionError?: boolean;
}

export interface CentralDeliveryTariffItem {
  id: string;
  service_type: string;
  delivery_owner: string;
  restaurant_id: string | null;
  governorate_id: string | null;
  center_id: string | null;
  area_id: string | null;
  governorate_name: string;
  center_name: string;
  area_name: string;
  delivery_fee: number | null;
  min_order_amount: number | null;
  is_active: boolean;
  notes: string | null;
  created_at?: string;
  updated_at?: string;
  raw?: DbDeliveryAreaTariff;
}

export interface RestaurantSectionSettings {
  id: string;
  section_enabled: boolean;
  no_driver_timeout_minutes: number;
  created_at?: string;
  updated_at?: string;
}

function extractNumericField(row: Record<string, any>, candidateKeys: string[]): number | null {
  for (const key of candidateKeys) {
    const val = row[key];
    if (val !== undefined && val !== null && val !== '') {
      const num = Number(val);
      if (!isNaN(num)) return num;
    }
  }
  return null;
}

function extractTariffActive(row: Record<string, any>): boolean {
  if (typeof row.is_active === 'boolean') return row.is_active;
  if (typeof row.active === 'boolean') return row.active;
  if (typeof row.is_enabled === 'boolean') return row.is_enabled;
  if (typeof row.enabled === 'boolean') return row.enabled;
  if (typeof row.status === 'string') {
    const s = row.status.toLowerCase().trim();
    return s === 'active' || s === 'enabled';
  }
  return true;
}

/**
 * جلب نطاق التغطية والتسعير المركزي للمطعم (للقراءة فقط) من جدول delivery_area_tariffs
 * الشروط المعتمدة حصراً:
 * - service_type = 'ready_food'
 * - delivery_owner = 'restaurant'
 * - restaurant_id = معرف المطعم الحالي
 * مع إثراء الأسماء الجغرافية مباشرة من جداول geo_governorates / geo_centers / geo_areas
 */
export async function fetchRestaurantCentralTariffs(
  restaurantId: string
): Promise<ServiceResult<CentralDeliveryTariffItem[]>> {
  if (!isSupabaseConfigured || !restaurantId) {
    return { data: [], error: null };
  }

  try {
    const { data: tariffRows, error } = await supabase
      .from('delivery_area_tariffs')
      .select('*')
      .eq('service_type', 'ready_food')
      .eq('delivery_owner', 'restaurant')
      .eq('restaurant_id', restaurantId)
      .order('created_at', { ascending: false });

    if (error) {
      const msgLower = (error.message || '').toLowerCase();
      const isPerm =
        error.code === '42501' ||
        msgLower.includes('permission denied') ||
        msgLower.includes('row-level security');

      console.error('Error fetching delivery_area_tariffs:', error);
      return {
        data: null,
        isPermissionError: isPerm,
        error: isPerm
          ? 'صلاحيات قاعدة البيانات (RLS) تمنع قراءة جدول التسعير المركزي delivery_area_tariffs حاليًا للمطعم.'
          : `تعذر جلب تسعير التوصيل المركزي: ${error.message}`,
      };
    }

    const rows = (tariffRows || []) as DbDeliveryAreaTariff[];
    if (rows.length === 0) {
      return { data: [], error: null };
    }

    const govIds = [...new Set(rows.map((r) => r.governorate_id).filter(Boolean))] as string[];
    const centerIds = [...new Set(rows.map((r) => r.center_id).filter(Boolean))] as string[];
    const areaIds = [...new Set(rows.map((r) => r.area_id).filter(Boolean))] as string[];

    const govMap: Record<string, string> = {};
    const centerMap: Record<string, string> = {};
    const areaMap: Record<string, string> = {};

    try {
      const [govRes, centerRes, areaRes] = await Promise.all([
        govIds.length > 0
          ? supabase.from('geo_governorates').select('id, name_ar').in('id', govIds)
          : Promise.resolve({ data: null }),
        centerIds.length > 0
          ? supabase.from('geo_centers').select('id, name_ar').in('id', centerIds)
          : Promise.resolve({ data: null }),
        areaIds.length > 0
          ? supabase.from('geo_areas').select('id, name_ar').in('id', areaIds)
          : Promise.resolve({ data: null }),
      ]);

      (govRes.data || []).forEach((g: any) => {
        govMap[g.id] = g.name_ar;
      });
      (centerRes.data || []).forEach((c: any) => {
        centerMap[c.id] = c.name_ar;
      });
      (areaRes.data || []).forEach((a: any) => {
        areaMap[a.id] = a.name_ar;
      });
    } catch {
      // إثراء الأسماء غير مانع في حال تعذر الربط
    }

    const items: CentralDeliveryTariffItem[] = rows.map((row) => {
      const fee = extractNumericField(row, [
        'delivery_fee',
        'fee_amount',
        'tariff_amount',
        'amount',
        'customer_delivery_fee',
        'customer_fee',
        'base_delivery_fee',
        'base_fee',
        'fixed_fee',
        'price',
        'price_amount',
        'rate',
        'fee',
      ]);

      const minOrder = extractNumericField(row, [
        'min_order_amount',
        'minimum_order_amount',
        'minimum_order',
        'min_order',
      ]);

      return {
        id: row.id,
        service_type: row.service_type,
        delivery_owner: row.delivery_owner,
        restaurant_id: row.restaurant_id ?? null,
        governorate_id: row.governorate_id ?? null,
        center_id: row.center_id ?? null,
        area_id: row.area_id ?? null,
        governorate_name: row.governorate_id
          ? govMap[row.governorate_id] || 'محافظة غير محددة'
          : 'كل المحافظات',
        center_name: row.center_id
          ? centerMap[row.center_id] || 'مركز/مدينة'
          : 'كل المراكز',
        area_name: row.area_id
          ? areaMap[row.area_id] || 'حي/منطقة'
          : 'المركز بالكامل',
        delivery_fee: fee,
        min_order_amount: minOrder,
        is_active: extractTariffActive(row),
        notes: row.notes || null,
        created_at: row.created_at,
        updated_at: row.updated_at,
        raw: row,
      };
    });

    return { data: items, error: null };
  } catch (err: any) {
    return {
      data: null,
      error: err?.message || 'فشل الاتصال بقاعدة البيانات لجلب التغطية والتسعير المركزي.',
    };
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
        no_driver_timeout_minutes: 10,
      },
      error: null,
    };
  }

  try {
    const { data, error } = await supabase
      .from('restaurant_section_settings')
      .select('id, section_enabled, no_driver_timeout_minutes, created_at, updated_at')
      .limit(1)
      .maybeSingle();

    if (error || !data) {
      if (error) {
        console.warn('Could not fetch restaurant_section_settings:', error.message);
      }
      return {
        data: {
          id: 'default',
          section_enabled: true,
          no_driver_timeout_minutes: 10,
        },
        error: null,
      };
    }

    return {
      data: {
        id: data.id,
        section_enabled: data.section_enabled !== false,
        no_driver_timeout_minutes: Number(data.no_driver_timeout_minutes ?? 10),
        created_at: data.created_at,
        updated_at: data.updated_at,
      },
      error: null,
    };
  } catch {
    return {
      data: {
        id: 'default',
        section_enabled: true,
        no_driver_timeout_minutes: 10,
      },
      error: null,
    };
  }
}

/**
 * تحديث بيانات المطعم التجارية الأساسية فقط في جدول restaurants
 * (لا يعدّل delivery_fee أو max_delivery_radius_km لأن التسعير والتغطية مركزيان بالكامل)
 */
export async function updateRestaurantDbSettings(
  restaurantId: string,
  updates: {
    name?: string;
    description?: string;
    phone?: string;
    address?: string;
    is_open?: boolean;
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
