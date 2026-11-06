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
  Loader2,
  Info,
} from 'lucide-react';
import { Offer, DiscountType, OfferStatus, MenuItem } from '../../types';

interface OfferModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (offerData: Omit<Offer, 'id'>) => Promise<boolean> | void;
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
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(
    new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [status, setStatus] = useState<OfferStatus>('ACTIVE');
  const [sortOrder, setSortOrder] = useState(1);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (offerToEdit) {
      setTitle(offerToEdit.title);
      setDescription(offerToEdit.description);
      setBannerImage(offerToEdit.bannerImage);
      setDiscountType(offerToEdit.discountType);
      setDiscountValue(offerToEdit.discountValue);
      setStartDate(offerToEdit.startDate || new Date().toISOString().split('T')[0]);
      setEndDate(
        offerToEdit.endDate ||
          new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      );
      setStatus(offerToEdit.status);
      setSortOrder(offerToEdit.sortOrder);
    } else {
      setTitle('');
      setDescription('');
      setBannerImage('https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=1000&auto=format&fit=crop&q=80');
      setDiscountType('PERCENTAGE');
      setDiscountValue(15);
      setStartDate(new Date().toISOString().split('T')[0]);
      setEndDate(
        new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      );
      setStatus('ACTIVE');
      setSortOrder(1);
    }
    setError('');
    setIsSubmitting(false);
  }, [offerToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
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

    try {
      setIsSubmitting(true);
      setError('');
      const res = await onSave({
        title: title.trim(),
        description: description.trim(),
        bannerImage: bannerImage.trim() || 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=1000&auto=format&fit=crop&q=80',
        discountType,
        discountValue: Number(discountValue),
        appliesToItemIds: [],
        startDate,
        endDate,
        status,
        sortOrder: Number(sortOrder),
      });

      if (res === false) {
        setIsSubmitting(false);
        return;
      }

      onClose();
    } catch (err: any) {
      setError(err?.message || 'فشل حفظ العرض في قاعدة البيانات.');
      setIsSubmitting(false);
    }
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
                حفظ العرض في جدول restaurant_offers الفعلي في Supabase
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

          <div>
            <label className="block text-slate-700 font-bold mb-1">عنوان العرض الترويجي *</label>
            <input
              type="text"
              required
              disabled={isSubmitting}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="مثال: عرض لمة العيلة على المشويات — وفر 20%"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-amber-500 focus:bg-white font-bold disabled:opacity-50"
            />
          </div>

          <div>
            <label className="block text-slate-700 font-bold mb-1">وصف العرض وشروطه</label>
            <textarea
              rows={2}
              disabled={isSubmitting}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="وصف تفصيلي للخصم وشروط الاستفادة منه..."
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-amber-500 focus:bg-white disabled:opacity-50"
            />
          </div>

          {/* Discount type & value */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-slate-700 font-bold mb-1">نوع الخصم *</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setDiscountType('PERCENTAGE')}
                  className={`py-2 px-3 rounded-xl font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    discountType === 'PERCENTAGE'
                      ? 'bg-amber-500 text-slate-950 shadow-xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <Percent className="w-3.5 h-3.5" />
                  <span>نسبة مئوية (%)</span>
                </button>

                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setDiscountType('FIXED')}
                  className={`py-2 px-3 rounded-xl font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    discountType === 'FIXED'
                      ? 'bg-amber-500 text-slate-950 shadow-xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  <Coins className="w-3.5 h-3.5" />
                  <span>مبلغ ثابت (ج.م)</span>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">
                قيمة الخصم {discountType === 'PERCENTAGE' ? '(%)' : '(ج.م)'} *
              </label>
              <input
                type="number"
                min="1"
                max={discountType === 'PERCENTAGE' ? 80 : 1000}
                required
                disabled={isSubmitting}
                value={discountValue}
                onChange={(e) =>
                  setDiscountValue(e.target.value === '' ? '' : parseFloat(e.target.value))
                }
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-amber-500 font-bold text-slate-900 disabled:opacity-50"
              />
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-slate-700 font-bold mb-1">تاريخ بدء سريان العرض *</label>
              <input
                type="date"
                required
                disabled={isSubmitting}
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-amber-500 disabled:opacity-50"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">تاريخ انتهاء العرض *</label>
              <input
                type="date"
                required
                disabled={isSubmitting}
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-amber-500 disabled:opacity-50"
              />
            </div>
          </div>

          {/* Status & Preview Banner Note */}
          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-slate-700 font-bold">حالة تفعيل العرض في السلايدر</label>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => setStatus(status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE')}
                className={`px-3 py-1 rounded-xl font-bold text-xs transition-all ${
                  status === 'ACTIVE'
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : 'bg-slate-200 text-slate-700'
                }`}
              >
                {status === 'ACTIVE' ? 'مفعل في السلايدر' : 'متوقف مؤقتًا'}
              </button>
            </div>
            <div className="flex items-start gap-1.5 text-[11px] text-slate-500">
              <Info className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
              <span>
                مخطط جدول restaurant_offers يحفظ العنوان والوصف ونوع وقيمة الخصم وفترة الصلاحية. يتم توليد تصميم السلايدر تلقائيًا وجذابًا بناءً على هذه البيانات.
              </span>
            </div>
          </div>

          {/* Actions */}
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
                  <span>{offerToEdit ? 'حفظ تعديلات العرض' : 'إنشاء وتفعيل العرض'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
