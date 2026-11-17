import { supabase, isSupabaseConfigured } from './supabase';
import { DbDeliveryAreaTariff, DeliveryScopeLevel } from '../types/database';

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
  scope_level: DeliveryScopeLevel | string | null;
  resolved_scope_level: DeliveryScopeLevel;
  governorate_name: string;
  center_name: string;
  area_name: string;
  base_delivery_fee: number | null;
  admin_commission: number | null;
  driver_net_fee: number | null;
  customer_delivery_fee: number | null;
  is_enabled: boolean;
  notes: string | null;
  created_at?: string;
  updated_at?: string;
  raw?: DbDeliveryAreaTariff;
}

export interface RestaurantSectionSettings {
  id: string;
  section_enabled: boolean | null;
  created_at?: string;
  updated_at?: string;
}

const TARIFF_SELECT_COLUMNS = [
  'id',
  'service_type',
  'delivery_owner',
  'restaurant_id',
  'governorate_id',
  'center_id',
  'area_id',
  'scope_level',
  'base_delivery_fee',
  'admin_commission',
  'driver_net_fee',
  'customer_delivery_fee',
  'is_enabled',
  'notes',
  'created_at',
  'updated_at',
].join(', ');

const SCOPE_PRIORITY_ORDER: Record<DeliveryScopeLevel, number> = {
  area: 1,
  center: 2,
  governorate: 3,
};

function parseNullableNumber(value: unknown): number | null {
  if (value === undefined || value === null || value === '') return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

/**
 * تحديد مستوى الأولوية الجغرافية للتسعيرة وفق الترتيب المعتمد:
 * المنطقة (area) <- المركز (center) <- المحافظة (governorate)
 */
export function resolveTariffScopeLevel(tariff: {
  scope_level?: string | null;
  area_id?: string | null;
  center_id?: string | null;
  governorate_id?: string | null;
}): DeliveryScopeLevel {
  const rawScope = (tariff.scope_level || '').toLowerCase().trim();
  if (rawScope === 'area' || rawScope === 'center' || rawScope === 'governorate') {
    return rawScope;
  }
  if (tariff.area_id) return 'area';
  if (tariff.center_id) return 'center';
  return 'governorate';
}

/**
 * ترتيب تسعيرات التوصيل حسب التفعيل ثم الأولوية الجغرافية (المنطقة <- المركز <- المحافظة)
 */
export function sortCentralTariffsByPriority(
  items: CentralDeliveryTariffItem[]
): CentralDeliveryTariffItem[] {
  return [...items].sort((a, b) => {
    if (a.is_enabled !== b.is_enabled) {
      return a.is_enabled ? -1 : 1;
    }
    const prioA = SCOPE_PRIORITY_ORDER[a.resolved_scope_level] ?? 99;
    const prioB = SCOPE_PRIORITY_ORDER[b.resolved_scope_level] ?? 99;
    if (prioA !== prioB) {
      return prioA - prioB;
    }
    const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
    const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
    return timeB - timeA;
  });
}

/**
 * اختيار التسعيرة المركزية الفعّالة لنقطة جغرافية محددة حسب الأولوية:
 * المنطقة (area) <- المركز (center) <- المحافظة (governorate)
 * مع احترام حالة التفعيل is_enabled === true فقط
 */
export function resolveApplicableCentralTariff(
  items: CentralDeliveryTariffItem[],
  location: {
    governorateId?: string | null;
    centerId?: string | null;
    areaId?: string | null;
  }
): CentralDeliveryTariffItem | null {
  const enabledItems = items.filter((t) => t.is_enabled === true);

  if (location.areaId) {
    const areaMatch = enabledItems.find(
      (t) => t.resolved_scope_level === 'area' && t.area_id === location.areaId
    );
    if (areaMatch) return areaMatch;
  }

  if (location.centerId) {
    const centerMatch = enabledItems.find(
      (t) => t.resolved_scope_level === 'center' && t.center_id === location.centerId
    );
    if (centerMatch) return centerMatch;
  }

  if (location.governorateId) {
    const govMatch = enabledItems.find(
      (t) => t.resolved_scope_level === 'governorate' && t.governorate_id === location.governorateId
    );
    if (govMatch) return govMatch;
  }

  return null;
}

/**
 * جلب نطاق التغطية والتسعير المركزي للمطعم (للقراءة فقط) من جدول delivery_area_tariffs
 * الشروط المعتمدة حصراً:
 * - service_type = 'ready_food'
 * - delivery_owner = 'restaurant'
 * - restaurant_id = معرف المطعم الحالي
 * مع إثراء الأسماء الجغرافية مباشرة من جداول geo_governorates / geo_centers / geo_areas
 * دون استخدام أسماء أعمدة تخمينية أو استبدال customer_delivery_fee بـ base_delivery_fee
 */
export async function fetchRestaurantCentralTariffs(
  restaurantId: string,
  options?: { onlyEnabled?: boolean }
): Promise<ServiceResult<CentralDeliveryTariffItem[]>> {
  if (!isSupabaseConfigured) {
    return {
      data: null,
      error: 'إعدادات الاتصال بـ Supabase غير مهيأة لقراءة التسعير المركزي.',
    };
  }

  if (!restaurantId) {
    return { data: [], error: null };
  }

  try {
    let query = supabase
      .from('delivery_area_tariffs')
      .select(TARIFF_SELECT_COLUMNS)
      .eq('service_type', 'ready_food')
      .eq('delivery_owner', 'restaurant')
      .eq('restaurant_id', restaurantId);

    if (options?.onlyEnabled) {
      query = query.eq('is_enabled', true);
    }

    const { data: tariffRows, error } = await query.order('created_at', { ascending: false });

    if (error) {
      const msgLower = (error.message || '').toLowerCase();
      const isPerm =
        error.code === '42501' ||
        error.code === 'PGRST301' ||
        msgLower.includes('permission denied') ||
        msgLower.includes('row-level security');

      console.error('Error fetching delivery_area_tariffs:', error);
      return {
        data: null,
        isPermissionError: isPerm,
        error: isPerm
          ? 'صلاحيات قاعدة البيانات (RLS) تمنع قراءة جدول التسعير المركزي delivery_area_tariffs حاليًا للمطعم (يلزم وجود سياسة SELECT مقيّدة لصاحب المطعم).'
          : `تعذر جلب تسعير التوصيل المركزي: ${error.message}`,
      };
    }

    const rows = (tariffRows || []) as unknown as DbDeliveryAreaTariff[];
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
      const resolvedScope = resolveTariffScopeLevel(row);
      const isEnabled = row.is_enabled === true;

      return {
        id: row.id,
        service_type: row.service_type,
        delivery_owner: row.delivery_owner,
        restaurant_id: row.restaurant_id ?? null,
        governorate_id: row.governorate_id ?? null,
        center_id: row.center_id ?? null,
        area_id: row.area_id ?? null,
        scope_level: row.scope_level ?? null,
        resolved_scope_level: resolvedScope,
        governorate_name: row.governorate_id
          ? govMap[row.governorate_id] || 'محافظة غير محددة'
          : 'كل المحافظات',
        center_name: row.center_id
          ? centerMap[row.center_id] || 'مركز/مدينة'
          : 'كل المراكز',
        area_name: row.area_id
          ? areaMap[row.area_id] || 'حي/منطقة'
          : 'المركز بالكامل',
        base_delivery_fee: parseNullableNumber(row.base_delivery_fee),
        admin_commission: parseNullableNumber(row.admin_commission),
        driver_net_fee: parseNullableNumber(row.driver_net_fee),
        customer_delivery_fee: parseNullableNumber(row.customer_delivery_fee),
        is_enabled: isEnabled,
        notes: row.notes || null,
        created_at: row.created_at,
        updated_at: row.updated_at,
        raw: row,
      };
    });

    const filteredItems = options?.onlyEnabled ? items.filter((item) => item.is_enabled) : items;

    return { data: sortCentralTariffsByPriority(filteredItems), error: null };
  } catch (err: any) {
    return {
      data: null,
      error: err?.message || 'فشل الاتصال بقاعدة البيانات لجلب التغطية والتسعير المركزي.',
    };
  }
}

