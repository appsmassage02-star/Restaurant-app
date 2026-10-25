/**
 * واجهات وتعاريف جداول قاعدة بيانات Supabase الفعلية لمنظومة طلبات البيت
 * تم التحقق من المخطط الفعلي للأعمدة عبر قاعدة البيانات
 */

export interface DbProfile {
  id: string; // auth.uid()
  full_name?: string | null;
  name?: string | null;
  phone?: string | null;
  email?: string | null;
  role?: string | null;
  is_banned?: boolean | null;
  is_suspended?: boolean | null;
  status?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface FoodGovernorate {
  id: string; // uuid
  country_name?: string | null;
  name_ar: string; // اسم المحافظة بالعربية
  name_en?: string | null;
  code?: string | null;
  is_active?: boolean;
  sort_order?: number | null;
  created_at?: string;
  updated_at?: string;
}

export interface FoodCenter {
  id: string; // uuid
  governorate_id: string; // uuid
  name_ar: string; // اسم المركز/المدينة بالعربية
  name_en?: string | null;
  is_active?: boolean;
  sort_order?: number | null;
  source_code?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface FoodArea {
  id: string; // uuid
  governorate_id?: string | null; // uuid
  center_id: string; // uuid
  name_ar: string; // اسم المنطقة/الحي بالعربية
  name_en?: string | null;
  is_active?: boolean;
  sort_order?: number | null;
  created_at?: string;
  updated_at?: string;
}

export interface RestaurantCategory {
  id: string; // uuid
  name: string; // اسم التصنيف (مثل: مطعم مشويات، حلويات...)
  description?: string | null;
  image_url?: string | null;
  is_active?: boolean;
  sort_order?: number | null;
  created_at?: string;
}

export interface RestaurantCategoryLink {
  restaurant_id: string; // uuid
  category_id: string; // uuid
}

export interface DbRestaurant {
  id: string; // uuid
  owner_user_id: string; // uuid (auth.uid)
  name: string;
  description?: string | null;
  phone?: string | null;
  address?: string | null;
  detailed_address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  governorate_id?: string | null; // uuid
  center_id?: string | null; // uuid
  area_id?: string | null; // uuid
  image_url?: string | null; // صورة المطعم
  is_active?: boolean; // حالة تفعيل المطعم من الإدارة
  is_open?: boolean; // حالة فتح/إغلاق المطعم لاستقبال الطلبات
  delivery_fee?: number | null;
  created_at?: string;
  updated_at?: string;

  // العلاقات المحملة
  governorate?: FoodGovernorate | null;
  center?: FoodCenter | null;
  area?: FoodArea | null;
  category_links?: RestaurantCategoryLink[];
}

export interface CreateRestaurantPayload {
  owner_user_id: string;
  name: string;
  description?: string;
  phone: string;
  address: string;
  detailed_address?: string;
  latitude?: number | null;
  longitude?: number | null;
  governorate_id: string;
  center_id: string;
  area_id?: string | null;
  image_url?: string | null;
  category_ids?: string[];
}
