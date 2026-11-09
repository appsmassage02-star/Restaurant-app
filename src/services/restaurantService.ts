import { supabase, isSupabaseConfigured } from './supabase';
import {
  DbRestaurant,
  DbProfile,
  CreateRestaurantPayload,
  RestaurantCategoryLink,
  FoodGovernorate,
  FoodCenter,
  FoodArea,
} from '../types/database';

export interface RestaurantFetchResult {
  restaurant: DbRestaurant | null;
  error: string | null;
}

export type SupabaseErrorCategory = 'connection' | 'auth' | 'permission' | 'schema' | 'unknown';

export interface ProfileFetchResult {
  profile: DbProfile | null;
  accountStatus: 'active' | 'banned' | 'suspended';
  isBanned: boolean;
  isSuspended: boolean;
  banReason?: string;
  error: string | null;
  isConnectionError?: boolean;
  errorCategory?: SupabaseErrorCategory;
}

export interface CreateRestaurantResult {
  success: boolean;
  restaurant?: DbRestaurant;
  blockedByRls?: boolean;
  categoryLinksBlockedByRls?: boolean;
  error?: string;
  details?: string;
  requiredPath?: string;
  warning?: string;
}

/**
 * جلب سجل المطعم المرتبط بالمستخدم الحالي فقط (owner_user_id = auth.uid())
 * تلتزم بسياسات RLS ولا تجلب مطاعم لمستخدمين آخرين
 */
export async function fetchOwnerRestaurant(
  ownerUserId: string
): Promise<RestaurantFetchResult> {
  if (!isSupabaseConfigured || !ownerUserId) {
    return { restaurant: null, error: null };
  }

  try {
    const { data, error } = await supabase
      .from('restaurants')
      .select('*')
      .eq('owner_user_id', ownerUserId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching owner restaurant:', error);
      return {
        restaurant: null,
        error: `خطأ في جلب بيانات المطعم من قاعدة البيانات: ${error.message}`,
      };
    }

    if (!data) {
      return { restaurant: null, error: null };
    }

    const rest = data as DbRestaurant;

    // Fetch joined governorate, center, area names if available
    try {
      if (rest.governorate_id) {
        const { data: gData } = await supabase
          .from('food_governorates')
          .select('id, name_ar, country_name')
          .eq('id', rest.governorate_id)
          .maybeSingle();
        if (gData) rest.governorate = gData as FoodGovernorate;
      }

      if (rest.center_id) {
        const { data: cData } = await supabase
          .from('food_centers')
          .select('id, name_ar, governorate_id')
          .eq('id', rest.center_id)
          .maybeSingle();
        if (cData) rest.center = cData as FoodCenter;
      }

      if (rest.area_id) {
        const { data: aData } = await supabase
          .from('food_areas')
          .select('id, name_ar, center_id')
          .eq('id', rest.area_id)
          .maybeSingle();
        if (aData) rest.area = aData as FoodArea;
      }
    } catch {
      // Non-blocking relation enrichment
    }

    // Fetch category links
    try {
      const { data: catLinks } = await supabase
        .from('restaurant_category_links')
        .select('restaurant_id, category_id')
        .eq('restaurant_id', rest.id);

      if (catLinks) {
        rest.category_links = catLinks as RestaurantCategoryLink[];
      }
    } catch {
      // Non-blocking
    }

    return { restaurant: rest, error: null };
  } catch (err: any) {
    return {
      restaurant: null,
      error: err?.message || 'فشل الاتصال بـ Supabase لجلب بيانات المطعم.',
    };
  }
}

export interface ClassifiedSupabaseError {
  category: SupabaseErrorCategory;
  userMessage: string;
  isConnectionError: boolean;
  code?: string;
}

/**
 * تصنيف أخطاء Supabase بدقة وفق أكواد PostgREST وPostgreSQL الفعلية:
 * 1. خطأ اتصال / شبكة / مهلة (isConnectionError = true)
 * 2. خطأ مصادقة وجلسة JWT (isConnectionError = false)
 * 3. خطأ صلاحيات أو RLS (isConnectionError = false)
 * 4. خطأ مخطط أو صيغة استعلام (isConnectionError = false)
 * 5. أخطاء أخرى غير معروفة (isConnectionError = false)
 */
