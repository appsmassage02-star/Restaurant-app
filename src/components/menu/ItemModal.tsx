import React, { useState, useEffect, useRef } from 'react';
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
  Upload,
  CheckCircle,
  Loader2,
  FolderOpen,
  ImageOff,
} from 'lucide-react';
import { MenuItem, MenuCategory, OptionGroup, OptionItem } from '../../types';
import { useApp } from '../../context/AppContext';
import { validateImageFileForCompression } from '../../services/imageProcessingService';
import { uploadRestaurantImage } from '../../services/imageUploadService';

interface ItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (itemData: Omit<MenuItem, 'id'>) => Promise<boolean> | void;
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
  const { restaurant } = useApp();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState<number | ''>(120);
  const [categoryId, setCategoryId] = useState('');
  const [image, setImage] = useState('');
  const [isAvailable, setIsAvailable] = useState(true);
  const [sortOrder, setSortOrder] = useState(1);
  const [optionGroups, setOptionGroups] = useState<OptionGroup[]>([]);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Image source mode: 'upload' | 'url'
  const [imageTab, setImageTab] = useState<'upload' | 'url'>('upload');
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Interactive Live Calculation Test
  const [selectedPreviewOptions, setSelectedPreviewOptions] = useState<Record<string, string[]>>({});

  useEffect(() => {
    if (itemToEdit) {
      setName(itemToEdit.name);
      setDescription(itemToEdit.description);
      setPrice(itemToEdit.price);
      setCategoryId(itemToEdit.categoryId);
      setImage(itemToEdit.image || '');
      setIsAvailable(itemToEdit.isAvailable);
      setSortOrder(itemToEdit.sortOrder);
      setOptionGroups(itemToEdit.optionGroups || []);
    } else {
      setName('');
      setDescription('');
      setPrice(100);
      setCategoryId(activeCategoryId || categories[0]?.id || '');
      setImage('');
      setIsAvailable(true);
      setSortOrder(1);
      setOptionGroups([]);
    }
    setError('');
    setIsSubmitting(false);
    setIsUploading(false);
    setUploadStatus(null);
    setSelectedPreviewOptions({});
  }, [itemToEdit, isOpen, activeCategoryId, categories]);

  if (!isOpen) return null;

  // Handle local file compression (WebP <= 1200px & <= 1 MiB) + signed upload to Talabaty Food Storage
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || isUploading) return;

    const validation = validateImageFileForCompression(file);
    if (!validation.valid) {
      setError(validation.error || 'صيغة الملف غير مدعومة.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setError('');
    setIsUploading(true);
    setUploadStatus('جارٍ ضغط الصورة وتحويلها إلى WebP ورفعها إلى مشروع التخزين المستقل...');

    try {
      const result = await uploadRestaurantImage(file, restaurant.id, 'menu-items');
      if (!result.success || !result.publicUrl) {
        setError(result.error || 'فشل رفع الصورة إلى مشروع التخزين المستقل.');
        setUploadStatus(null);
        return;
      }

      setImage(result.publicUrl);
      if (result.compressedInfo) {
        const origKb = Math.max(1, Math.round(result.compressedInfo.originalSizeBytes / 1024));
        const finalKb = Math.max(1, Math.round(result.compressedInfo.sizeBytes / 1024));
        setUploadStatus(
          `تم التحويل إلى WebP (${result.compressedInfo.width}×${result.compressedInfo.height}) وضغط الحجم من ${origKb} ك.ب إلى ${finalKb} ك.ب ورفعها بنجاح.`
        );
      } else {
        setUploadStatus('تم ضغط الصورة بصيغة WebP ورفعها بنجاح وتعيين رابطها الفعلي للصنف.');
      }
    } catch (err: any) {
      console.error('Food storage upload exception:', err);
      setError(`خطأ أثناء معالجة أو رفع الصورة: ${err?.message || 'تعذر الاتصال بخدمة التخزين'}.`);
      setUploadStatus(null);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

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

  const handleSubmit = async (e: React.FormEvent) => {
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

    try {
      setIsSubmitting(true);
      setError('');
      const res = await onSave({
        categoryId,
        name: name.trim(),
        description: description.trim(),
        price: Number(price),
        image: image.trim(),
        isAvailable,
        sortOrder: Number(sortOrder),
        optionGroups,
      });

      if (res === false) {
        setIsSubmitting(false);
        return;
      }

      onClose();
    } catch (err: any) {
      setError(err?.message || 'فشل حفظ الصنف في قاعدة البيانات.');
      setIsSubmitting(false);
    }
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
                {itemToEdit ? 'تعديل بيانات الصنف في قاعدة البيانات' : 'إضافة صنف جديد لمنيو المطعم'}
              </h3>
              <p className="text-[11px] text-slate-400">
                الأسعار، الصورة المعتمدة، والمجموعات الإضافية المحفوظة في جداول Supabase
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 text-xs">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-rose-700 font-bold leading-relaxed">
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
                disabled={isSubmitting}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="مثال: ربع تيس مندي أو نصف فرخة مشوية..."
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-amber-500 focus:bg-white disabled:opacity-50"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">القسم التابع له *</label>
              <select
                disabled={isSubmitting}
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-amber-500 disabled:opacity-50"
              >
                {categories.length === 0 ? (
                  <option value="">لا توجد أقسام منيو مسجلة</option>
                ) : (
                  categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-slate-700 font-bold mb-1">وصف الصنف ومكوناته</label>
            <textarea
              rows={2}
              disabled={isSubmitting}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="وصف تفصيلي يشرح طريقة الطهي والمكونات والخدمات المقدمة مع الصنف..."
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-amber-500 focus:bg-white disabled:opacity-50"
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
                disabled={isSubmitting}
                value={price}
                onChange={(e) => setPrice(e.target.value === '' ? '' : parseFloat(e.target.value))}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-amber-500 font-bold text-slate-900 disabled:opacity-50"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">ترتيب الصنف في القسم</label>
              <input
                type="number"
                min="1"
                disabled={isSubmitting}
                value={sortOrder}
                onChange={(e) => setSortOrder(parseInt(e.target.value) || 1)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-amber-500 disabled:opacity-50"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">حالة توفر الصنف</label>
              <button
                type="button"
                disabled={isSubmitting}
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

          {/* Image Selection Section */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-amber-600" />
                <span className="font-bold text-slate-800 text-xs">صورة الصنف (عمود image_url في قاعدة البيانات):</span>
              </div>

              {/* Tabs */}
              <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 text-[11px]">
                <button
                  type="button"
                  onClick={() => setImageTab('upload')}
                  className={`px-3 py-1 rounded-lg font-bold transition-colors ${
                    imageTab === 'upload'
                      ? 'bg-amber-500 text-slate-950 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  رفع صورة للمتجر
                </button>
                <button
                  type="button"
                  onClick={() => setImageTab('url')}
                  className={`px-3 py-1 rounded-lg font-bold transition-colors ${
                    imageTab === 'url'
                      ? 'bg-amber-500 text-slate-950 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  رابط مخصص
                </button>
              </div>
            </div>

            {/* Current Image Preview */}
            <div className="flex items-center gap-3 p-3 bg-white rounded-xl border border-slate-200">
              {image ? (
                <>
                  <img
                    src={image}
                    alt="معاينة الصنف"
                    className="w-16 h-16 rounded-xl object-cover shrink-0 border border-slate-200 shadow-2xs"
                  />
                  <div className="flex-1 min-w-0">
                    <span className="text-[10px] text-slate-400 block">الصورة المختارة حاليًا:</span>
                    <p className="text-xs font-bold text-slate-800 truncate" dir="ltr">
                      {image}
                    </p>
                    {uploadStatus && (
                      <span className="text-[11px] text-emerald-600 font-bold block mt-0.5">
                        {uploadStatus}
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setImage('');
                      setUploadStatus(null);
                    }}
                    className="px-2.5 py-1 text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg font-bold text-[11px] border border-rose-200 shrink-0 cursor-pointer"
                  >
                    إزالة الصورة
                  </button>
                </>
              ) : (
                <>
                  <div className="w-16 h-16 rounded-xl bg-slate-100 flex flex-col items-center justify-center text-slate-400 border border-slate-200 shrink-0">
                    <ImageOff className="w-6 h-6 text-slate-300 stroke-[1.5]" />
                    <span className="text-[9px] text-slate-400 mt-1">بدون صورة</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-[11px] font-bold text-slate-700 block">لا توجد صورة مسجلة لهذا الصنف</span>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      يمكنك رفع صورة من جهازك، أو إدخال رابط مباشر، أو حفظ الصنف بدون صورة.
                    </p>
                  </div>
                </>
              )}
            </div>

            {/* Tab 1: Upload */}
            {imageTab === 'upload' && (
              <div className="p-4 bg-white rounded-xl border border-dashed border-slate-300 text-center space-y-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
                    className="hidden"
                    onChange={handleFileUpload}
                    disabled={isUploading}
                  />
                  <Upload className="w-8 h-8 text-amber-500 mx-auto" />
                  <div>
                    <button
                      type="button"
                      disabled={isUploading}
                      onClick={() => fileInputRef.current?.click()}
                      className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl text-xs inline-flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
                    >
                      {isUploading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>جارٍ الضغط والرفع بصيغة WebP...</span>
                        </>
                      ) : (
                        <>
                          <FolderOpen className="w-4 h-4" />
                          <span>اختيار صورة من جهازك للضغط والرفع</span>
                        </>
                      )}
                    </button>
                    <p className="text-[11px] text-slate-400 mt-1.5">
                      الصيغ المدعومة: JPG، JPEG، PNG، WebP — يتم التحويل تلقائياً إلى WebP (بحد أقصى 1200px و1 ميجابايت) والرفع إلى مشروع التخزين المستقل (restaurant-product-images)
                    </p>
                  </div>
              </div>
            )}

            {/* Tab 2: URL */}
            {imageTab === 'url' && (
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-600">رابط صورة مباشر عبر الإنترنت (HTTPS):</label>
                <input
                  type="url"
                  value={image}
                  onChange={(e) => {
                    setImage(e.target.value);
                    setUploadStatus(null);
                  }}
                  placeholder="https://example.com/item.jpg"
                  className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs text-left dir-ltr focus:ring-2 focus:ring-amber-500"
                />
              </div>
            )}
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
                  تُحفظ تلقائيًا في جداول restaurant_item_options و restaurant_item_option_values
                </p>
              </div>

              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleAddOptionGroup}
                className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-xl font-bold border border-amber-300 text-xs flex items-center gap-1 disabled:opacity-50"
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
                {optionGroups.map((grp) => (
                  <div
                    key={grp.id}
                    className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex-1">
                        <input
                          type="text"
                          disabled={isSubmitting}
                          value={grp.name}
                          onChange={(e) => handleUpdateGroup(grp.id, 'name', e.target.value)}
                          placeholder="اسم المجموعة (مثل: درجة الشطة، سرفيس إضافي...)"
                          className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl font-bold text-xs"
                        />
                      </div>
                      <button
                        type="button"
                        disabled={isSubmitting}
                        onClick={() => handleRemoveGroup(grp.id)}
                        className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg disabled:opacity-50"
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
                          disabled={isSubmitting}
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
                          disabled={isSubmitting}
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
                            disabled={isSubmitting}
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
                              disabled={isSubmitting}
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
                            disabled={isSubmitting}
                            onClick={() => handleRemoveOptionItem(grp.id, opt.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 disabled:opacity-50"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}

                      <button
                        type="button"
                        disabled={isSubmitting}
                        onClick={() => handleAddOptionItem(grp.id)}
                        className="text-[11px] font-bold text-amber-700 hover:text-amber-800 flex items-center gap-1 pt-1 disabled:opacity-50"
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
              disabled={isSubmitting}
              onClick={onClose}
              className="px-4 py-2 border border-slate-200 rounded-xl text-slate-600 font-bold hover:bg-slate-100 disabled:opacity-50"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={isSubmitting || isUploading}
              className="px-6 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl font-black flex items-center gap-1.5 shadow-md shadow-amber-500/20 disabled:opacity-60 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>جارٍ الحفظ في قاعدة البيانات...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>{itemToEdit ? 'حفظ تعديلات الصنف' : 'إضافة الصنف للمنيو'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
