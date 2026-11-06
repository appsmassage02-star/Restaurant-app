import { supabase, isSupabaseConfigured } from './supabase';
import { Offer, DiscountType, OfferStatus } from '../types';

export interface ServiceResult<T> {
  data: T | null;
  error: string | null;
}

export interface DbRestaurantOffer {
  id: string;
  restaurant_id: string;
  title: string;
  description: string | null;
  discount_type: string;
  discount_value: number;
  starts_at: string | null;
  ends_at: string | null;
  is_active: boolean | null;
  created_at: string | null;
}

/**
 * تحويل تاريخ أو نص إلى حالة عرض دقيقة
 */
function computeOfferStatus(isActive: boolean | null, startsAt: string | null, endsAt: string | null): OfferStatus {
  if (isActive === false) return 'PAUSED';
  const now = new Date();
  if (endsAt) {
    const end = new Date(endsAt);
    if (end < now) return 'EXPIRED';
  }
  if (startsAt) {
    const start = new Date(startsAt);
    if (start > now) return 'DRAFT';
  }
  return 'ACTIVE';
}

/**
 * جلب جميع العروض الترويجية المسجلة في جدول restaurant_offers للمطعم الحالي فقط
 */
export async function fetchRestaurantOffers(
  restaurantId: string
): Promise<ServiceResult<Offer[]>> {
  if (!isSupabaseConfigured || !restaurantId) {
    return { data: [], error: null };
  }

  try {
    const { data, error } = await supabase
      .from('restaurant_offers')
      .select('id, restaurant_id, title, description, discount_type, discount_value, starts_at, ends_at, is_active, created_at')
      .eq('restaurant_id', restaurantId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching restaurant_offers:', error);
      return { data: null, error: `تعذر جلب العروض الترويجية: ${error.message}` };
    }

    const offers: Offer[] = (data || []).map((row: DbRestaurantOffer, idx: number) => {
      const discType: DiscountType =
        row.discount_type === 'FIXED' || row.discount_type === 'fixed'
          ? 'FIXED'
          : 'PERCENTAGE';

      const status = computeOfferStatus(row.is_active, row.starts_at, row.ends_at);

      return {
        id: row.id,
        title: row.title,
        description: row.description || '',
        bannerImage: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=1000&auto=format&fit=crop&q=80',
        discountType: discType,
        discountValue: Number(row.discount_value || 0),
        appliesToItemIds: [], // لا يوجد جدول ربط للأصناف في مخطط restaurant_offers الحالي
        startDate: row.starts_at ? row.starts_at.split('T')[0] : '',
        endDate: row.ends_at ? row.ends_at.split('T')[0] : '',
        status,
        sortOrder: idx + 1,
      };
    });

    return { data: offers, error: null };
  } catch (err: any) {
    return { data: null, error: err?.message || 'فشل الاتصال بقاعدة البيانات لجلب العروض.' };
  }
}

/**
 * إضافة عرض جديد في جدول restaurant_offers
 */
export async function createRestaurantOffer(
  restaurantId: string,
  offerData: Omit<Offer, 'id'>
): Promise<ServiceResult<Offer>> {
  if (!isSupabaseConfigured || !restaurantId) {
    return { data: null, error: 'الاتصال بقاعدة البيانات غير مهيأ أو معرف المطعم غير متوفر.' };
  }

  try {
    const insertPayload = {
      restaurant_id: restaurantId,
      title: offerData.title.trim(),
      description: offerData.description.trim() || null,
      discount_type: offerData.discountType,
      discount_value: offerData.discountValue,
      starts_at: offerData.startDate ? new Date(offerData.startDate).toISOString() : null,
      ends_at: offerData.endDate ? new Date(offerData.endDate).toISOString() : null,
      is_active: offerData.status === 'ACTIVE',
    };

    const { data, error } = await supabase
      .from('restaurant_offers')
      .insert(insertPayload)
      .select('*')
      .single();

    if (error) {
      console.error('Error creating offer:', error);
      return { data: null, error: `فشل حفظ العرض في قاعدة البيانات: ${error.message}` };
    }

    const row = data as DbRestaurantOffer;
    const discType: DiscountType = row.discount_type === 'FIXED' ? 'FIXED' : 'PERCENTAGE';
    const status = computeOfferStatus(row.is_active, row.starts_at, row.ends_at);

    return {
      data: {
        id: row.id,
        title: row.title,
        description: row.description || '',
        bannerImage: offerData.bannerImage,
        discountType: discType,
        discountValue: Number(row.discount_value),
        appliesToItemIds: [],
        startDate: row.starts_at ? row.starts_at.split('T')[0] : offerData.startDate,
        endDate: row.ends_at ? row.ends_at.split('T')[0] : offerData.endDate,
        status,
        sortOrder: offerData.sortOrder || 1,
      },
      error: null,
    };
  } catch (err: any) {
    return { data: null, error: err?.message || 'حدث خطأ غير متوقع أثناء إضافة العرض.' };
  }
}