export function classifySupabaseError(error: any): ClassifiedSupabaseError {
  if (!error) {
    return {
      category: 'unknown',
      userMessage: 'حدث خطأ غير معروف أثناء قراءة البيانات.',
      isConnectionError: false,
    };
  }

  const message = String(error?.message || '').toLowerCase();
  const code = String(error?.code || '').toUpperCase();
  const details = String(error?.details || '').toLowerCase();

  // 1. Connection / Network / Timeout errors (تقتصر فقط على الأخطاء المثبتة لانقطاع الشبكة)
  const isConnection =
    message.includes('failed to fetch') ||
    message.includes('network error') ||
    message.includes('networkerror') ||
    message.includes('fetch failed') ||
    message.includes('net::err_') ||
    message.includes('offline') ||
    code === 'ETIMEDOUT' ||
    code === 'ECONNREFUSED' ||
    code === 'ECONNABORTED' ||
    code === 'ENOTFOUND' ||
    code === 'FETCH_ERROR';

  if (isConnection) {
    return {
      category: 'connection',
      userMessage: 'تعذر الاتصال بـ Supabase. يرجى التحقق من اتصال الإنترنت أو خادم الخدمة.',
      isConnectionError: true,
      code,
    };
  }

  // 2. Authentication & Session (JWT) errors (مفصولة تمامًا عن الصلاحيات والـ RLS)
  const isAuthError =
    code === 'PGRST300' || // JWT invalid
    code === 'PGRST301' || // JWT expired
    code === 'PGRST302' || // JWT secret is missing
    code === 'PGRST303' || // JWT claim is invalid / missing
    code === 'INVALID_JWT' ||
    message.includes('jwt expired') ||
    message.includes('jwt is expired') ||
    message.includes('invalid jwt') ||
    message.includes('jwt invalid') ||
    message.includes('jwt malformed') ||
    message.includes('token is expired') ||
    message.includes('invalid claim');

  if (isAuthError) {
    return {
      category: 'auth',
      userMessage: 'انتهت صلاحية جلسة تسجيل الدخول أو الرمز غير صالح (JWT). يرجى إعادة تسجيل الدخول.',
      isConnectionError: false,
      code,
    };
  }

  // 3. Permission & Row-Level Security (RLS) errors
  const isPermission =
    code === '42501' || // PostgreSQL insufficient_privilege
    message.includes('permission denied') ||
    message.includes('row-level security') ||
    message.includes('violates row-level security policy') ||
    details.includes('permission denied') ||
    details.includes('row-level security');

  if (isPermission) {
    return {
      category: 'permission',
      userMessage: 'لا تملك الصلاحية الكافية لقراءة بيانات هذا السجل (قيود الوصول RLS).',
      isConnectionError: false,
      code,
    };
  }

  // 4. Schema & Query errors (أكواد PostgREST وPostgreSQL المثبتة فقط دون استخدام بادئات عشوائية)
  const isSchema =
    code === '42703' || // PostgreSQL undefined_column
    code === '42P01' || // PostgreSQL undefined_table
    code === '42883' || // PostgreSQL undefined_function
    code === '42601' || // PostgreSQL syntax_error
    code === 'PGRST100' || // PostgREST syntax error in query
    code === 'PGRST102' || // PostgREST invalid request body
    code === 'PGRST103' || // PostgREST invalid range
    code === 'PGRST105' || // PostgREST invalid order by
    code === 'PGRST106' || // PostgREST schema cache reload error
    code === 'PGRST200' || // PostgREST relationship not found
    code === 'PGRST204' || // PostgREST column not found
    (message.includes('does not exist') &&
      (message.includes('column') || message.includes('relation') || message.includes('table'))) ||
    message.includes('syntax error');

  if (isSchema) {
    return {
      category: 'schema',
      userMessage: 'خطأ في استعلام بيانات الملف الشخصي بقاعدة البيانات (حقل أو جدول غير مطابق).',
      isConnectionError: false,
      code,
    };
  }

  // 5. Other / Unknown errors (لا تُعتبر خطأ اتصال ولا تدل على حظر الحساب)
  return {
    category: 'unknown',
    userMessage: error?.message || 'حدث خطأ غير متوقع أثناء قراءة بيانات الملف الشخصي.',
    isConnectionError: false,
    code,
  };
}

