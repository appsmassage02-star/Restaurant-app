import React, { useState } from 'react';
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
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { MenuCategory, MenuItem } from '../../types';
import { CategoryModal } from './CategoryModal';
import { ItemModal } from './ItemModal';

export const MenuView: React.FC = () => {
  const {
    categories,
    menuItems,
    addCategory,
    updateCategory,
    deleteCategory,
    addItem,
    updateItem,
    deleteItem,
    toggleItemAvailability,
  } = useApp();

  const [activeCategoryId, setActiveCategoryId] = useState<string>(categories[0]?.id || '');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [categoryToEdit, setCategoryToEdit] = useState<MenuCategory | null>(null);

  const [showItemModal, setShowItemModal] = useState(false);
  const [itemToEdit, setItemToEdit] = useState<MenuItem | null>(null);

  // Deletion feedback
  const [deleteError, setDeleteError] = useState('');

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

  const handleDeleteCategory = (catId: string) => {
    setDeleteError('');
    const success = deleteCategory(catId);
    if (!success) {
      setDeleteError('لا يمكن حذف قسم يحتوي على أصناف. يرجى نقل أو حذف الأصناف أولاً لحماية بيانات المنيو.');
    } else {
      if (activeCategoryId === catId) {
        setActiveCategoryId(categories[0]?.id || '');
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
            <UtensilsCrossed className="w-5 h-5 text-amber-500" />
            إدارة منيو وأقسام المطعم
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            إضافة وتعديل الأقسام والأصناف، ضبط خيارات الإضافات وحالة التوفر في الوقت الفعلي
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setCategoryToEdit(null);
              setShowCategoryModal(true);
            }}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl transition-colors flex items-center gap-1.5"
          >
            <FolderPlus className="w-4 h-4 text-amber-600" />
            <span>إضافة قسم جديد</span>
          </button>

          <button
            onClick={() => {
              setItemToEdit(null);
              setShowItemModal(true);
            }}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة صنف جديد</span>
          </button>
        </div>
      </div>

      {deleteError && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between text-rose-700 text-xs font-bold">
          <span>{deleteError}</span>
          <button onClick={() => setDeleteError('')} className="text-rose-500 font-normal">
            إغلاق
          </button>
        </div>
      )}

      {/* Categories Tabs Strip */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-slate-700">أقسام المنيو:</span>
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
                  updateCategory(activeCategory.id, { isVisible: !activeCategory.isVisible })
                }
                className="text-slate-500 hover:text-slate-800 p-1 rounded"
                title={activeCategory.isVisible ? 'إخفاء القسم من الزبائن' : 'إظهار القسم'}
              >
                {activeCategory.isVisible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5 text-rose-500" />}
              </button>
              <button
                onClick={() => handleDeleteCategory(activeCategory.id)}
                className="text-slate-400 hover:text-rose-600 p-1 rounded"
                title="حذف القسم"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          {categories.map((cat) => {
            const count = menuItems.filter((i) => i.categoryId === cat.id).length;
            const isActive = activeCategoryId === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategoryId(cat.id)}
                className={`px-3.5 py-2 rounded-xl font-bold whitespace-nowrap transition-all flex items-center gap-2 ${
                  isActive
                    ? 'bg-amber-500 text-slate-950 shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <span>{cat.name}</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                    isActive ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {count}
                </span>
                {!cat.isVisible && (
                  <span title="مخفي من تطبيق العميل">
                    <EyeOff className="w-3 h-3 text-rose-500" />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Search and Category Summary */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ابحث عن صنف في هذا القسم..."
            className="w-full pl-4 pr-10 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-amber-500"
          />
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
        </div>

        <div className="text-xs text-slate-500">
          يعرض {filteredItems.length} صنف في قسم: <strong>{activeCategory?.name}</strong>
        </div>
      </div>

      {/* Menu Items Grid */}
      {filteredItems.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200">
          <UtensilsCrossed className="w-12 h-12 text-slate-300 mx-auto mb-3 stroke-1" />
          <h4 className="text-sm font-bold text-slate-700">لا توجد أصناف في هذا القسم حاليًا</h4>
          <p className="text-xs text-slate-400 mt-1 mb-4">
            أضف أول وجبة أو صنف لهذا القسم لتظهر في منيو تطبيق طلبات البيت.
          </p>
          <button
            onClick={() => {
              setItemToEdit(null);
              setShowItemModal(true);
            }}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-xl shadow-xs inline-flex items-center gap-1.5"
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
              className={`bg-white rounded-2xl border transition-all overflow-hidden flex flex-col justify-between ${
                item.isAvailable
                  ? 'border-slate-200 hover:border-amber-400 hover:shadow-md'
                  : 'border-slate-200 bg-slate-50/60 opacity-80'
              }`}
            >
              <div>
                {/* Image & Badges */}
                <div className="relative h-44 overflow-hidden bg-slate-100">
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5">
                    <span className="px-2.5 py-1 bg-slate-900/80 backdrop-blur-xs text-white text-xs font-black rounded-lg shadow">
                      {item.price.toLocaleString('ar-EG')} ج.م
                    </span>
                  </div>

                  <div className="absolute top-2.5 left-2.5">
                    <button
                      onClick={() => toggleItemAvailability(item.id)}
                      className={`px-2.5 py-1 text-[11px] font-bold rounded-lg backdrop-blur-xs shadow transition-all ${
                        item.isAvailable
                          ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                          : 'bg-rose-600 text-white hover:bg-rose-700'
                      }`}
                      title="انقر لتغيير التوفر فوريًا"
                    >
                      {item.isAvailable ? 'متوفر' : 'نفد (غير متاح)'}
                    </button>
                  </div>
                </div>

                {/* Content */}
                <div className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-sm font-bold text-slate-900 leading-tight">
                      {item.name}
                    </h3>
                  </div>

                  <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                    {item.description || 'لا يوجد وصف مضاف لهذا الصنف.'}
                  </p>

                  {/* Option groups count indicator */}
                  {item.optionGroups && item.optionGroups.length > 0 && (
                    <div className="pt-1 flex items-center gap-1.5 text-[11px] text-amber-700 font-semibold">
                      <Layers className="w-3.5 h-3.5" />
                      <span>
                        {item.optionGroups.length} مجموعات إضافات وخيارات مخصصة
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Card Footer: Edit / Delete */}
              <div className="p-4 pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                <button
                  onClick={() => toggleItemAvailability(item.id)}
                  className={`text-xs font-semibold px-2 py-1 rounded-lg ${
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
                    className="p-1.5 text-slate-600 hover:text-amber-600 hover:bg-slate-100 rounded-lg transition-colors"
                    title="تعديل الصنف"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => deleteItem(item.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-slate-100 rounded-lg transition-colors"
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
        <p className="font-bold text-slate-800">قواعد تسعير وتوفر الأصناف:</p>
        <p>• إيقاف صنف كـ «غير متاح» يمنع طلبه في محاكاة العميل فورًا دون حذفه من قاعدة البيانات.</p>
        <p>• تعديل سعر الصنف لا يؤثر على الطلبات السابقة أو الفواتير المصدرة لضمان صحة السجلات المالية.</p>
      </div>

      {/* Modals */}
      <CategoryModal
        isOpen={showCategoryModal}
        onClose={() => setShowCategoryModal(false)}
        onSave={(name, desc) => {
          if (categoryToEdit) {
            updateCategory(categoryToEdit.id, { name, description: desc });
          } else {
            addCategory(name, desc);
          }
        }}
        categoryToEdit={categoryToEdit}
      />

      <ItemModal
        isOpen={showItemModal}
        onClose={() => setShowItemModal(false)}
        onSave={(data) => {
          if (itemToEdit) {
            updateItem(itemToEdit.id, data);
          } else {
            addItem(data);
          }
        }}
        categories={categories}
        itemToEdit={itemToEdit}
        activeCategoryId={activeCategoryId}
      />
    </div>
  );
};