/**
 * تعديل عرض ترويجي في جدول restaurant_offers
 */
export async function updateRestaurantOffer(
  offerId: string,
  updates: Partial<Offer>
): Promise<ServiceResult<boolean>> {
  if (!isSupabaseConfigured || !offerId) {
    return { data: null, error: 'معرف العرض غير صالح.' };
  }

  try {
    const updatePayload: Record<string, any> = {};
    if (updates.title !== undefined) updatePayload.title = updates.title.trim();
    if (updates.description !== undefined) updatePayload.description = updates.description.trim() || null;
    if (updates.discountType !== undefined) updatePayload.discount_type = updates.discountType;
    if (updates.discountValue !== undefined) updatePayload.discount_value = updates.discountValue;
    if (updates.startDate !== undefined) {
      updatePayload.starts_at = updates.startDate ? new Date(updates.startDate).toISOString() : null;
    }
    if (updates.endDate !== undefined) {
      updatePayload.ends_at = updates.endDate ? new Date(updates.endDate).toISOString() : null;
    }
    if (updates.status !== undefined) {
      updatePayload.is_active = updates.status === 'ACTIVE';
    }

    const { error } = await supabase
      .from('restaurant_offers')
      .update(updatePayload)
      .eq('id', offerId);

    if (error) {
      console.error('Error updating offer:', error);
      return { data: null, error: `فشل تعديل العرض في قاعدة البيانات: ${error.message}` };
    }

    return { data: true, error: null };
  } catch (err: any) {
    return { data: null, error: err?.message || 'حدث خطأ أثناء تعديل العرض.' };
  }
}

/**
 * تبديل حالة تفعيل العرض (is_active)
 */
export async function toggleRestaurantOfferStatus(
  offerId: string,
  newActiveState: boolean
): Promise<ServiceResult<boolean>> {
  if (!isSupabaseConfigured || !offerId) {
    return { data: null, error: 'معرف العرض غير صالح.' };
  }

  try {
    const { error } = await supabase
      .from('restaurant_offers')
      .update({ is_active: newActiveState })
      .eq('id', offerId);

    if (error) {
      return { data: null, error: `فشل تبديل حالة العرض: ${error.message}` };
    }

    return { data: true, error: null };
  } catch (err: any) {
    return { data: null, error: err?.message || 'حدث خطأ أثناء تبديل حالة العرض.' };
  }
}

/**
 * حذف عرض من جدول restaurant_offers
 */
export async function deleteRestaurantOffer(
  offerId: string
): Promise<ServiceResult<boolean>> {
  if (!isSupabaseConfigured || !offerId) {
    return { data: null, error: 'معرف العرض غير صالح.' };
  }

  try {
    const { error } = await supabase
      .from('restaurant_offers')
      .delete()
      .eq('id', offerId);

    if (error) {
      console.error('Error deleting offer:', error);
      return { data: null, error: `فشل حذف العرض من قاعدة البيانات: ${error.message}` };
    }

    return { data: true, error: null };
  } catch (err: any) {
    return { data: null, error: err?.message || 'حدث خطأ أثناء حذف العرض.' };
  }
}