/**
 * جلب الملف الشخصي للمستخدم الحالي من جدول profiles
 * والتحقق من حالة الحساب اعتمادًا على الأعمدة الفعلية فقط (is_blocked و status)
 * دون افتراض وجود أعمدة غير موجودة مثل is_banned أو is_suspended
 */
export async function fetchUserProfile(
  userId: string
): Promise<ProfileFetchResult> {
  if (!isSupabaseConfigured || !userId) {
    return {
      profile: null,
      accountStatus: 'active',
      isBanned: false,
      isSuspended: false,
      error: null,
    };
  }

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, phone, email, is_blocked, status, created_at, updated_at')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.warn('Could not fetch profile from Supabase:', error);
      const classified = classifySupabaseError(error);
      return {
        profile: null,
        accountStatus: 'active',
        isBanned: false,
        isSuspended: false,
        error: classified.userMessage,
        isConnectionError: classified.isConnectionError,
        errorCategory: classified.category,
      };
    }

    if (!data) {
      return {
        profile: null,
        accountStatus: 'active',
        isBanned: false,
        isSuspended: false,
        error: null,
      };
    }

    const profile = data as DbProfile;
    // التحقق من الحظر والتعليق اعتمادًا حصريًا على الأعمدة الفعلية: is_blocked و status
    const isBlocked =
      profile.is_blocked === true ||
      profile.status === 'blocked' ||
      profile.status === 'banned';

    const isSuspended =
      !isBlocked &&
      (profile.status === 'suspended' || profile.status === 'inactive');

    const accountStatus: 'active' | 'banned' | 'suspended' = isBlocked
      ? 'banned'
      : isSuspended
      ? 'suspended'
      : 'active';

    return {
      profile,
      accountStatus,
      isBanned: isBlocked,
      isSuspended,
      banReason: isBlocked
        ? 'تم حظر حساب هذا المستخدم من قبل إدارة النظام.'
        : isSuspended
        ? 'تم تعليق هذا الحساب مؤقتًا من قبل إدارة النظام.'
        : undefined,
      error: null,
    };
  } catch (err: any) {
    console.error('Exception in fetchUserProfile:', err);
    const classified = classifySupabaseError(err);
    return {
      profile: null,
      accountStatus: 'active',
      isBanned: false,
      isSuspended: false,
      error: classified.userMessage,
      isConnectionError: classified.isConnectionError,
      errorCategory: classified.category,
    };
  }
}

/**
 * تسجيل مطعم جديد في جدول restaurants
 * - يطابق بدقة الأعمدة الفعلية:
 *   (owner_user_id, name, description, phone, address, detailed_address, latitude, longitude, governorate_id, center_id, area_id, image_url, is_active, is_open)
 * - لا يستخدم RPC غير موجودة
 * - لا يستخدم أي إحداثيات افتراضية
 * - لا يتجاوز RLS ولا يستخدم service_role
 * - يتحقق من نتيجة إدراج التصنيفات في restaurant_category_links دون تجاهل أخطائها
 */
