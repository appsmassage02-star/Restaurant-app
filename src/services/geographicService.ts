import { supabase, isSupabaseConfigured } from './supabase';
import { FoodGovernorate, FoodCenter, FoodArea, RestaurantCategory } from '../types/database';

export interface GeoServiceResult<T> {
  data: T[];
  error: string | null;
}

/**
 * جلب قائمة المحافظات المعتمدة من جدول food_governorates
 * الأعمدة الفعلية في قاعدة البيانات: id, country_name, name_ar, name_en, code, is_active, sort_order
 */
export async function fetchGovernorates(): Promise<GeoServiceResult<FoodGovernorate>> {
  if (!isSupabaseConfigured) {
    return {
      data: [],
      error: 'لم يتم ضبط إعدادات الاتصال بقاعدة البيانات (VITE_SUPABASE_URL و VITE_SUPABASE_ANON_KEY).',
    };
  }

  try {
    const { data, error } = await supabase
      .from('food_governorates')
      .select('id, country_name, name_ar, name_en, code, is_active, sort_order')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (error) {
      console.error('Error fetching food_governorates:', error);
      return { data: [], error: `تعذر جلب المحافظات: ${error.message}` };
    }

    return { data: (data || []) as FoodGovernorate[], error: null };
  } catch (err: any) {
    return { data: [], error: err?.message || 'فشل الاتصال بقاعدة البيانات لجلب المحافظات.' };
  }
}

/**
 * جلب المراكز التابعة لمحافظة محددة من جدول food_centers
 * الأعمدة الفعلية: id, governorate_id, name_ar, name_en, is_active, sort_order
 */
export async function fetchCenters(
  governorateId: string
): Promise<GeoServiceResult<FoodCenter>> {
  if (!isSupabaseConfigured || !governorateId) {
    return { data: [], error: null };
  }

  try {
    const { data, error } = await supabase
      .from('food_centers')
      .select('id, governorate_id, name_ar, name_en, is_active, sort_order')
      .eq('governorate_id', governorateId)
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (error) {
      console.error('Error fetching food_centers:', error);
      return { data: [], error: `تعذر جلب المراكز: ${error.message}` };
    }

    return { data: (data || []) as FoodCenter[], error: null };
  } catch (err: any) {
    return { data: [], error: err?.message || 'فشل جلب المراكز التابعة للمحافظة.' };
  }
}

/**
 * جلب المناطق التابعة لمركز محدد من جدول food_areas
 * الأعمدة الفعلية: id, governorate_id, center_id, name_ar, name_en, is_active, sort_order
 */
export async function fetchAreas(
  centerId: string
): Promise<GeoServiceResult<FoodArea>> {
  if (!isSupabaseConfigured || !centerId) {
    return { data: [], error: null };
  }

  try {
    const { data, error } = await supabase
      .from('food_areas')
      .select('id, governorate_id, center_id, name_ar, name_en, is_active, sort_order')
      .eq('center_id', centerId)
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (error) {
      console.error('Error fetching food_areas:', error);
      return { data: [], error: `تعذر جلب المناطق: ${error.message}` };
    }

    return { data: (data || []) as FoodArea[], error: null };
  } catch (err: any) {
    return { data: [], error: err?.message || 'فشل جلب المناطق التابعة للمركز.' };
  }
}

/**
 * جلب التصنيفات المعتمدة للمطاعم من جدول restaurant_categories
 * الأعمدة الفعلية: id, name, description, image_url, sort_order, is_active
 */
export async function fetchRestaurantCategories(): Promise<GeoServiceResult<RestaurantCategory>> {
  if (!isSupabaseConfigured) {
    return { data: [], error: null };
  }

  try {
    const { data, error } = await supabase
      .from('restaurant_categories')
      .select('id, name, description, image_url, sort_order, is_active')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (error) {
      console.error('Error fetching restaurant_categories:', error);
      return { data: [], error: `تعذر جلب تصنيفات المطاعم: ${error.message}` };
    }

    return { data: (data || []) as RestaurantCategory[], error: null };
  } catch (err: any) {
    return { data: [], error: err?.message || 'فشل جلب تصنيفات المطاعم.' };
  }
}
