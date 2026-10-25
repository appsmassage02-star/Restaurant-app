/**
 * واجهات وتعاريف جداول قاعدة بيانات Supabase لمنظومة طلبات البيت
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
  id: string | number;
  name: string;
  name_ar?: string | null;
  is_active?: boolean;
}

export interface FoodCenter {
  id: string | number;
  governorate_id: string | number;
  name: string;
  name_ar?: string | null;
  is_active?: boolean;
}

export interface FoodArea {
  id: string | number;
  center_id: string | number;
  name: string;
  name_ar?: string | null;
  is_active?: boolean;
}

export interface RestaurantCategory {
  id: string | number;
  name: string;
  name_ar?: string | null;
  description?: string | null;
  image_url?: string | null;
  is_active?: boolean;
}

export interface RestaurantCategoryLink {
  id?: string | number;
  restaurant_id: string;
  category_id: string | number;
}

export interface DbRestaurant {
  id: string;
  owner_user_id: string;
  name: string;
  description?: string | null;
  phone?: string | null;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  governorate_id?: string | number | null;
  center_id?: string | number | null;
  area_id?: string | number | null;
  logo_url?: string | null;
  image_url?: string | null;
  cover_image_url?: string | null;
  status?: 'pending' | 'approved' | 'rejected' | 'active' | 'suspended' | string;
  is_active?: boolean;
  is_open?: boolean;
  opening_hours?: string | null;
  holidays?: string | null;
  admin_commission_percent?: number | null;
  commission_rate?: number | null;
  delivery_fee?: number | null;
  rejection_reason?: string | null;
  created_at?: string;
  updated_at?: string;

  // Joined relations
  governorate?: FoodGovernorate | null;
  center?: FoodCenter | null;
  area?: FoodArea | null;
  category_links?: RestaurantCategoryLink[];
}

export interface CreateRestaurantPayload {
  owner_user_id: string;
  name: string;
  description: string;
  phone: string;
  address: string;
  latitude?: number;
  longitude?: number;
  governorate_id: string | number;
  center_id: string | number;
  area_id?: string | number | null;
  logo_url?: string;
  cover_image_url?: string;
  category_ids?: (string | number)[];
}
