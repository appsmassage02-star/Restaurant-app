import React, { useState } from 'react';
import {
  Settings,
  Store,
  Phone,
  MapPin,
  Clock,
  Sliders,
  ShieldAlert,
  Save,
  CheckCircle,
  Image as ImageIcon,
  Lock,
  Compass,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const SettingsView: React.FC = () => {
  const { restaurant, updateRestaurant } = useApp();

  const [name, setName] = useState(restaurant.name);
  const [description, setDescription] = useState(restaurant.description);
  const [phone, setPhone] = useState(restaurant.phone);
  const [address, setAddress] = useState(restaurant.address);
  const [city, setCity] = useState(restaurant.city);
  const [governorate, setGovernorate] = useState(restaurant.governorate);
  const [logo, setLogo] = useState(restaurant.logo);
  const [coverImage, setCoverImage] = useState(restaurant.coverImage);
  const [openingHours, setOpeningHours] = useState(restaurant.openingHours);
  const [holidays, setHolidays] = useState(restaurant.holidays);
  const [deliveryRadiusKm, setDeliveryRadiusKm] = useState(restaurant.deliveryRadiusKm);
  const [isOpen, setIsOpen] = useState(restaurant.isOpen);

  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateRestaurant({
      name,
      description,
      phone,
      address,
      city,
      governorate,
      logo,
      coverImage,
      openingHours,
      holidays,
      deliveryRadiusKm,
      isOpen,
    });
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
          <Settings className="w-5 h-5 text-amber-500" />
          إعدادات وبيانات المطعم والتشغيل
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          تعديل مواعيد العمل، نطاق التوصيل الذاتي، صورة المطعم والتحكم في حالة استقبال الطلبات
        </p>
      </div>

      {saveSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-2 text-emerald-800 text-xs font-bold">
          <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>تم حفظ وتحديث بيانات المطعم بنجاح!</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-5 text-xs">
        {/* Open / Close Switch Card */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span
                className={`w-3 h-3 rounded-full ${
                  isOpen ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
                }`}
              />
              <h3 className="text-sm font-bold text-slate-900">
                حالة استقبال الطلبات للزبائن: {isOpen ? 'مفتوح للطلب' : 'مغلق مؤقتًا'}
              </h3>
            </div>
            <p className="text-slate-500 text-xs leading-relaxed max-w-xl">
              إغلاق المطعم يمنع استقبال طلبات جديدة فورًا في تطبيق العميل دون التأثير على الطلبات السابقة أو حذفها.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className={`px-5 py-2.5 rounded-xl font-bold text-xs transition-all shadow-xs shrink-0 ${
              isOpen
                ? 'bg-rose-100 text-rose-700 hover:bg-rose-200 border border-rose-300'
                : 'bg-emerald-600 text-white hover:bg-emerald-700'
            }`}
          >
            {isOpen ? 'إغلاق المطعم مؤقتًا' : 'فتح المطعم لاستقبال الزبائن'}
          </button>
        </div>

        {/* Basic Restaurant Info */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2 flex items-center gap-2">
            <Store className="w-4 h-4 text-amber-600" />
            البيانات التجارية للمطعم
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-700 font-bold mb-1">اسم المطعم *</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-amber-500 focus:bg-white font-bold"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">رقم هاتف المطعم *</label>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-left dir-ltr focus:ring-2 focus:ring-amber-500 focus:bg-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-700 font-bold mb-1">وصف المطعم ونوع المأكولات</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-amber-500 focus:bg-white"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-700 font-bold mb-1">رابط لوجو المطعم (صورة المالك)</label>
              <div className="flex items-center gap-2">
                <img
                  src={logo}
                  alt={name}
                  className="w-10 h-10 rounded-xl object-cover border border-slate-200 shrink-0"
                />
                <input
                  type="url"
                  value={logo}
                  onChange={(e) => setLogo(e.target.value)}
                  className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-left dir-ltr"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">العنوان التفصيلي</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
              />
            </div>
          </div>
        </div>

        {/* Operating Hours & Holidays */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2 flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-600" />
            ساعات العمل ومواعيد الإجازات
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-700 font-bold mb-1">مواعيد وساعات العمل اليومية</label>
              <input
                type="text"
                value={openingHours}
                onChange={(e) => setOpeningHours(e.target.value)}
                placeholder="مثال: من 11:00 ص حتى 02:00 ص"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">أيام الإجازات الأسبوعية أو السنوية</label>
              <input
                type="text"
                value={holidays}
                onChange={(e) => setHolidays(e.target.value)}
                placeholder="مثال: يعمل طوال الأسبوع بدون إجازات"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
              />
            </div>
          </div>
        </div>

        {/* Delivery Settings & Administrative Restrictions */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2 flex items-center gap-2">
            <Sliders className="w-4 h-4 text-amber-600" />
            نطاق التوصيل والسياسات المركزية
          </h3>

          {/* Delivery radius */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800">
                نطاق التوصيل الفعلي للمطعم:
              </label>
              <span className="text-base font-black text-amber-600 bg-amber-50 px-3 py-1 rounded-xl border border-amber-200">
                {deliveryRadiusKm} كم
              </span>
            </div>

            <input
              type="range"
              min="1"
              max={restaurant.maxAllowedRadiusKm}
              step="0.5"
              value={deliveryRadiusKm}
              onChange={(e) => setDeliveryRadiusKm(parseFloat(e.target.value))}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-amber-500"
            />

            <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium">
              <span>الحد الأدنى: 1 كم</span>
              <span className="text-amber-800 font-bold">
                الحد الأقصى المسموح به إداريًا: {restaurant.maxAllowedRadiusKm} كم (لا يمكن تجاوزه)
              </span>
            </div>
          </div>

          {/* Read-Only Admin Controls */}
          <div className="p-4 bg-slate-100 rounded-2xl border border-slate-200 space-y-2.5">
            <div className="flex items-center gap-2 font-bold text-slate-800 text-xs">
              <Lock className="w-4 h-4 text-slate-500" />
              <span>إعدادات إدارية مركزية (للقراءة فقط — صلاحيات إدارة المنظومة)</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-1">
              <div className="p-2.5 bg-white rounded-xl border border-slate-200">
                <span className="text-slate-400 block text-[10px]">نسبة عمولة الإدارة:</span>
                <span className="font-extrabold text-amber-700 text-sm">
                  {restaurant.adminCommissionPercent}% (ثابتة)
                </span>
              </div>
              <div className="p-2.5 bg-white rounded-xl border border-slate-200">
                <span className="text-slate-400 block text-[10px]">رسوم التوصيل المعتمدة:</span>
                <span className="font-extrabold text-slate-800 text-sm">
                  {restaurant.deliveryFee} ج.م
                </span>
              </div>
              <div className="p-2.5 bg-white rounded-xl border border-slate-200">
                <span className="text-slate-400 block text-[10px]">طريقة تسوية المستحقات:</span>
                <span className="font-extrabold text-emerald-700 text-sm">
                  أسبوعية معتمدة
                </span>
              </div>
            </div>

            <p className="text-[11px] text-slate-500 pt-1">
              * لا يحق للمطعم تعديل نسبة العمولة أو تجاوز رسوم التوصيل المقررة مركزيًا لضمان معايير الخدمة عبر التطبيق.
            </p>
          </div>
        </div>

        {/* Submit */}
        <div className="flex items-center justify-end">
          <button
            type="submit"
            className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-xl text-xs flex items-center gap-2 shadow-md shadow-amber-500/20 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>حفظ إعدادات المطعم</span>
          </button>
        </div>
      </form>
    </div>
  );
};
