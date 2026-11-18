import { supabase, isSupabaseConfigured } from './supabase';
import {
  DbAppSectionSettings,
  DbDeliveryAreaTariff,
  DeliveryScopeLevel,
} from '../types/database';
import {
  AppSectionSettings,
  OperationalIntakeBlockReason,
  OperationalStatusEvaluation,
} from '../types';

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

export const READY_FOOD_SECTION_KEY = 'ready_food';

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

const APP_SECTION_SETTINGS_SELECT_COLUMNS =
  'section_key, section_enabled, section_visible, delivery_enabled, disabled_display_mode, display_width, updated_at, updated_by' as const;

export function mapDbAppSectionSettings(row: DbAppSectionSettings): AppSectionSettings {
  return {
    sectionKey: typeof row.section_key === 'string' ? row.section_key : '',
    sectionEnabled: typeof row.section_enabled === 'boolean' ? row.section_enabled : null,
    sectionVisible: typeof row.section_visible === 'boolean' ? row.section_visible : null,
    deliveryEnabled: typeof row.delivery_enabled === 'boolean' ? row.delivery_enabled : null,
    disabledDisplayMode: row.disabled_display_mode ?? null,
    displayWidth: row.display_width ?? null,
    updatedAt: row.updated_at ?? null,
    updatedBy: row.updated_by ?? null,
  };
}

/**
 * قراءة إعدادات قسم الأكلات الجاهزة المركزية من جدول public.app_section_settings
 * بشرط section_key = 'ready_food' (للقراءة فقط دون أي تعديل أو قيم افتراضية وهمية).
 * يلتزم حصريًا بالأعمدة الفعلية دون id أو created_at ودون الاعتماد على v2_enabled.
 */
export async function fetchReadyFoodSectionSettings(): Promise<ServiceResult<AppSectionSettings>> {
  if (!isSupabaseConfigured) {
    return {
      data: null,
      error: 'إعدادات الاتصال بـ Supabase غير مهيأة لقراءة إعدادات قسم الأكلات الجاهزة المركزية.',
    };
  }

  try {
    const { data, error } = await supabase
      .from('app_section_settings')
      .select(APP_SECTION_SETTINGS_SELECT_COLUMNS)
      .eq('section_key', READY_FOOD_SECTION_KEY)
      .limit(1)
      .maybeSingle<DbAppSectionSettings>();

    if (error) {
      const msgLower = (error.message || '').toLowerCase();
      const isPerm =
        error.code === '42501' ||
        error.code === 'PGRST301' ||
        msgLower.includes('permission denied') ||
        msgLower.includes('row-level security');

      console.warn('Could not fetch app_section_settings (ready_food):', error.message);
      return {
        data: null,
        isPermissionError: isPerm,
        error: isPerm
          ? 'صلاحيات قاعدة البيانات (RLS) تمنع قراءة إعدادات قسم الأكلات الجاهزة من جدول app_section_settings.'
          : `تعذر جلب إعدادات القسم المركزي (ready_food): ${error.message}`,
      };
    }

    if (!data) {
      return {
        data: null,
        error: "لا يوجد سجل إعدادات مركزي للقسم (section_key = 'ready_food') في جدول app_section_settings.",
      };
    }

    return {
      data: mapDbAppSectionSettings(data),
      error: null,
    };
  } catch (err: any) {
    return {
      data: null,
      error: err?.message || 'فشل الاتصال بقاعدة البيانات لجلب إعدادات القسم المركزي.',
    };
  }
}

/**
 * تقييم حالة التشغيل على المستويين بوضوح ودون خلط:
 * - المستوى الأول: إعدادات المنصة العامة (app_section_settings لقسم ready_food)
 * - المستوى الثاني: حالة المطعم الفردي (is_active, is_open, restaurant_delivery_enabled)
 * مع ضمان استمرار الطلبات القائمة بالفعل في مسارها وعدم إلغائها تلقائيًا عند توقف القسم أو التوصيل.
 */
