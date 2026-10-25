import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  Trash2,
  Check,
  Utensils,
  Image as ImageIcon,
  DollarSign,
  Layers,
  Sparkles,
  HelpCircle,
  AlertCircle,
} from 'lucide-react';
import { MenuItem, MenuCategory, OptionGroup, OptionItem } from '../../types';

interface ItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (itemData: Omit<MenuItem, 'id'>) => void;
  categories: MenuCategory[];
  itemToEdit?: MenuItem | null;
  activeCategoryId?: string;
}

export const ItemModal: React.FC<ItemModalProps> = ({
  isOpen,
  onClose,
  onSave,
  categories,
  itemToEdit,
  activeCategoryId,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState<number | ''>(120);
  const [categoryId, setCategoryId] = useState('');
  const [image, setImage] = useState(
    'https://images.unsplash.com/photo-1544025162-d76694265947?w=600&auto=format&fit=crop&q=80'
  );
  const [isAvailable, setIsAvailable] = useState(true);
  const [sortOrder, setSortOrder] = useState(1);
  const [optionGroups, setOptionGroups] = useState<OptionGroup[]>([]);
  const [error, setError] = useState('');

  // Interactive Live Calculation Test
  const [selectedPreviewOptions, setSelectedPreviewOptions] = useState<Record<string, string[]>>({});

  useEffect(() => {
    if (itemToEdit) {
      setName(itemToEdit.name);
      setDescription(itemToEdit.description);
      setPrice(itemToEdit.price);
      setCategoryId(itemToEdit.categoryId);
      setImage(itemToEdit.image);
      setIsAvailable(itemToEdit.isAvailable);
      setSortOrder(itemToEdit.sortOrder);
      setOptionGroups(itemToEdit.optionGroups || []);
    } else {
      setName('');
      setDescription('');
      setPrice(100);
      setCategoryId(activeCategoryId || categories[0]?.id || '');
      setImage('https://images.unsplash.com/photo-1544025162-d76694265947?w=600&auto=format&fit=crop&q=80');
      setIsAvailable(true);
      setSortOrder(1);
      setOptionGroups([]);
    }
    setError('');
    setSelectedPreviewOptions({});
  }, [itemToEdit, isOpen, activeCategoryId, categories]);

  if (!isOpen) return null;

  // Add a new option group
  const handleAddOptionGroup = () => {
    const newGroup: OptionGroup = {
      id: `grp-${Date.now()}`,
      name: 'خيارات أو إضافات إضافية',
      isRequired: false,
      minSelections: 0,
      maxSelections: 2,
      options: [
        { id: `opt-${Date.now()}-1`, name: 'إضافة سرفيس زيادة', price: 20, isAvailable: true },
      ],
    };
    setOptionGroups([...optionGroups, newGroup]);
  };

  // Add option to group
  const handleAddOptionItem = (groupId: string) => {
    setOptionGroups(
      optionGroups.map((grp) => {
        if (grp.id !== groupId) return grp;
        return {
          ...grp,
          options: [
            ...grp.options,
            { id: `opt-${Date.now()}`, name: 'خيار جديد', price: 10, isAvailable: true },
          ],
        };
      })
    );
  };

  // Remove option from group
  const handleRemoveOptionItem = (groupId: string, optId: string) => {
    setOptionGroups(
      optionGroups.map((grp) => {
        if (grp.id !== groupId) return grp;
        return {
          ...grp,
          options: grp.options.filter((o) => o.id !== optId),
        };
      })
    );
  };

  // Remove whole group
  const handleRemoveGroup = (groupId: string) => {
    setOptionGroups(optionGroups.filter((g) => g.id !== groupId));
  };

  // Update group meta
  const handleUpdateGroup = (groupId: string, field: keyof OptionGroup, value: any) => {
    setOptionGroups(
      optionGroups.map((g) => (g.id === groupId ? { ...g, [field]: value } : g))
    );
  };

  // Update option item
  const handleUpdateOptionItem = (
    groupId: string,
    optId: string,
    field: keyof OptionItem,
    value: any
  ) => {
    setOptionGroups(
      optionGroups.map((g) => {
        if (g.id !== groupId) return g;
        return {
          ...g,
          options: g.options.map((o) => (o.id === optId ? { ...o, [field]: value } : o)),
        };
      })
    );
  };

  // Live preview price calculation
  const calculatePreviewPrice = () => {
    const base = typeof price === 'number' ? price : 0;
    let addOns = 0;
    Object.entries(selectedPreviewOptions).forEach(([groupId, optIds]) => {
      const group = optionGroups.find((g) => g.id === groupId);
      if (group) {
        optIds.forEach((optId) => {
          const opt = group.options.find((o) => o.id === optId);
          if (opt) addOns += opt.price;
        });
      }
    });
    return base + addOns;
  };

  const togglePreviewOption = (groupId: string, optId: string, isSingleSelect: boolean) => {
    setSelectedPreviewOptions((prev) => {
      const current = prev[groupId] || [];
      if (isSingleSelect) {
        return { ...prev, [groupId]: [optId] };
      } else {
        if (current.includes(optId)) {
          return { ...prev, [groupId]: current.filter((id) => id !== optId) };
        } else {
          return { ...prev, [groupId]: [...current, optId] };
        }
      }
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('يرجى كتابة اسم الصنف.');
      return;
    }
    if (price === '' || price < 0) {
      setError('يرجى إدخال سعر صحيح للصنف.');
      return;
    }
    if (!categoryId) {
      setError('يرجى اختيار القسم التابع له الصنف.');
      return;
    }

    onSave({
      categoryId,
      name: name.trim(),
      description: description.trim(),
      price: Number(price),
      image: image.trim() || 'https://images.unsplash.com/photo-1544025162-d76694265947?w=600&auto=format&fit=crop&q=80',
      isAvailable,
      sortOrder: Number(sortOrder),
      optionGroups,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-2xl w-full max-h-[92vh] flex flex-col overflow-hidden text-right">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-amber-100 text-amber-700 rounded-xl">
              <Utensils className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                {itemToEdit ? 'تعديل بيانات الصنف' : 'إضافة صنف جديد للمنيو'}
              </h3>
              <p className="text-[11px] text-slate-400">
                تحديد الأسعار والمكونات ومجموعات الإضافات والاختيارات
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 text-xs">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-rose-700 font-bold">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Basic Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-slate-700 font-bold mb-1">اسم الصنف *</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="مثال: ربع تيس مندي أو نصف فرخة مشوية..."
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-amber-500 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">القسم التابع له *</label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-amber-500"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-slate-700 font-bold mb-1">وصف الصنف ومكوناته</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="وصف تفصيلي يشرح طريقة الطهي والمكونات والخدمات المقدمة مع الصنف..."
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-amber-500 focus:bg-white"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div>
              <label className="block text-slate-700 font-bold mb-1">السعر الأساسي (ج.م) *</label>
              <input
                type="number"
                min="0"
                step="1"
                required
                value={price}
                onChange={(e) => setPrice(e.target.value === '' ? '' : parseFloat(e.target.value))}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-amber-500 font-bold text-slate-900"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">ترتيب الصنف في القسم</label>
              <input
                type="number"
                min="1"
                value={sortOrder}
                onChange={(e) => setSortOrder(parseInt(e.target.value) || 1)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">حالة توفر الصنف</label>
              <button
                type="button"
                onClick={() => setIsAvailable(!isAvailable)}
                className={`w-full py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
                  isAvailable
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : 'bg-rose-100 text-rose-800 border border-rose-300'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${isAvailable ? 'bg-emerald-600' : 'bg-rose-600'}`} />
                <span>{isAvailable ? 'متوفر للطلب' : 'غير متاح (نفد المخزون)'}</span>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-slate-700 font-bold mb-1">رابط صورة الصنف</label>
            <input
              type="url"
              value={image}
              onChange={(e) => setImage(e.target.value)}
              placeholder="https://..."
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-left dir-ltr focus:ring-2 focus:ring-amber-500"
            />
          </div>

          {/* Option Groups (Customizations & Add-ons) */}
          <div className="pt-2 border-t border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-amber-600" />
                  مجموعات الخيارات والإضافات (الحجم، السرفيس، درجة التسوية)
                </h4>
                <p className="text-[11px] text-slate-400">
                  اسمح للعميل باختيار أحجام وإضافات بأسعار إضافية
                </p>
              </div>

              <button
                type="button"
                onClick={handleAddOptionGroup}
                className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-xl font-bold border border-amber-300 text-xs flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>إضافة مجموعة خيارات</span>
              </button>
            </div>

            {/* List of Option Groups */}
            {optionGroups.length === 0 ? (
              <div className="p-4 bg-slate-50 rounded-xl text-center text-slate-400 border border-dashed border-slate-200 text-xs">
                لا توجد مجموعات خيارات مضافة لهذا الصنف حتى الآن (الصنف بسيط بدون إضافات).
              </div>
            ) : (
              <div className="space-y-3">
                {optionGroups.map((grp, gIdx) => (
                  <div
                    key={grp.id}
                    className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex-1">
                        <input
                          type="text"
                          value={grp.name}
                          onChange={(e) => handleUpdateGroup(grp.id, 'name', e.target.value)}
                          placeholder="اسم المجموعة (مثل: درجة الشطة، سرفيس إضافي...)"
                          className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl font-bold text-xs"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveGroup(grp.id)}
                        className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg"
                        title="حذف المجموعة"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Group Settings */}
                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-600 bg-white p-2.5 rounded-xl border border-slate-100">
                      <label className="flex items-center gap-1.5 cursor-pointer font-bold select-none">
                        <input
                          type="checkbox"
                          checked={grp.isRequired}
                          onChange={(e) => handleUpdateGroup(grp.id, 'isRequired', e.target.checked)}
                          className="w-3.5 h-3.5 text-amber-600 rounded"
                        />
                        <span>اختيار إجباري من العميل</span>
                      </label>

                      <div className="flex items-center gap-1">
                        <span>الحد الأقصى للاختيارات:</span>
                        <input
                          type="number"
                          min="1"
                          max="10"
                          value={grp.maxSelections}
                          onChange={(e) =>
                            handleUpdateGroup(grp.id, 'maxSelections', parseInt(e.target.value) || 1)
                          }
                          className="w-12 px-1.5 py-0.5 bg-slate-50 border rounded text-center font-bold"
                        />
                      </div>
                    </div>

                    {/* Options inside this group */}
                    <div className="space-y-1.5 pr-2">
                      <span className="text-[11px] font-bold text-slate-500 block">خيارات المجموعة:</span>
                      {grp.options.map((opt) => (
                        <div key={opt.id} className="flex items-center gap-2">
                          <input
                            type="text"
                            value={opt.name}
                            onChange={(e) =>
                              handleUpdateOptionItem(grp.id, opt.id, 'name', e.target.value)
                            }
                            placeholder="اسم الخيار (مثل: أرز بالخلطة، ثومية زيادة...)"
                            className="flex-1 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                          />
                          <div className="flex items-center gap-1 w-28">
                            <span className="text-[10px] text-slate-400">+</span>
                            <input
                              type="number"
                              min="0"
                              value={opt.price}
                              onChange={(e) =>
                                handleUpdateOptionItem(
                                  grp.id,
                                  opt.id,
                                  'price',
                                  parseFloat(e.target.value) || 0
                                )
                              }
                              placeholder="السعر"
                              className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold"
                            />
                            <span className="text-[10px] text-slate-400">ج.م</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveOptionItem(grp.id, opt.id)}
                            className="p-1 text-slate-400 hover:text-rose-600"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}

                      <button
                        type="button"
                        onClick={() => handleAddOptionItem(grp.id)}
                        className="text-[11px] font-bold text-amber-700 hover:text-amber-800 flex items-center gap-1 pt-1"
                      >
                        <Plus className="w-3 h-3" />
                        <span>إضافة خيار آخر لهذه المجموعة</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Interactive Live Price Calculator Preview */}
          {optionGroups.length > 0 && (
            <div className="p-3.5 bg-amber-50/80 rounded-2xl border border-amber-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-900 flex items-center gap-1">
                  <Sparkles className="w-4 h-4 text-amber-600" />
                  محاكي حساب السعر التفاعلي مع الإضافات (تجربة مباشرة):
                </span>
                <span className="text-sm font-black text-amber-800 bg-white px-2.5 py-0.5 rounded-lg border border-amber-300">
                  {calculatePreviewPrice().toLocaleString('ar-EG')} ج.م
                </span>
              </div>
              <p className="text-[11px] text-slate-600">
                انقر على الخيارات لتجربة كيف سيتم حساب السعر الإجمالي للعميل:
              </p>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {optionGroups.map((grp) =>
                  grp.options.map((opt) => {
                    const isSelected = (selectedPreviewOptions[grp.id] || []).includes(opt.id);
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() =>
                          togglePreviewOption(grp.id, opt.id, grp.maxSelections === 1)
                        }
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all border ${
                          isSelected
                            ? 'bg-amber-500 text-slate-950 border-amber-600 shadow-2xs'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {opt.name} {opt.price > 0 ? `(+${opt.price} ج.م)` : '(مجاني)'}
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 font-bold hover:bg-slate-100"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl font-black flex items-center gap-1.5 shadow-md shadow-amber-500/20"
            >
              <Check className="w-4 h-4" />
              <span>{itemToEdit ? 'حفظ تعديلات الصنف' : 'إضافة الصنف للمنيو'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
