import React, { useState, useEffect } from 'react';
import {
  X,
  Sparkles,
  Percent,
  Coins,
  Calendar,
  Check,
  AlertCircle,
  Image as ImageIcon,
} from 'lucide-react';
import { Offer, DiscountType, OfferStatus, MenuItem } from '../../types';

interface OfferModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (offerData: Omit<Offer, 'id'>) => void;
  offerToEdit?: Offer | null;
  menuItems: MenuItem[];
}

export const OfferModal: React.FC<OfferModalProps> = ({
  isOpen,
  onClose,
  onSave,
  offerToEdit,
  menuItems,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [bannerImage, setBannerImage] = useState(
    'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=1000&auto=format&fit=crop&q=80'
  );
  const [discountType, setDiscountType] = useState<DiscountType>('PERCENTAGE');
  const [discountValue, setDiscountValue] = useState<number | ''>(15);
  const [appliesToItemIds, setAppliesToItemIds] = useState<string[]>([]);
  const [startDate, setStartDate] = useState('2026-10-22');
  const [endDate, setEndDate] = useState('2026-11-05');
  const [status, setStatus] = useState<OfferStatus>('ACTIVE');
  const [sortOrder, setSortOrder] = useState(1);
  const [error, setError] = useState('');

  useEffect(() => {
    if (offerToEdit) {
      setTitle(offerToEdit.title);
      setDescription(offerToEdit.description);
      setBannerImage(offerToEdit.bannerImage);
      setDiscountType(offerToEdit.discountType);
      setDiscountValue(offerToEdit.discountValue);
      setAppliesToItemIds(offerToEdit.appliesToItemIds);
      setStartDate(offerToEdit.startDate);
      setEndDate(offerToEdit.endDate);
      setStatus(offerToEdit.status);
      setSortOrder(offerToEdit.sortOrder);
    } else {
      setTitle('');
      setDescription('');
      setBannerImage('https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=1000&auto=format&fit=crop&q=80');
      setDiscountType('PERCENTAGE');
      setDiscountValue(15);
      setAppliesToItemIds([]);
      setStartDate('2026-10-22');
      setEndDate('2026-11-05');
      setStatus('ACTIVE');
      setSortOrder(1);
    }
    setError('');
  }, [offerToEdit, isOpen]);

  if (!isOpen) return null;

  const toggleItemSelection = (id: string) => {
    if (appliesToItemIds.includes(id)) {
      setAppliesToItemIds(appliesToItemIds.filter((i) => i !== id));
    } else {
      setAppliesToItemIds([...appliesToItemIds, id]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('يرجى إدخال عنوان العرض.');
      return;
    }
    if (discountValue === '' || discountValue <= 0) {
      setError('يرجى إدخال قيمة خصم صالحة.');
      return;
    }
    if (discountType === 'PERCENTAGE' && discountValue > 80) {
      setError('نسبة الخصم المئوية لا يمكن أن تتجاوز 80% وفق سياسة المطعم.');
      return;
    }

    onSave({
      title: title.trim(),
      description: description.trim(),
      bannerImage: bannerImage.trim() || 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=1000&auto=format&fit=crop&q=80',
      discountType,
      discountValue: Number(discountValue),
      appliesToItemIds,
      startDate,
      endDate,
      status,
      sortOrder: Number(sortOrder),
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-xl w-full max-h-[92vh] flex flex-col overflow-hidden text-right">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-amber-100 text-amber-700 rounded-xl">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                {offerToEdit ? 'تعديل بيانات العرض الترويجي' : 'إنشاء عرض وسلايدر جديد'}
              </h3>
              <p className="text-[11px] text-slate-400">
                عرض يظهر في البانر العلوي ويوفر خصومات للزبائن
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

          <div>
            <label className="block text-slate-700 font-bold mb-1">عنوان العرض الترويجي *</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="مثال: عرض لمة العيلة على المشويات — وفر 20%"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-amber-500 focus:bg-white font-bold"
            />
          </div>

          <div>
            <label className="block text-slate-700 font-bold mb-1">وصف العرض وتفاصيله</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="شرح شروط العرض، مثل: متاح حتى نفاذ الكمية أو خلال نهاية الأسبوع..."
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-amber-500 focus:bg-white"
            />
          </div>

          {/* Discount Type & Value */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
            <div>
              <label className="block text-slate-700 font-bold mb-1.5">نوع الخصم</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setDiscountType('PERCENTAGE')}
                  className={`py-2 px-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
                    discountType === 'PERCENTAGE'
                      ? 'bg-amber-500 text-slate-950 shadow-xs'
                      : 'bg-white text-slate-600 border border-slate-200'
                  }`}
                >
                  <Percent className="w-3.5 h-3.5" />
                  <span>نسبة مئوية (%)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDiscountType('FIXED')}
                  className={`py-2 px-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
                    discountType === 'FIXED'
                      ? 'bg-amber-500 text-slate-950 shadow-xs'
                      : 'bg-white text-slate-600 border border-slate-200'
                  }`}
                >
                  <Coins className="w-3.5 h-3.5" />
                  <span>مبلغ ثابت (ج.م)</span>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1.5">
                قيمة الخصم {discountType === 'PERCENTAGE' ? '(%)' : '(جنيه)'} *
              </label>
              <input
                type="number"
                min="1"
                step="1"
                required
                value={discountValue}
                onChange={(e) =>
                  setDiscountValue(e.target.value === '' ? '' : parseFloat(e.target.value))
                }
                className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900"
              />
            </div>
          </div>

          {/* Banner image URL */}
          <div>
            <label className="block text-slate-700 font-bold mb-1">
              رابط صورة البانر (للسلايدر)
            </label>
            <input
              type="url"
              value={bannerImage}
              onChange={(e) => setBannerImage(e.target.value)}
              placeholder="https://..."
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-left dir-ltr focus:ring-2 focus:ring-amber-500"
            />
          </div>

          {/* Target items */}
          <div>
            <label className="block text-slate-700 font-bold mb-1">
              الأصناف المشمولة بالعرض (اتركها فارغة لتشمل كافة الأصناف):
            </label>
            <div className="max-h-36 overflow-y-auto p-2.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
              {menuItems.map((item) => {
                const isSelected = appliesToItemIds.includes(item.id);
                return (
                  <label
                    key={item.id}
                    className="flex items-center justify-between p-2 bg-white rounded-lg border border-slate-200/60 cursor-pointer select-none text-xs hover:bg-amber-50/50"
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleItemSelection(item.id)}
                        className="w-3.5 h-3.5 text-amber-600 rounded"
                      />
                      <span className="font-semibold text-slate-800">{item.name}</span>
                    </div>
                    <span className="text-slate-400 font-mono">{item.price} ج.م</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Dates & Status */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-slate-700 font-bold mb-1">تاريخ البدء</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-bold mb-1">تاريخ الانتهاء</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-bold mb-1">حالة العرض</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as OfferStatus)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
              >
                <option value="ACTIVE">نشط ويعمل</option>
                <option value="PAUSED">متوقف مؤقتًا</option>
                <option value="DRAFT">مسودة</option>
                <option value="EXPIRED">منتهٍ</option>
              </select>
            </div>
          </div>

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
              <span>{offerToEdit ? 'حفظ تعديلات العرض' : 'إطلاق العرض'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
