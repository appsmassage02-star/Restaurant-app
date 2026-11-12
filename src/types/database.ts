/**
 * واجهات وتعاريف جداول قاعدة بيانات Supabase الفعلية لمنظومة طلبات البيت
 * تم التحقق من المخطط الفعلي للأعمدة عبر قاعدة البيانات
 */

export interface DbProfile {
  id: string; // auth.uid()
  full_name?: string | null;
  phone?: string | null;
  email?: string | null;
  is_blocked?: boolean | null;
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
  commission_percent?: number | null;
  food_money_settlement_mode?: string | null;
  max_delivery_radius_km?: number | null;
  restaurant_delivery_enabled?: boolean | null;
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

/**
 * جداول الطلبات الفعلية في قاعدة بيانات Supabase (المرحلة الأولى)
 */
export interface DbRestaurantOrder {
  id: string; // uuid
  order_number: number | string;
  customer_user_id: string; // uuid
  restaurant_id: string; // uuid
  fulfillment_route: 'restaurant_delivery' | 'driver_delivery' | string;
  status: string;
  restaurant_name_snapshot?: string | null;
  restaurant_phone_snapshot?: string | null;
  restaurant_latitude_snapshot?: number | null;
  restaurant_longitude_snapshot?: number | null;
  customer_name: string;
  customer_phone: string;
  delivery_address: string;
  delivery_latitude?: number | null;
  delivery_longitude?: number | null;
  food_subtotal: number;
  discount_amount: number;
  delivery_fee: number;
  customer_total: number;
  commission_percent_snapshot?: number | null;
  driver_fee_share?: number | null;
  admin_fee_share?: number | null;
  restaurant_fee_share?: number | null;
  payment_method: string;
  restaurant_confirmed_at?: string | null;
  restaurant_rejected_at?: string | null;
  restaurant_confirmation_method?: string | null;
  cancellation_reason?: string | null;
  created_at: string;
  updated_at: string;
  delivery_governorate_name_snapshot?: string | null;
  delivery_center_name_snapshot?: string | null;
  delivery_area_name_snapshot?: string | null;
}

export interface DbRestaurantOrderItem {
  id: string; // uuid
  order_id: string; // uuid
  menu_item_id?: string | null; // uuid
  item_name_snapshot: string;
  unit_price_snapshot: number;
  quantity: number;
  discount_amount: number;
  line_total: number;
  customer_approved_price_change?: boolean | null;
  created_at: string;
}

export interface DbRestaurantOrderItemOption {
  id: string; // uuid
  order_item_id: string; // uuid
  option_name_snapshot: string;
  value_name_snapshot: string;
  extra_price_snapshot: number;
}

export interface DbRestaurantOrderStatusHistory {
  id: string; // uuid
  order_id: string; // uuid
  old_status?: string | null;
  new_status: string;
  changed_by?: string | null;
  note?: string | null;
  created_at: string;
}

export interface DbOrderWorkflowItem {
  order_item_id: string;
  item_name: string;
  ordered_quantity: number;
  available_quantity: number | null;
  availability_status?: string | null;
  approved_quantity?: number | null;
  resolution?: 'remove_shortage' | 'substitute' | string | null;
  substitute_name?: string | null;
  substitute_unit_price?: number | null;
  customer_approved?: boolean | null;
  // توافقية للتطبيق
  requested_quantity?: number;
  customer_decision?: string | null;
  substitute_item_name?: string | null;
  substitute_price?: number | null;
  is_customer_approved?: boolean | null;
  customer_approved_quantity?: number | null;
}

export interface DbRestaurantDeliveryOrder {
  id: string; // uuid
  order_id: string; // uuid
  driver_user_id?: string | null; // uuid
  status: string; // pending, assigned, picked_up, on_the_way, delivered, cancelled
  created_at: string;
  updated_at: string;
  assigned_at?: string | null;
  picked_up_at?: string | null;
  delivered_at?: string | null;
}

export interface DbRestaurantOrderCancellationRequest {
  id: string; // uuid
  order_id: string; // uuid
  requested_by?: string | null;
  reason: string;
  status: string; // pending, approved, rejected
  decision_reason?: string | null;
  decided_by?: string | null;
  decided_at?: string | null;
  created_at: string;
  updated_at?: string | null;
}

export interface DbPendingCancellation {
  id: string;
  order_id: string;
  order_number?: string | number;
  customer_name?: string;
  requested_by?: string | null;
  requested_by_role?: 'customer' | 'driver' | 'restaurant' | 'unknown' | string;
  reason: string;
  created_at: string;
  status?: string;
}
