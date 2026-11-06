import React, { useState, useEffect } from 'react';
import { X, FolderPlus, Edit, Check, Loader2 } from 'lucide-react';
import { MenuCategory } from '../../types';

interface CategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string, description?: string) => Promise<boolean> | void;
  categoryToEdit?: MenuCategory | null;
}

export const CategoryModal: React.FC<CategoryModalProps> = ({
  isOpen,
  onClose,
  onSave,
  categoryToEdit,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (categoryToEdit) {
      setName(categoryToEdit.name);
      setDescription(categoryToEdit.description || '');
    } else {
      setName('');
      setDescription('');
    }
    setError('');
    setIsSubmitting(false);
  }, [categoryToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('يرجى إدخال اسم القسم.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError('');
      const res = await onSave(name.trim(), description.trim() || undefined);
      // إذا كان التابع يرجع boolean وفشل الحفظ في قاعدة البيانات
      if (res === false) {
        setIsSubmitting(false);
        return;
      }
      onClose();
    } catch (err: any) {
      setError(err?.message || 'حدث خطأ أثناء حفظ القسم في قاعدة البيانات.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden text-right">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-amber-100 text-amber-700 rounded-xl">
              {categoryToEdit ? <Edit className="w-5 h-5" /> : <FolderPlus className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                {categoryToEdit ? 'تعديل بيانات القسم' : 'إضافة قسم جديد للمنيو'}
              </h3>
              <p className="text-[11px] text-slate-400">تنظيم أصناف الوجبات والمأكولات في قاعدة البيانات</p>
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
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 font-bold leading-relaxed">
              {error}
            </div>
          )}

          <div>
            <label className="block text-slate-700 font-bold mb-1">اسم القسم *</label>
            <input
              type="text"
              required
              disabled={isSubmitting}
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError('');
              }}
              placeholder="مثال: المشويات على الفحم، الطواجن، السندوتشات..."
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-amber-500 focus:bg-white disabled:opacity-50"
            />
          </div>

          <div>
            <label className="block text-slate-700 font-bold mb-1">وصف مختصر للقسم</label>
            <textarea
              rows={2}
              disabled={isSubmitting}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="وصف للأصناف التابعة لهذا القسم يظهر للعملاء..."
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-amber-500 focus:bg-white disabled:opacity-50"
            />
          </div>

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
              disabled={isSubmitting}
              className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl font-bold flex items-center gap-1.5 shadow-xs disabled:opacity-60 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>جارٍ الحفظ في قاعدة البيانات...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>{categoryToEdit ? 'حفظ التعديلات' : 'إضافة القسم'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
