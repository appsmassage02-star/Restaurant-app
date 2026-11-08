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

export interface ProfileFetchResult {
  profile: DbProfile | null;
  accountStatus: 'active' | 'banned' | 'suspended';
  isBanned: boolean;
  isSuspended: boolean;
  banReason?: string;
  error: string | null;
  isConnectionError?: boolean;
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
      console.warn('Could not fetch profile from Supabase:', error.message);
      return {
        profile: null,
        accountStatus: 'active',
        isBanned: false,
        isSuspended: false,
        error: `تعذر الاتصال بـ Supabase لجلب الملف الشخصي: ${error.message}`,
        isConnectionError: true,
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
    return {
      profile: null,
      accountStatus: 'active',
      isBanned: false,
      isSuspended: false,
      error: err?.message || 'فشل جلب ملف المستخدم بسبب انقطاع الاتصال.',
      isConnectionError: true,
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
