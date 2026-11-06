import { supabase, isSupabaseConfigured } from './supabase';
import { MenuCategory, MenuItem, OptionGroup, OptionItem } from '../types';

export interface ServiceResult<T> {
  data: T | null;
  error: string | null;
}

export interface DbMenuCategory {
  id: string;
  restaurant_id: string;
  name: string;
  sort_order: number | null;
  is_active: boolean | null;
  created_at: string | null;
}

export interface DbMenuItem {
  id: string;
  restaurant_id: string;
  category_id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  price: number;
  is_available: boolean | null;
  sort_order: number | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface DbItemOption {
  id: string;
  restaurant_id: string;
  menu_item_id: string;
  name: string;
  required: boolean | null;
  min_select: number | null;
  max_select: number | null;
  sort_order: number | null;
}

export interface DbItemOptionValue {
  id: string;
  option_id: string;
  name: string;
  extra_price: number | null;
  is_available: boolean | null;
  sort_order: number | null;
}

/**
 * جلب جميع أقسام المنيو الخاصة بالمطعم الحالي من جدول restaurant_menu_categories
 */
export async function fetchRestaurantMenuCategories(
  restaurantId: string
): Promise<ServiceResult<MenuCategory[]>> {
  if (!isSupabaseConfigured || !restaurantId) {
    return { data: [], error: null };
  }

  try {
    const { data, error } = await supabase
      .from('restaurant_menu_categories')
      .select('id, restaurant_id, name, sort_order, is_active, created_at')
      .eq('restaurant_id', restaurantId)
      .order('sort_order', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching restaurant_menu_categories:', error);
      return { data: null, error: `تعذر جلب أقسام المنيو: ${error.message}` };
    }

    const categories: MenuCategory[] = (data || []).map((row: DbMenuCategory) => ({
      id: row.id,
      name: row.name,
      sortOrder: row.sort_order ?? 1,
      isVisible: row.is_active !== false,
    }));

    return { data: categories, error: null };
  } catch (err: any) {
    return { data: null, error: err?.message || 'فشل الاتصال بقاعدة البيانات لجلب أقسام المنيو.' };
  }
}

/**
 * إضافة قسم جديد في جدول restaurant_menu_categories
 */
export async function createRestaurantMenuCategory(
  restaurantId: string,
  name: string,
  sortOrder: number = 1
): Promise<ServiceResult<MenuCategory>> {
  if (!isSupabaseConfigured || !restaurantId) {
    return { data: null, error: 'الاتصال بقاعدة البيانات غير مهيأ أو معرف المطعم غير متوفر.' };
  }

  try {
    const insertPayload = {
      restaurant_id: restaurantId,
      name: name.trim(),
      sort_order: sortOrder,
      is_active: true,
    };

    const { data, error } = await supabase
      .from('restaurant_menu_categories')
      .insert(insertPayload)
      .select('id, restaurant_id, name, sort_order, is_active, created_at')
      .single();

    if (error) {
      console.error('Error creating menu category:', error);
      return { data: null, error: `فشل حفظ القسم في قاعدة البيانات: ${error.message}` };
    }

    const row = data as DbMenuCategory;
    return {
      data: {
        id: row.id,
        name: row.name,
        sortOrder: row.sort_order ?? sortOrder,
        isVisible: row.is_active !== false,
      },
      error: null,
    };
  } catch (err: any) {
    return { data: null, error: err?.message || 'حدث خطأ غير متوقع أثناء إضافة القسم.' };
  }
}

/**
 * تحديث قسم في جدول restaurant_menu_categories
 */
export async function updateRestaurantMenuCategory(
  categoryId: string,
  updates: { name?: string; sortOrder?: number; isVisible?: boolean }
): Promise<ServiceResult<boolean>> {
  if (!isSupabaseConfigured || !categoryId) {
    return { data: null, error: 'معرف القسم غير صالح.' };
  }

  try {
    const updatePayload: Record<string, any> = {};
    if (updates.name !== undefined) updatePayload.name = updates.name.trim();
    if (updates.sortOrder !== undefined) updatePayload.sort_order = updates.sortOrder;
    if (updates.isVisible !== undefined) updatePayload.is_active = updates.isVisible;

    const { error } = await supabase
      .from('restaurant_menu_categories')
      .update(updatePayload)
      .eq('id', categoryId);

    if (error) {
      console.error('Error updating menu category:', error);
      return { data: null, error: `فشل تعديل القسم في قاعدة البيانات: ${error.message}` };
    }

    return { data: true, error: null };
  } catch (err: any) {
    return { data: null, error: err?.message || 'حدث خطأ أثناء تعديل القسم.' };
  }
}

/**
 * حذف قسم من جدول restaurant_menu_categories
 */
export async function deleteRestaurantMenuCategory(
  categoryId: string
): Promise<ServiceResult<boolean>> {
  if (!isSupabaseConfigured || !categoryId) {
    return { data: null, error: 'معرف القسم غير صالح.' };
  }

  try {
    // 1. التحقق أولاً من عدم وجود أصناف تابعة للقسم
    const { count, error: countErr } = await supabase
      .from('restaurant_menu_items')
      .select('id', { count: 'exact', head: true })
      .eq('category_id', categoryId);

    if (countErr) {
      console.warn('Error checking item count before category delete:', countErr);
    } else if (count && count > 0) {
      return {
        data: false,
        error: `لا يمكن حذف القسم لوجود ${count} أصناف تابعة له. يرجى نقل أو حذف الأصناف أولاً.`,
      };
    }

    const { error } = await supabase
      .from('restaurant_menu_categories')
      .delete()
      .eq('id', categoryId);

    if (error) {
      console.error('Error deleting menu category:', error);
      return { data: null, error: `فشل حذف القسم من قاعدة البيانات: ${error.message}` };
    }

    return { data: true, error: null };
  } catch (err: any) {
    return { data: null, error: err?.message || 'حدث خطأ أثناء حذف القسم.' };
  }
}

/**
 * جلب جميع أصناف المنيو للمطعم الحالي مع خياراتها
 * من الجداول:
 * restaurant_menu_items
 * restaurant_item_options
 * restaurant_item_option_values
 */
export async function fetchRestaurantMenuItems(
  restaurantId: string
): Promise<ServiceResult<MenuItem[]>> {
  if (!isSupabaseConfigured || !restaurantId) {
    return { data: [], error: null };
  }

  try {
    // 1. جلب الأصناف
    const { data: itemsData, error: itemsError } = await supabase
      .from('restaurant_menu_items')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .order('sort_order', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: true });

    if (itemsError) {
      console.error('Error fetching restaurant_menu_items:', itemsError);
      return { data: null, error: `تعذر جلب أصناف المنيو: ${itemsError.message}` };
    }

    if (!itemsData || itemsData.length === 0) {
      return { data: [], error: null };
    }

    const itemIds = itemsData.map((i: DbMenuItem) => i.id);

    // 2. جلب خيارات الأصناف إن وجدت
    let optionsByItem: Record<string, OptionGroup[]> = {};

    try {
      const { data: optionsData } = await supabase
        .from('restaurant_item_options')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .in('menu_item_id', itemIds)
        .order('sort_order', { ascending: true, nullsFirst: false });

      if (optionsData && optionsData.length > 0) {
        const optionIds = optionsData.map((o: DbItemOption) => o.id);

        // 3. جلب قيم الخيارات
        const { data: valuesData } = await supabase
          .from('restaurant_item_option_values')
          .select('*')
          .in('option_id', optionIds)
          .order('sort_order', { ascending: true, nullsFirst: false });

        const valuesByOption: Record<string, OptionItem[]> = {};
        (valuesData || []).forEach((val: DbItemOptionValue) => {
          if (!valuesByOption[val.option_id]) valuesByOption[val.option_id] = [];
          valuesByOption[val.option_id].push({
            id: val.id,
            name: val.name,
            price: Number(val.extra_price ?? 0),
            isAvailable: val.is_available !== false,
          });
        });

        optionsData.forEach((opt: DbItemOption) => {
          if (!optionsByItem[opt.menu_item_id]) optionsByItem[opt.menu_item_id] = [];
          optionsByItem[opt.menu_item_id].push({
            id: opt.id,
            name: opt.name,
            isRequired: Boolean(opt.required),
            minSelections: opt.min_select ?? 0,
            maxSelections: opt.max_select ?? 1,
            options: valuesByOption[opt.id] || [],
          });
        });
      }
    } catch (optErr) {
      console.warn('Could not enrich item options:', optErr);
    }

    const menuItems: MenuItem[] = itemsData.map((row: DbMenuItem) => ({
      id: row.id,
      categoryId: row.category_id,
      name: row.name,
      description: row.description || '',
      price: Number(row.price || 0),
      image: row.image_url || 'https://images.unsplash.com/photo-1544025162-d76694265947?w=600&auto=format&fit=crop&q=80',
      isAvailable: row.is_available !== false,
      sortOrder: row.sort_order ?? 1,
      optionGroups: optionsByItem[row.id] || [],
    }));

    return { data: menuItems, error: null };
  } catch (err: any) {
    return { data: null, error: err?.message || 'فشل الاتصال بقاعدة البيانات لجلب الأصناف.' };
  }
}

