import { supabase, isSupabaseConfigured } from './supabase';
import {
  DbRestaurant,
  DbProfile,
  CreateRestaurantPayload,
  RestaurantCategoryLink,
} from '../types/database';

export interface RestaurantFetchResult {
  restaurant: DbRestaurant | null;
  error: string | null;
}

export interface ProfileFetchResult {
  profile: DbProfile | null;
  isBanned: boolean;
  isSuspended: boolean;
  banReason?: string;
  error: string | null;
}

export interface CreateRestaurantResult {
  success: boolean;
  restaurant?: DbRestaurant;
  blockedByRls?: boolean;
  error?: string;
  details?: string;
  requiredPath?: string;
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

    // Fetch joined category links if any
    try {
      const { data: catLinks } = await supabase
        .from('restaurant_category_links')
        .select('*')
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
 * والتحقق من حالة الحظر أو التعليق
 */
export async function fetchUserProfile(
  userId: string
): Promise<ProfileFetchResult> {
  if (!isSupabaseConfigured || !userId) {
    return { profile: null, isBanned: false, isSuspended: false, error: null };
  }

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.warn('Could not fetch profile:', error.message);
      // If table doesn't exist or RLS denies, return null gracefully without crashing auth
      return {
        profile: null,
        isBanned: false,
        isSuspended: false,
        error: error.message,
      };
    }

    if (!data) {
      return { profile: null, isBanned: false, isSuspended: false, error: null };
    }

    const profile = data as DbProfile;
    const isBanned =
      profile.is_banned === true ||
      profile.status === 'banned' ||
      profile.status === 'blocked';
    const isSuspended =
      profile.is_suspended === true ||
      profile.status === 'suspended' ||
      profile.status === 'inactive';

    return {
      profile,
      isBanned,
      isSuspended,
      banReason: isBanned
        ? 'تم حظر حساب هذا المستخدم من قبل إدارة النظام.'
        : isSuspended
        ? 'تم تعليق هذا الحساب مؤقتًا من قبل إدارة النظام.'
        : undefined,
      error: null,
    };
  } catch (err: any) {
    return {
      profile: null,
      isBanned: false,
      isSuspended: false,
      error: err?.message || 'فشل جلب ملف المستخدم.',
    };
  }
}

/**
 * فحص مسار إنشاء المطعم والصلاحيات قبل وبعد التنفيذ
 * - لا يتجاوز RLS
 * - لا يستخدم أي مفتاح سري (service_role)
 * - إذا منعت سياسات RLS العملية، يوقف خطوة الإنشاء ويوثق بدقة السبب والمسار المعتمد المطلوب
 */
export async function attemptCreateRestaurant(
  payload: CreateRestaurantPayload
): Promise<CreateRestaurantResult> {
  if (!isSupabaseConfigured) {
    return {
      success: false,
      error: 'خدمة Supabase غير مكونة بالبيئة الحالية.',
      details: 'يرجى تزويد المتغيرين VITE_SUPABASE_URL و VITE_SUPABASE_ANON_KEY.',
    };
  }

  // 1. أولاً: التحقق مما إذا كانت هناك دالة RPC معتمدة لإنشاء مطعم جديد
  try {
    const { data: rpcData, error: rpcError } = await supabase.rpc(
      'register_new_restaurant',
      {
        p_owner_user_id: payload.owner_user_id,
        p_name: payload.name,
        p_description: payload.description,
        p_phone: payload.phone,
        p_address: payload.address,
        p_latitude: payload.latitude,
        p_longitude: payload.longitude,
        p_governorate_id: payload.governorate_id,
        p_center_id: payload.center_id,
        p_area_id: payload.area_id || null,
        p_logo_url: payload.logo_url || null,
      }
    );

    if (!rpcError && rpcData) {
      return { success: true, restaurant: rpcData as DbRestaurant };
    }
  } catch {
    // RPC not present, proceed to standard table insert check
  }

  // 2. ثانيًا: محاولة الإدراج المباشر في جدول restaurants باستخدام صلاحيات المستخدم المصادق
  try {
    const insertData: any = {
      owner_user_id: payload.owner_user_id,
      name: payload.name,
      description: payload.description || null,
      phone: payload.phone,
      address: payload.address,
      latitude: payload.latitude || null,
      longitude: payload.longitude || null,
      governorate_id: payload.governorate_id,
      center_id: payload.center_id,
      area_id: payload.area_id || null,
      logo_url: payload.logo_url || null,
      cover_image_url: payload.cover_image_url || null,
      status: 'pending',
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
          error: 'سياسة الأمان (RLS) تمنع إنشاء سجل جديد في جدول المطاعم مباشرة بواسطة المستخدم.',
          details:
            'السياسات الحالية المرصودة على جدول "restaurants" تسمح للمالك بقراءة سجله فقط وللعامة بقراءة المطاعم النشطة، ولا توجد سياسة INSERT تسمح للمستخدم المصادق بإدراج مطعم جديد.',
          requiredPath:
            'اعتماد سياسة INSERT على جدول restaurants تشترط (auth.uid() = owner_user_id) أو تفعيل دالة RPC معتمدة (مثل create_restaurant) من قِبل إدارة النظام لمنع التجاوزات.',
        };
      }

      return {
        success: false,
        error: `خطأ في حفظ المطعم: ${error.message}`,
        details: error.details || error.hint || error.code,
      };
    }

    if (!data) {
      return {
        success: false,
        error: 'لم يتم إرجاع سجل المطعم بعد الإنشاء.',
      };
    }

    const createdRestaurant = data as DbRestaurant;

    // Link category if selected
    if (payload.category_ids && payload.category_ids.length > 0) {
      try {
        const links = payload.category_ids.map((catId) => ({
          restaurant_id: createdRestaurant.id,
          category_id: catId,
        }));
        await supabase.from('restaurant_category_links').insert(links);
      } catch (catErr) {
        console.warn('Could not insert restaurant category links:', catErr);
      }
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
