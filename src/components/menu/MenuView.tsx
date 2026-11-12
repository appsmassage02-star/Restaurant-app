import React, { useState, useEffect } from 'react';
import {
  UtensilsCrossed,
  Plus,
  Edit2,
  Trash2,
  Eye,
  EyeOff,
  FolderPlus,
  CheckCircle,
  AlertCircle,
  Layers,
  ArrowUpDown,
  Search,
  Loader2,
  RefreshCw,
  Tag,
  ShieldCheck,
  ImageOff,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { MenuCategory, MenuItem } from '../../types';
import { CategoryModal } from './CategoryModal';
import { ItemModal } from './ItemModal';

export const MenuView: React.FC = () => {
  const {
    categories,
    menuItems,
    menuLoading,
    menuError,
    reloadMenu,
    addCategoryAsync,
    updateCategoryAsync,
    deleteCategoryAsync,
    addItemAsync,
    updateItemAsync,
    deleteItemAsync,
    toggleItemAvailabilityAsync,
    dbRestaurant,
  } = useApp();

  const [activeCategoryId, setActiveCategoryId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [categoryToEdit, setCategoryToEdit] = useState<MenuCategory | null>(null);

  const [showItemModal, setShowItemModal] = useState(false);
  const [itemToEdit, setItemToEdit] = useState<MenuItem | null>(null);

  // Deletion & Action feedback
  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  // Sync active category when categories load
  useEffect(() => {
    if (categories.length > 0) {
      if (!activeCategoryId || !categories.some((c) => c.id === activeCategoryId)) {
        setActiveCategoryId(categories[0].id);
      }
    } else {
      setActiveCategoryId('');
    }
  }, [categories, activeCategoryId]);

  const activeCategory = categories.find((c) => c.id === activeCategoryId) || categories[0];

  const filteredItems = menuItems.filter((item) => {
    if (activeCategoryId && item.categoryId !== activeCategoryId) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      return (
        item.name.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleDeleteCategory = async (catId: string) => {
    setActionError('');
    setActionSuccess('');
    setIsDeleting(true);
    try {
      const res = await deleteCategoryAsync(catId);
      if (!res.success) {
        setActionError(res.error || 'تعذر حذف القسم من قاعدة البيانات.');
      } else {
        setActionSuccess('تم حذف القسم بنجاح من قاعدة البيانات.');
        const remaining = categories.filter((c) => c.id !== catId);
        setActiveCategoryId(remaining[0]?.id || '');
        setTimeout(() => setActionSuccess(''), 3000);
      }
    } catch (err: any) {
      setActionError(err?.message || 'حدث خطأ أثناء حذف القسم.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    setActionError('');
    setActionSuccess('');
    try {
      const res = await deleteItemAsync(itemId);
      if (!res.success) {
        setActionError(res.error || 'تعذر حذف الصنف من قاعدة البيانات.');
      } else {
        setActionSuccess('تم حذف الصنف نهائيًا من قاعدة البيانات.');
        setTimeout(() => setActionSuccess(''), 3000);
      }
    } catch (err: any) {
      setActionError(err?.message || 'حدث خطأ أثناء حذف الصنف.');
    }
  };

  const handleToggleAvailability = async (itemId: string) => {
    setActionError('');
    try {
      const res = await toggleItemAvailabilityAsync(itemId);
      if (!res.success) {
        setActionError(res.error || 'فشل تحديث حالة توفر الصنف.');
      }
    } catch (err: any) {
      setActionError(err?.message || 'حدث خطأ أثناء تعديل حالة الصنف.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <UtensilsCrossed className="w-5 h-5 text-amber-500" />
              إدارة منيو وأقسام المطعم
            </h2>
            <button
              onClick={() => reloadMenu()}
              disabled={menuLoading}
              className="p-1 text-slate-400 hover:text-amber-600 transition-colors rounded-lg disabled:opacity-50"
              title="تحديث البيانات من قاعدة البيانات"
            >
              <RefreshCw className={`w-4 h-4 ${menuLoading ? 'animate-spin text-amber-600' : ''}`} />
            </button>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            البيانات محفوظة ومسترجعة مباشرة من جداول Supabase الفعلية (restaurant_menu_categories و restaurant_menu_items)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setCategoryToEdit(null);
              setShowCategoryModal(true);
            }}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <FolderPlus className="w-4 h-4 text-amber-600" />
            <span>إضافة قسم جديد</span>
          </button>

          <button
            onClick={() => {
              setItemToEdit(null);
              setShowItemModal(true);
            }}
            disabled={categories.length === 0}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-600 disabled:bg-slate-200 disabled:text-slate-400 text-slate-950 font-black text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:cursor-not-allowed"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة صنف جديد</span>
          </button>
        </div>
      </div>

      {/* Central Category Distinction Banner */}
      {dbRestaurant && (
        <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-slate-700">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              <strong className="text-slate-900">تصنيف المطعم المعتمد من الإدارة المركزية:</strong>{' '}
              {dbRestaurant.category_links && dbRestaurant.category_links.length > 0
                ? 'مرتبط بتصنيفات المنظومة المعتمدة (مثل: مشويات)'
                : 'عام'}
            </span>
          </div>
          <span className="text-[11px] text-amber-800 bg-amber-100/70 px-2.5 py-0.5 rounded-lg border border-amber-200">
            أقسام المنيو أدناه خاصة بوجبات هذا المطعم وتُحفظ مستقلاً
          </span>
        </div>
      )}

      {/* Loading State Banner */}
      {menuLoading && (
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-center gap-2 text-slate-600 text-xs font-bold">
          <Loader2 className="w-4 h-4 animate-spin text-amber-600" />
          <span>جارٍ مزامنة أقسام وأصناف المنيو مع قاعدة البيانات...</span>
        </div>
      )}

      {/* Success Notification */}
      {actionSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-emerald-800 text-xs font-bold">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{actionSuccess}</span>
          </div>
          <button onClick={() => setActionSuccess('')} className="text-emerald-500 font-normal">
            إغلاق
          </button>
        </div>
      )}

      {/* Action / Error Notification */}
      {(actionError || menuError) && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between text-rose-700 text-xs font-bold">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{actionError || menuError}</span>
          </div>
          <button
            onClick={() => {
              setActionError('');
            }}
            className="text-rose-500 font-normal"
          >
            إغلاق
          </button>
        </div>
      )}

      {/* Categories Tabs Strip */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-slate-700">أقسام منيو المطعم الفعلية:</span>
          {activeCategory && (
            <div className="flex items-center gap-1.5 text-xs">
              <button
                onClick={() => {
                  setCategoryToEdit(activeCategory);
                  setShowCategoryModal(true);
                }}
                className="text-slate-500 hover:text-amber-600 p-1 rounded"
                title="تعديل اسم القسم"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() =>
                  updateCategoryAsync(activeCategory.id, { isVisible: !activeCategory.isVisible })
                }
                className="text-slate-500 hover:text-slate-800 p-1 rounded"
                title={activeCategory.isVisible ? 'إخفاء القسم من الزبائن' : 'إظهار القسم'}
              >
                {activeCategory.isVisible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5 text-rose-500" />}
              </button>
              <button
                disabled={isDeleting}
                onClick={() => handleDeleteCategory(activeCategory.id)}
                className="text-slate-400 hover:text-rose-600 p-1 rounded disabled:opacity-50"
                title="حذف القسم"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {categories.length === 0 ? (
          <div className="text-center py-4 text-xs text-slate-400">
            لم يتم إنشاء أي أقسام منيو لهذا المطعم في قاعدة البيانات حتى الآن.
          </div>
        ) : (
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {categories.map((cat) => {
              const isActive = cat.id === activeCategoryId;
              const count = menuItems.filter((i) => i.categoryId === cat.id).length;
              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategoryId(cat.id)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                    isActive
                      ? 'bg-amber-500 text-slate-950 shadow-xs'
                      : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <span>{cat.name}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                      isActive ? 'bg-amber-600 text-slate-950 font-black' : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {count}
                  </span>
                  {!cat.isVisible && (
                    <span title="مخفي عن الزبائن">
                      <EyeOff className="w-3 h-3 text-slate-400" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="بحث في الأصناف والمكونات..."
            className="w-full pl-3 pr-9 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-amber-500 shadow-2xs"
          />
        </div>

        <div className="text-xs text-slate-500 font-bold">
          إجمالي الأصناف: <span className="text-slate-800">{filteredItems.length}</span> صنف
        </div>
      </div>

      {/* Menu Items Grid */}
      {filteredItems.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-xs">
          <UtensilsCrossed className="w-12 h-12 text-slate-300 mx-auto mb-3 stroke-[1.5]" />
          <h4 className="text-sm font-bold text-slate-700">لا توجد أصناف مسجلة في هذا القسم</h4>
          <p className="text-xs text-slate-400 mt-1 mb-4">
            أضف أول صنف للقسم لتتمكن من استقبال طلبات العملاء وحفظه دائمًا في قاعدة بيانات Supabase.
          </p>
          <button
            onClick={() => {
              setItemToEdit(null);
              setShowItemModal(true);
            }}
            disabled={categories.length === 0}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-600 disabled:bg-slate-200 disabled:text-slate-400 text-slate-950 font-bold text-xs rounded-xl shadow-xs inline-flex items-center gap-1.5 cursor-pointer disabled:cursor-not-allowed"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة صنف الآن</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className={`bg-white rounded-2xl border transition-all overflow-hidden flex flex-col justify-between shadow-xs ${
                item.isAvailable
                  ? 'border-slate-200 hover:border-amber-300'
                  : 'border-slate-200 bg-slate-50/70 opacity-80'
              }`}
            >
              <div>
                {/* Image and badges */}
                <div className="relative h-36 bg-slate-100 overflow-hidden">
                  {item.image ? (
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-slate-100 text-slate-400 gap-1.5 p-3 text-center">
                      <ImageOff className="w-7 h-7 text-slate-300 stroke-[1.5]" />
                      <span className="text-[10px] font-bold text-slate-400">لا توجد صورة مسجلة</span>
                    </div>
                  )}
                  {!item.isAvailable && (
                    <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-2xs flex items-center justify-center">
                      <span className="bg-rose-600 text-white font-bold text-xs px-3 py-1 rounded-full shadow-xs">
                        غير متاح حاليًا (نفاد المخزون)
                      </span>
                    </div>
                  )}

                  <div className="absolute top-2 left-2 bg-white/90 backdrop-blur-xs font-black text-slate-950 text-xs px-2.5 py-1 rounded-lg shadow-xs">
                    {item.price.toLocaleString('ar-EG')} ج.م
                  </div>
                </div>

                {/* Content */}
                <div className="p-4 space-y-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="text-xs font-bold text-slate-900 leading-snug">
                      {item.name}
                    </h4>
                  </div>

                  <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                    {item.description || 'لا يوجد وصف مضاف لهذا الصنف.'}
                  </p>

                  {/* Option Groups Badges */}
                  {item.optionGroups && item.optionGroups.length > 0 && (
                    <div className="pt-2 flex flex-wrap gap-1">
                      {item.optionGroups.map((grp) => (
                        <span
                          key={grp.id}
                          className="text-[10px] bg-amber-50 text-amber-800 px-2 py-0.5 rounded-md border border-amber-200/60 font-semibold"
                        >
                          {grp.name} ({grp.options.length})
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Card Footer Actions */}
              <div className="p-4 pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                <button
                  onClick={() => handleToggleAvailability(item.id)}
                  className={`text-xs font-semibold px-2 py-1 rounded-lg cursor-pointer ${
                    item.isAvailable
                      ? 'text-rose-600 hover:bg-rose-50'
                      : 'text-emerald-600 hover:bg-emerald-50'
                  }`}
                >
                  {item.isAvailable ? 'إيقاف مؤقت (نفاد)' : 'إعادة إتاحة الصنف'}
                </button>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => {
                      setItemToEdit(item);
                      setShowItemModal(true);
                    }}
                    className="p-1.5 text-slate-600 hover:text-amber-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                    title="تعديل الصنف"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => handleDeleteItem(item.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                    title="حذف الصنف نهائيًا"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Rules Notice */}
      <div className="p-4 bg-slate-100 rounded-2xl border border-slate-200 text-xs text-slate-600 space-y-1">
        <p className="font-bold text-slate-800">قواعد المنيو والتخزين الفعلي:</p>
        <p>• تُحفظ وتُعدل الأقسام والأصناف في قاعدة بيانات Supabase مباشرة وتظل موجودة دائمًا بعد إعادة تحميل الصفحة.</p>
        <p>• إيقاف صنف كـ «غير متاح» يحدّث حقل is_available في جدول restaurant_menu_items دون حذفه.</p>
      </div>

      {/* Modals */}
      <CategoryModal
        isOpen={showCategoryModal}
        onClose={() => setShowCategoryModal(false)}
        onSave={async (name, desc) => {
          if (categoryToEdit) {
            const res = await updateCategoryAsync(categoryToEdit.id, { name, description: desc });
            if (!res.success) {
              setActionError(res.error || 'تعذر تعديل القسم.');
              return false;
            }
            setActionSuccess('تم تعديل القسم بنجاح في قاعدة البيانات.');
            setTimeout(() => setActionSuccess(''), 3000);
            return true;
          } else {
            const res = await addCategoryAsync(name, desc);
            if (!res.success) {
              setActionError(res.error || 'تعذر حفظ القسم.');
              return false;
            }
            if (res.category?.id) {
              setActiveCategoryId(res.category.id);
            }
            setActionSuccess('تمت إضافة القسم وحفظه بنجاح في قاعدة البيانات.');
            setTimeout(() => setActionSuccess(''), 3000);
            return true;
          }
        }}
        categoryToEdit={categoryToEdit}
      />

      <ItemModal
        isOpen={showItemModal}
        onClose={() => setShowItemModal(false)}
        onSave={async (data) => {
          if (itemToEdit) {
            const res = await updateItemAsync(itemToEdit.id, data);
            if (!res.success) {
              setActionError(res.error || 'تعذر تعديل الصنف.');
              return false;
            }
            setActionSuccess('تم تحديث بيانات الصنف وخياراته في قاعدة البيانات.');
            setTimeout(() => setActionSuccess(''), 3000);
            return true;
          } else {
            const res = await addItemAsync(data);
            if (!res.success) {
              setActionError(res.error || 'تعذر حفظ الصنف.');
              return false;
            }
            setActionSuccess('تم حفظ الصنف وخياراته بنجاح في قاعدة البيانات.');
            setTimeout(() => setActionSuccess(''), 3000);
            return true;
          }
        }}
        categories={categories}
        itemToEdit={itemToEdit}
        activeCategoryId={activeCategoryId}
      />
    </div>
  );
};