/**
 * إضافة صنف جديد للمنيو مع خياراته
 */
export async function createRestaurantMenuItem(
  restaurantId: string,
  itemData: Omit<MenuItem, 'id'>
): Promise<ServiceResult<MenuItem>> {
  if (!isSupabaseConfigured || !restaurantId) {
    return { data: null, error: 'الاتصال بقاعدة البيانات غير مهيأ أو معرف المطعم غير متوفر.' };
  }

  try {
    const insertPayload = {
      restaurant_id: restaurantId,
      category_id: itemData.categoryId,
      name: itemData.name.trim(),
      description: itemData.description.trim() || null,
      price: itemData.price,
      image_url: itemData.image?.trim() || null,
      is_available: itemData.isAvailable,
      sort_order: itemData.sortOrder,
    };

    const { data: createdItem, error: itemError } = await supabase
      .from('restaurant_menu_items')
      .insert(insertPayload)
      .select('*')
      .single();

    if (itemError) {
      console.error('Error inserting menu item:', itemError);
      return { data: null, error: `فشل حفظ الصنف في قاعدة البيانات: ${itemError.message}` };
    }

    const newItemId = createdItem.id;
    const savedOptionGroups: OptionGroup[] = [];

    // حفظ مجموعات الخيارات إن وُجدت
    if (itemData.optionGroups && itemData.optionGroups.length > 0) {
      for (let gIdx = 0; gIdx < itemData.optionGroups.length; gIdx++) {
        const group = itemData.optionGroups[gIdx];
        const { data: savedGroup, error: groupErr } = await supabase
          .from('restaurant_item_options')
          .insert({
            restaurant_id: restaurantId,
            menu_item_id: newItemId,
            name: group.name,
            required: group.isRequired,
            min_select: group.minSelections,
            max_select: group.maxSelections,
            sort_order: gIdx + 1,
          })
          .select('*')
          .single();

        if (!groupErr && savedGroup) {
          const savedValues: OptionItem[] = [];
          if (group.options && group.options.length > 0) {
            const valuesToInsert = group.options.map((opt, oIdx) => ({
              option_id: savedGroup.id,
              name: opt.name,
              extra_price: opt.price,
              is_available: opt.isAvailable,
              sort_order: oIdx + 1,
            }));

            const { data: insertedVals } = await supabase
              .from('restaurant_item_option_values')
              .insert(valuesToInsert)
              .select('*');

            if (insertedVals) {
              insertedVals.forEach((iv: DbItemOptionValue) => {
                savedValues.push({
                  id: iv.id,
                  name: iv.name,
                  price: Number(iv.extra_price ?? 0),
                  isAvailable: iv.is_available !== false,
                });
              });
            }
          }

          savedOptionGroups.push({
            id: savedGroup.id,
            name: savedGroup.name,
            isRequired: Boolean(savedGroup.required),
            minSelections: savedGroup.min_select ?? 0,
            maxSelections: savedGroup.max_select ?? 1,
            options: savedValues,
          });
        }
      }
    }

    return {
      data: {
        id: newItemId,
        categoryId: createdItem.category_id,
        name: createdItem.name,
        description: createdItem.description || '',
        price: Number(createdItem.price),
        image: createdItem.image_url || itemData.image,
        isAvailable: createdItem.is_available !== false,
        sortOrder: createdItem.sort_order ?? 1,
        optionGroups: savedOptionGroups,
      },
      error: null,
    };
  } catch (err: any) {
    return { data: null, error: err?.message || 'حدث خطأ غير متوقع أثناء إضافة الصنف.' };
  }
}

