import { supabase, isSupabaseConfigured } from './supabase';
import { FoodGovernorate, FoodCenter, FoodArea, RestaurantCategory } from '../types/database';

export interface GeoServiceResult<T> {
  data: T[];
  error: string | null;
}

/**
 * جلب قائمة المحافظات المعتمدة من جدول food_governorates
 */
export async function fetchGovernorates(): Promise<GeoServiceResult<FoodGovernorate>> {
  if (!isSupabaseConfigured) {
    return {
      data: [],
      error: 'لم يتم تكوين متغيرات بيئة Supabase (VITE_SUPABASE_URL و VITE_SUPABASE_ANON_KEY).',
    };
  }

  try {
    const { data, error } = await supabase
      .from('food_governorates')
      .select('id, name, is_active')
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching food_governorates:', error);
      return { data: [], error: `خطأ في جلب المحافظات: ${error.message}` };
    }

    // Filter active if is_active column exists
    const list = (data || []).filter((g: any) => g.is_active === undefined || g.is_active === true);
    return { data: list as FoodGovernorate[], error: null };
  } catch (err: any) {
    return { data: [], error: err?.message || 'فشل الاتصال بقاعدة البيانات لجلب المحافظات.' };
  }
}

/**
 * جلب المراكز التابعة لمحافظة محددة من جدول food_centers
 */
export async function fetchCenters(
  governorateId: string | number
): Promise<GeoServiceResult<FoodCenter>> {
  if (!isSupabaseConfigured || !governorateId) {
    return { data: [], error: null };
  }

  try {
    const { data, error } = await supabase
      .from('food_centers')
      .select('id, governorate_id, name, is_active')
      .eq('governorate_id', governorateId)
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching food_centers:', error);
      return { data: [], error: `خطأ في جلب المراكز: ${error.message}` };
    }

    const list = (data || []).filter((c: any) => c.is_active === undefined || c.is_active === true);
    return { data: list as FoodCenter[], error: null };
  } catch (err: any) {
    return { data: [], error: err?.message || 'فشل جلب المراكز التابعة للمحافظة.' };
  }
}

/**
 * جلب المناطق التابعة لمركز محدد من جدول food_areas
 */
export async function fetchAreas(
  centerId: string | number
): Promise<GeoServiceResult<FoodArea>> {
  if (!isSupabaseConfigured || !centerId) {
    return { data: [], error: null };
  }

  try {
    const { data, error } = await supabase
      .from('food_areas')
      .select('id, center_id, name, is_active')
      .eq('center_id', centerId)
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching food_areas:', error);
      return { data: [], error: `خطأ في جلب المناطق: ${error.message}` };
    }

    const list = (data || []).filter((a: any) => a.is_active === undefined || a.is_active === true);
    return { data: list as FoodArea[], error: null };
  } catch (err: any) {
    return { data: [], error: err?.message || 'فشل جلب المناطق التابعة للمركز.' };
  }
}

/**
 * جلب التصنيفات المعتمدة للمطاعم من جدول restaurant_categories
 */
export async function fetchRestaurantCategories(): Promise<GeoServiceResult<RestaurantCategory>> {
  if (!isSupabaseConfigured) {
    return { data: [], error: null };
  }

  try {
    const { data, error } = await supabase
      .from('restaurant_categories')
      .select('id, name, description, is_active')
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching restaurant_categories:', error);
      return { data: [], error: `خطأ في جلب تصنيفات المطاعم: ${error.message}` };
    }

    const list = (data || []).filter((c: any) => c.is_active === undefined || c.is_active === true);
    return { data: list as RestaurantCategory[], error: null };
  } catch (err: any) {
    return { data: [], error: err?.message || 'فشل جلب تصنيفات المطاعم.' };
  }
}