export async function attemptCreateRestaurant(
  payload: CreateRestaurantPayload
): Promise<CreateRestaurantResult> {
  if (!isSupabaseConfigured) {
    return {
      success: false,
      error: 'خدمة Supabase غير مهيأة بالبيئة الحالية.',
      details: 'يرجى تزويد المتغيرين VITE_SUPABASE_URL و VITE_SUPABASE_ANON_KEY.',
    };
  }

  // 1. الإدراج المباشر في جدول restaurants باستخدام سياسة restaurant_owner_insert للمستخدم المصادق
  try {
    const insertData: any = {
      owner_user_id: payload.owner_user_id,
      name: payload.name.trim(),
      description: payload.description?.trim() || null,
      phone: payload.phone.trim(),
      address: payload.address.trim(),
      detailed_address: (payload.detailed_address || payload.address).trim(),
      // إحداثيات حقيقية حصراً - لا إحداثيات افتراضية أو بديلة
      latitude: payload.latitude !== undefined && payload.latitude !== null ? payload.latitude : null,
      longitude: payload.longitude !== undefined && payload.longitude !== null ? payload.longitude : null,
      governorate_id: payload.governorate_id,
      center_id: payload.center_id,
      area_id: payload.area_id || null,
      image_url: payload.image_url || null,
      is_active: false,
      is_open: false,
    };

    const { data, error } = await supabase
      .from('restaurants')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      const isRlsError =
        error.code === '42501' ||
        error.message?.toLowerCase().includes('row-level security') ||
        error.message?.toLowerCase().includes('violates row-level security policy') ||
        error.message?.toLowerCase().includes('permission denied');

      if (isRlsError) {
        return {
          success: false,
          blockedByRls: true,
          error: 'سياسة الأمان (RLS) تمنع إدراج المطعم في جدول restaurants.',
          details: `رسالة RLS: ${error.message}. يرجى مراجعة صلاحيات سياسة restaurant_owner_insert وتطابق auth.uid() مع owner_user_id.`,
          requiredPath: 'التحقق من سياسة INSERT الممنوحة للمستخدمين المصادقين على جدول restaurants.',
        };
      }

      return {
        success: false,
        error: `خطأ في حفظ المطعم بقاعدة البيانات: ${error.message}`,
        details: error.details || error.hint || error.code,
      };
    }

    if (!data) {
      return {
        success: false,
        error: 'لم يتم إرجاع سجل المطعم بعد الحفظ في قاعدة البيانات.',
      };
    }

    const createdRestaurant = data as DbRestaurant;

    // 2. ربط التصنيفات في جدول restaurant_category_links والتحقق من النتيجة دون تجاهلها بصمت
    let categoryLinksError: string | null = null;
    let categoryLinksBlockedByRls = false;

    if (payload.category_ids && payload.category_ids.length > 0) {
      try {
        const links = payload.category_ids.map((catId) => ({
          restaurant_id: createdRestaurant.id,
          category_id: catId,
        }));

        const { error: catErr } = await supabase
          .from('restaurant_category_links')
          .insert(links);

        if (catErr) {
          console.warn('Failed to insert restaurant_category_links:', catErr);
          const isCatRls =
            catErr.code === '42501' ||
            catErr.message?.toLowerCase().includes('row-level security') ||
            catErr.message?.toLowerCase().includes('permission denied');

          categoryLinksBlockedByRls = isCatRls;
          categoryLinksError = isCatRls
            ? 'تم إنشاء وحفظ بيانات المطعم بنجاح في جدول restaurants، لكن تعذر حفظ ربط التصنيفات بسبب سياسة RLS على جدول restaurant_category_links (لا توجد سياسة INSERT للمالك على هذا الجدول حاليًا).'
            : `تم إنشاء المطعم، لكن فشل ربط التصنيفات: ${catErr.message}`;
        }
      } catch (catException: any) {
        categoryLinksError = `استثناء أثناء محاولة ربط التصنيفات: ${catException?.message}`;
      }
    }

    if (categoryLinksError) {
      return {
        success: true, // سجل المطعم نفسه حُفظ بنجاح في restaurants
        restaurant: createdRestaurant,
        categoryLinksBlockedByRls,
        warning: categoryLinksError,
        details: 'تم حفظ المطعم في قاعدة البيانات، ولكن لم تُربط التصنيفات لاحتياج جدول restaurant_category_links إلى سياسة INSERT للمالك.',
      };
    }

    return {
      success: true,
      restaurant: createdRestaurant,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'حدث خطأ غير متوقع أثناء محاولة إنشاء المطعم.',
    };
  }
}