/**
 * تعديل صنف في جدول restaurant_menu_items مع خياراته
 */
export async function updateRestaurantMenuItem(
  restaurantId: string,
  itemId: string,
  updates: Partial<MenuItem>
): Promise<ServiceResult<boolean>> {
  if (!isSupabaseConfigured || !itemId) {
    return { data: null, error: 'معرف الصنف غير صالح.' };
  }

  try {
    const updatePayload: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (updates.name !== undefined) updatePayload.name = updates.name.trim();
    if (updates.description !== undefined) updatePayload.description = updates.description.trim() || null;
    if (updates.price !== undefined) updatePayload.price = updates.price;
    if (updates.categoryId !== undefined) updatePayload.category_id = updates.categoryId;
    if (updates.image !== undefined) updatePayload.image_url = updates.image.trim() || null;
    if (updates.isAvailable !== undefined) updatePayload.is_available = updates.isAvailable;
    if (updates.sortOrder !== undefined) updatePayload.sort_order = updates.sortOrder;

    const { error } = await supabase
      .from('restaurant_menu_items')
      .update(updatePayload)
      .eq('id', itemId);

    if (error) {
      console.error('Error updating menu item:', error);
      return { data: null, error: `فشل تعديل بيانات الصنف في قاعدة البيانات: ${error.message}` };
    }

    // إذا تم تمرير مجموعات خيارات معدلة، نقوم بإعادة مزامنتها
    if (updates.optionGroups !== undefined) {
      try {
        // حذف الخيارات القديمة
        const { data: oldOpts } = await supabase
          .from('restaurant_item_options')
          .select('id')
          .eq('menu_item_id', itemId);

        if (oldOpts && oldOpts.length > 0) {
          const optIds = oldOpts.map((o) => o.id);
          await supabase.from('restaurant_item_option_values').delete().in('option_id', optIds);
          await supabase.from('restaurant_item_options').delete().eq('menu_item_id', itemId);
        }

        // إدراج الخيارات الجديدة
        for (let gIdx = 0; gIdx < updates.optionGroups.length; gIdx++) {
          const group = updates.optionGroups[gIdx];
          const { data: savedGroup } = await supabase
            .from('restaurant_item_options')
            .insert({
              restaurant_id: restaurantId,
              menu_item_id: itemId,
              name: group.name,
              required: group.isRequired,
              min_select: group.minSelections,
              max_select: group.maxSelections,
              sort_order: gIdx + 1,
            })
            .select('*')
            .single();

          if (savedGroup && group.options && group.options.length > 0) {
            const valuesToInsert = group.options.map((opt, oIdx) => ({
              option_id: savedGroup.id,
              name: opt.name,
              extra_price: opt.price,
              is_available: opt.isAvailable,
              sort_order: oIdx + 1,
            }));
            await supabase.from('restaurant_item_option_values').insert(valuesToInsert);
          }
        }
      } catch (optSyncErr) {
        console.warn('Option sync error on item update:', optSyncErr);
      }
    }

    return { data: true, error: null };
  } catch (err: any) {
    return { data: null, error: err?.message || 'حدث خطأ أثناء تعديل الصنف.' };
  }
}

