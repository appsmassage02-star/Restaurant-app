import { createClient } from '@supabase/supabase-js';

const foodStorageUrl = (import.meta.env.VITE_FOOD_STORAGE_URL || '').trim();
const foodStorageAnonKey = (import.meta.env.VITE_FOOD_STORAGE_ANON_KEY || '').trim();

export const FOOD_STORAGE_BUCKET = 'restaurant-product-images' as const;
export const FOOD_STORAGE_UPLOAD_URL_FUNCTION = 'issue-restaurant-image-upload-url' as const;

export const isFoodStorageConfigured = Boolean(
  foodStorageUrl &&
    foodStorageAnonKey &&
    foodStorageUrl !== 'https://your-food-storage-project.supabase.co' &&
    !foodStorageUrl.includes('placeholder') &&
    foodStorageUrl.startsWith('http')
);

/**
 * عميل Supabase المستقل لمشروع الكتالوج وتخزين صور الأطعمة (Talabaty Food Storage)
 * معزول تماماً عن حسابات المستخدمين والجلسات (persistSession: false)
 * ويُستخدم حصرياً لرفع وقراءة الصور في الـ Bucket المعتمد: restaurant-product-images
 */
export const foodStorageSupabase = createClient(
  isFoodStorageConfigured ? foodStorageUrl : 'https://placeholder-storage.supabase.co',
  isFoodStorageConfigured ? foodStorageAnonKey : 'placeholder-storage-anon-key',
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  }
);

export function getFoodStorageConfig() {
  return {
    isConfigured: isFoodStorageConfigured,
    url: foodStorageUrl || null,
    anonKey: foodStorageAnonKey || null,
    bucket: FOOD_STORAGE_BUCKET,
    edgeFunctionName: FOOD_STORAGE_UPLOAD_URL_FUNCTION,
  };
}