/**
 * جلب الإعدادات الإدارية المركزية العامة من جدول restaurant_section_settings (للقراءة فقط)
 * بدون أي اعتماد على no_driver_timeout_minutes أو إرجاع قيم افتراضية عند غياب الإعداد أو فشل القراءة
 */
export async function fetchSectionSettings(): Promise<ServiceResult<RestaurantSectionSettings>> {
  if (!isSupabaseConfigured) {
    return {
      data: null,
      error: 'إعدادات الاتصال بـ Supabase غير مهيأة لقراءة إعدادات القسم المركزية.',
    };
  }

  try {
    const { data, error } = await supabase
      .from('restaurant_section_settings')
      .select('id, section_enabled, created_at, updated_at')
      .limit(1)
      .maybeSingle();

    if (error) {
      const msgLower = (error.message || '').toLowerCase();
      const isPerm =
        error.code === '42501' ||
        error.code === 'PGRST301' ||
        msgLower.includes('permission denied') ||
        msgLower.includes('row-level security');

      console.warn('Could not fetch restaurant_section_settings:', error.message);
      return {
        data: null,
        isPermissionError: isPerm,
        error: isPerm
          ? 'صلاحيات قاعدة البيانات (RLS) تمنع قراءة إعدادات قسم المطاعم المركزية restaurant_section_settings.'
          : `تعذر جلب إعدادات القسم المركزية: ${error.message}`,
      };
    }

    if (!data) {
      return {
        data: null,
        error: 'لا توجد إعدادات مركزية مسجلة في جدول restaurant_section_settings.',
      };
    }

    return {
      data: {
        id: data.id,
        section_enabled: typeof data.section_enabled === 'boolean' ? data.section_enabled : null,
        created_at: data.created_at,
        updated_at: data.updated_at,
      },
      error: null,
    };
  } catch (err: any) {
    return {
      data: null,
      error: err?.message || 'فشل الاتصال بقاعدة البيانات لجلب إعدادات القسم المركزية.',
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