export function evaluateReadyFoodOperationalState(
  sectionSettings: AppSectionSettings | null,
  restaurantState: {
    isApproved: boolean;
    isOpen: boolean;
    restaurantDeliveryEnabled: boolean;
  }
): OperationalStatusEvaluation {
  const platformSectionEnabled = sectionSettings ? sectionSettings.sectionEnabled : null;
  const platformSectionVisible = sectionSettings ? sectionSettings.sectionVisible : null;
  const platformDeliveryEnabled = sectionSettings ? sectionSettings.deliveryEnabled : null;

  const platformStatusKnown =
    platformSectionEnabled !== null && platformDeliveryEnabled !== null;

  const platformAllowsNewOrders =
    platformSectionEnabled === true && platformDeliveryEnabled === true;

  const platformSectionLabel =
    platformSectionEnabled === true
      ? 'القسم مفعل'
      : platformSectionEnabled === false
      ? 'القسم متوقف'
      : 'غير متاح مركزيًا';

  const platformDeliveryLabel =
    platformDeliveryEnabled === true
      ? 'خدمة التوصيل مفعلة'
      : platformDeliveryEnabled === false
      ? 'خدمة التوصيل متوقفة'
      : 'غير متاح مركزيًا';

  const platformVisibilityLabel =
    platformSectionVisible === true
      ? 'ظاهر في المنصة'
      : platformSectionVisible === false
      ? 'مخفي مركزيًا'
      : 'غير محدد مركزيًا';

  const restaurantApproved = Boolean(restaurantState.isApproved);
  const restaurantIsOpen = Boolean(restaurantState.isOpen);
  const restaurantSelfDeliveryEnabled = Boolean(restaurantState.restaurantDeliveryEnabled);
  const restaurantAllowsNewOrders = restaurantApproved && restaurantIsOpen;

  const canReceiveNewOrders = platformAllowsNewOrders && restaurantAllowsNewOrders;
  const canAcceptNewDeliveryOrders = canReceiveNewOrders;
  const canProcessExistingOrders = restaurantApproved;

  let intakeBlockReason: OperationalIntakeBlockReason = 'READY';
  let intakeStatusTitle = 'القسم مفعل وخدمة التوصيل مفعلة والمطعم جاهز لاستقبال الطلبات';
  let intakeStatusMessage =
    'إعدادات المنصة العامة لقسم الأكلات الجاهزة مفعلة، ومطعمك معتمد ومفتوح لاستقبال الطلبات الجديدة.';

  if (platformSectionEnabled === false) {
    intakeBlockReason = 'PLATFORM_SECTION_DISABLED';
    intakeStatusTitle = 'قسم الأكلات الجاهزة متوقف مركزيًا من إدارة المنصة';
    intakeStatusMessage =
      'تم إيقاف استقبال الطلبات الجديدة لقسم الأكلات الجاهزة على مستوى المنصة. إعدادات مطعمك الفردية محفوظة كما هي، وتستمر الطلبات الحالية القائمة في مسارها حتى الإكمال دون أي إلغاء تلقائي.';
  } else if (platformSectionEnabled === true && platformDeliveryEnabled === false) {
    intakeBlockReason = 'PLATFORM_DELIVERY_DISABLED';
    intakeStatusTitle = 'القسم مفعل ولكن خدمة التوصيل متوقفة مركزيًا';
    intakeStatusMessage =
      'قسم الأكلات الجاهزة مفعل، غير أن خدمة التوصيل المركزية متوقفة مؤقتًا فلا يمكن إنشاء أو استقبال طلبات توصيل جديدة. هذا التوقف مركزي ولا يعني أن العميل خارج النطاق الجغرافي، وتستمر الطلبات الحالية القائمة في مسارها حتى الإكمال.';
  } else if (!platformStatusKnown) {
    intakeBlockReason = 'SECTION_SETTINGS_UNAVAILABLE';
    intakeStatusTitle = 'تعذر التحقق من حالة قسم الأكلات الجاهزة والتوصيل المركزي';
    intakeStatusMessage =
      'لم يتم استلام بيانات التشغيل المركزية من جدول app_section_settings لقسم ready_food، ولا يتم افتراض التفعيل تلقائيًا. تستمر متابعة الطلبات القائمة فقط بصورة طبيعية.';
  } else if (!restaurantApproved) {
    intakeBlockReason = 'RESTAURANT_INACTIVE';
    intakeStatusTitle = 'المطعم غير مفعّل إداريًا بعد';
    intakeStatusMessage =
      'إعدادات المنصة العامة مفعلة، ولكن حساب مطعمك الفردي بانتظار التفعيل الإداري (is_active = true).';
  } else if (!restaurantIsOpen) {
    intakeBlockReason = 'RESTAURANT_CLOSED';
    intakeStatusTitle = 'المطعم مغلق مؤقتًا من إعداداتك الفردية';
    intakeStatusMessage =
      'قسم الأكلات الجاهزة وخدمة التوصيل المركزية مفعّلان، لكن مطعمك مغلق مؤقتًا (is_open = false) أمام الطلبات الجديدة، وتستمر الطلبات الحالية القائمة في مسارها حتى الإكمال.';
  }

  return {
    platformSectionEnabled,
    platformSectionVisible,
    platformDeliveryEnabled,
    platformStatusKnown,
    platformAllowsNewOrders,
    platformSectionLabel,
    platformVisibilityLabel,
    platformDeliveryLabel,
    restaurantApproved,
    restaurantIsOpen,
    restaurantSelfDeliveryEnabled,
    restaurantAllowsNewOrders,
    canReceiveNewOrders,
    canAcceptNewDeliveryOrders,
    canProcessExistingOrders,
    intakeBlockReason,
    intakeStatusTitle,
    intakeStatusMessage,
  };
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