/**
 * تبديل حالة توفر الصنف (is_available) في جدول restaurant_menu_items
 */
export async function toggleRestaurantMenuItemAvailability(
  itemId: string,
  newAvailableState: boolean
): Promise<ServiceResult<boolean>> {
  if (!isSupabaseConfigured || !itemId) {
    return { data: null, error: 'معرف الصنف غير صالح.' };
  }

  try {
    const { error } = await supabase
      .from('restaurant_menu_items')
      .update({
        is_available: newAvailableState,
        updated_at: new Date().toISOString(),
      })
      .eq('id', itemId);

    if (error) {
      return { data: null, error: `فشل تعديل حالة توفر الصنف: ${error.message}` };
    }

    return { data: true, error: null };
  } catch (err: any) {
    return { data: null, error: err?.message || 'حدث خطأ أثناء تعديل حالة الصنف.' };
  }
}

/**
 * حذف صنف من جدول restaurant_menu_items وخياراته المرتبطة
 */
export async function deleteRestaurantMenuItem(
  itemId: string
): Promise<ServiceResult<boolean>> {
  if (!isSupabaseConfigured || !itemId) {
    return { data: null, error: 'معرف الصنف غير صالح.' };
  }

  try {
    // 1. حذف قيم الخيارات المرتبطة أولاً
    const { data: options } = await supabase
      .from('restaurant_item_options')
      .select('id')
      .eq('menu_item_id', itemId);

    if (options && options.length > 0) {
      const optionIds = options.map((o) => o.id);
      await supabase.from('restaurant_item_option_values').delete().in('option_id', optionIds);
      await supabase.from('restaurant_item_options').delete().eq('menu_item_id', itemId);
    }

    // 2. حذف الصنف
    const { error } = await supabase
      .from('restaurant_menu_items')
      .delete()
      .eq('id', itemId);

    if (error) {
      console.error('Error deleting menu item:', error);
      return { data: null, error: `فشل حذف الصنف من قاعدة البيانات: ${error.message}` };
    }

    return { data: true, error: null };
  } catch (err: any) {
    return { data: null, error: err?.message || 'حدث خطأ أثناء حذف الصنف.' };
  }
}
