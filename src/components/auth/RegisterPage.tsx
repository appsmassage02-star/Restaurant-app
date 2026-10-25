import React, { useState } from 'react';
import {
  Store,
  User,
  Phone,
  Mail,
  Lock,
  MapPin,
  Compass,
  ArrowRight,
  ArrowLeft,
  CheckCircle,
  AlertCircle,
  FileText,
  Sliders,
  ShieldCheck,
  Building,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

interface RegisterPageProps {
  onGoToLogin: () => void;
  onRegisteredSuccess: () => void;
}

export const RegisterPage: React.FC<RegisterPageProps> = ({
  onGoToLogin,
  onRegisteredSuccess,
}) => {
  const { registerRestaurant } = useApp();

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [errorMsg, setErrorMsg] = useState('');

  // Step 1: Owner Info
  const [ownerName, setOwnerName] = useState('');
  const [ownerPhone, setOwnerPhone] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Step 2: Restaurant Info
  const [restaurantName, setRestaurantName] = useState('');
  const [restaurantDesc, setRestaurantDesc] = useState('');
  const [restaurantPhone, setRestaurantPhone] = useState('');
  const [governorate, setGovernorate] = useState('الدقهلية');
  const [city, setCity] = useState('المنصورة');
  const [detailedAddress, setDetailedAddress] = useState('');
  const [logoUrl, setLogoUrl] = useState('https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&auto=format&fit=crop&q=80');
  const [latitude, setLatitude] = useState(31.0409);
  const [longitude, setLongitude] = useState(31.3785);

  // Step 3: Operational Settings
  const [deliveryRadiusKm, setDeliveryRadiusKm] = useState(7.0);
  const maxAllowedRadiusKm = 12.0; // Central admin restriction
  const defaultDeliveryFee = 25.0; // Central admin policy preview

  // Step 4: Terms
  const [agreedTerms, setAgreedTerms] = useState(false);
  const [agreedCommission, setAgreedCommission] = useState(false);

  // Egyptian Governorates & Cities
  const EGYPT_GOVERNORATES: Record<string, string[]> = {
    'الدقهلية': ['المنصورة', 'طلخا', 'ميت غمر', 'السنبلاوين', 'دكرنس', 'بلقاس'],
    'القاهرة': ['مدينة نصر', 'التجمع الخامس', 'المعادي', 'مصر الجديدة', 'وسط البلد', 'شبرا'],
    'الجيزة': ['الدقي', 'المهندسين', 'الهرم', 'فيصل', 'الشيخ زايد', 'أكتوبر'],
    'الإسكندرية': ['سموحة', 'سيدي جابر', 'ميامي', 'محطة الرمل', 'العجمي', 'لوران'],
    'الغربية': ['طنطا', 'المحلة الكبرى', 'زفتى', 'كفر الزيات'],
    'الشرقية': ['الزقازيق', 'العاشر من رمضان', 'بلبيس', 'فاقوس'],
  };

  const handleGovChange = (gov: string) => {
    setGovernorate(gov);
    if (EGYPT_GOVERNORATES[gov] && EGYPT_GOVERNORATES[gov].length > 0) {
      setCity(EGYPT_GOVERNORATES[gov][0]);
    }
  };

  const validateStep1 = () => {
    if (!ownerName.trim()) return 'يرجى إدخال اسم صاحب المطعم بالكامل.';
    if (!ownerPhone.trim() || ownerPhone.length < 11) return 'يرجى إدخال رقم هاتف صحيح لصاحب المطعم (11 رقمًا).';
    if (!ownerEmail.trim() || !ownerEmail.includes('@')) return 'يرجى إدخال بريد إلكتروني صالح.';
    if (!password || password.length < 6) return 'كلمة المرور يجب ألا تقل عن 6 خانات.';
    if (password !== confirmPassword) return 'كلمتا المرور غير متطابقتين.';
    return null;
  };

  const validateStep2 = () => {
    if (!restaurantName.trim()) return 'يرجى إدخال اسم المطعم التجاري.';
    if (!restaurantDesc.trim()) return 'يرجى كتابة نبذة مختصرة عن المطعم.';
    if (!restaurantPhone.trim()) return 'يرجى إدخال رقم هاتف المطعم لاستقبال الاتصالات.';
    if (!detailedAddress.trim()) return 'يرجى كتابة العنوان التفصيلي بدقة.';
    return null;
  };

  const handleNext = () => {
    setErrorMsg('');
    if (step === 1) {
      const err = validateStep1();
      if (err) {
        setErrorMsg(err);
        return;
      }
      setStep(2);
    } else if (step === 2) {
      const err = validateStep2();
      if (err) {
        setErrorMsg(err);
        return;
      }
      setStep(3);
    } else if (step === 3) {
      setStep(4);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreedTerms || !agreedCommission) {
      setErrorMsg('يجب الموافقة على الشروط العامة ونسبة العمولة الإدارية لإرسال الطلب.');
      return;
    }

    registerRestaurant(
      {
        fullName: ownerName,
        phone: ownerPhone,
        email: ownerEmail,
      },
      {
        name: restaurantName,
        description: restaurantDesc,
        phone: restaurantPhone,
        address: detailedAddress,
        governorate,
        city,
        latitude,
        longitude,
        deliveryRadiusKm,
        maxAllowedRadiusKm,
        deliveryFee: defaultDeliveryFee,
        logo: logoUrl,
        isOpen: true,
      }
    );

    onRegisteredSuccess();
  };

  // Preset quick fill for test demo
  const fillSampleData = () => {
    setOwnerName('م. عادل حسام الدين');
    setOwnerPhone('01019887766');
    setOwnerEmail('adel.hosam@example.com');
    setPassword('123456');
    setConfirmPassword('123456');
    setRestaurantName('فطاطري وأكلات زمان');
    setRestaurantDesc('أشهى الفطير المشلتت الفلاحي والبيتزا الشرقية بالطريقة البلدي الأصيلة.');
    setRestaurantPhone('01234567890');
    setDetailedAddress('شارع بنك مصر، بجوار محطة القطار، برج الفردوس');
    setDeliveryRadiusKm(8.5);
    setAgreedTerms(true);
    setAgreedCommission(true);
    setErrorMsg('');
  };

  return (
    <div className="min-h-screen bg-slate-900 py-8 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
      <div className="max-w-2xl w-full bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-l from-amber-600 via-amber-500 to-amber-600 p-6 text-white text-center relative">
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center">
              <Store className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black">طلب تسجيل مطعم جديد</h1>
          </div>
          <p className="text-xs text-amber-100 max-w-md mx-auto">
            انضم إلى منظومة «طلبات البيت» واستقبل طلبات زبائنك بسهولة وإدارة دقيقة لحساباتك
          </p>

          <button
            type="button"
            onClick={fillSampleData}
            className="mt-3 text-[11px] font-bold bg-amber-900/30 hover:bg-amber-900/50 text-white px-3 py-1 rounded-full border border-white/20 transition-all inline-flex items-center gap-1"
          >
            <span>ملء بيانات تجريبية سريعة</span>
          </button>
        </div>

        {/* Steps Progress Indicator */}
        <div className="p-4 sm:px-8 border-b border-slate-100 bg-slate-50">
          <div className="grid grid-cols-4 gap-2 text-center text-xs">
            <div
              className={`p-2 rounded-xl transition-colors ${
                step >= 1 ? 'bg-amber-500 text-white font-bold' : 'bg-slate-200 text-slate-500'
              }`}
            >
              <span className="block text-[10px] opacity-80">خطوة 1</span>
              <span>بيانات المالك</span>
            </div>
            <div
              className={`p-2 rounded-xl transition-colors ${
                step >= 2 ? 'bg-amber-500 text-white font-bold' : 'bg-slate-200 text-slate-500'
              }`}
            >
              <span className="block text-[10px] opacity-80">خطوة 2</span>
              <span>بيانات المطعم</span>
            </div>
            <div
              className={`p-2 rounded-xl transition-colors ${
                step >= 3 ? 'bg-amber-500 text-white font-bold' : 'bg-slate-200 text-slate-500'
              }`}
            >
              <span className="block text-[10px] opacity-80">خطوة 3</span>
              <span>إعدادات التشغيل</span>
            </div>
            <div
              className={`p-2 rounded-xl transition-colors ${
                step >= 4 ? 'bg-amber-500 text-white font-bold' : 'bg-slate-200 text-slate-500'
              }`}
            >
              <span className="block text-[10px] opacity-80">خطوة 4</span>
              <span>المراجعة والإرسال</span>
            </div>
          </div>
        </div>

        {/* Body Form */}
        <div className="p-6 sm:p-8">
          {errorMsg && (
            <div className="mb-5 p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2.5 text-rose-700 text-xs font-bold">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* STEP 1: OWNER */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="border-b border-slate-100 pb-2 mb-3">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <User className="w-4 h-4 text-amber-600" />
                  البيانات الشخصية لمالك المطعم (حساب الإدارة)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  سيكون هذا الحساب هو المسؤول الأول عن إدارة الصلاحيات والمنيو والمستحقات.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  الاسم الكامل لصاحب المطعم *
                </label>
                <input
                  type="text"
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  placeholder="مثال: الحاج عادل النحاس"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-amber-500 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    رقم الهاتف الشخصي *
                  </label>
                  <input
                    type="tel"
                    value={ownerPhone}
                    onChange={(e) => setOwnerPhone(e.target.value)}
                    placeholder="01012345678"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-left dir-ltr focus:ring-2 focus:ring-amber-500 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    البريد الإلكتروني للـتسجيل *
                  </label>
                  <input
                    type="email"
                    value={ownerEmail}
                    onChange={(e) => setOwnerEmail(e.target.value)}
                    placeholder="owner@restaurant.com"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-left dir-ltr focus:ring-2 focus:ring-amber-500 focus:bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    كلمة المرور *
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-left dir-ltr focus:ring-2 focus:ring-amber-500 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    تأكيد كلمة المرور *
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-left dir-ltr focus:ring-2 focus:ring-amber-500 focus:bg-white"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: RESTAURANT INFO */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="border-b border-slate-100 pb-2 mb-3">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <Building className="w-4 h-4 text-amber-600" />
                  بيانات المطعم والموقع الجغرافي
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  هذه البيانات هي التي ستظهر للعملاء في تطبيق طلبات البيت.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    اسم المطعم التجاري *
                  </label>
                  <input
                    type="text"
                    value={restaurantName}
                    onChange={(e) => setRestaurantName(e.target.value)}
                    placeholder="مثال: كبابجي البرنس"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-amber-500 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    رقم هاتف المطعم (للطلبات والاستفسارات) *
                  </label>
                  <input
                    type="tel"
                    value={restaurantPhone}
                    onChange={(e) => setRestaurantPhone(e.target.value)}
                    placeholder="01223456789"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-left dir-ltr focus:ring-2 focus:ring-amber-500 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  وصف المطعم ونوع المأكولات *
                </label>
                <textarea
                  rows={2}
                  value={restaurantDesc}
                  onChange={(e) => setRestaurantDesc(e.target.value)}
                  placeholder="مشويات، حواوشي، طواجن فخار وسلطات بلدي..."
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-amber-500 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    المحافظة *
                  </label>
                  <select
                    value={governorate}
                    onChange={(e) => handleGovChange(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-amber-500"
                  >
                    {Object.keys(EGYPT_GOVERNORATES).map((gov) => (
                      <option key={gov} value={gov}>
                        {gov}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    المركز أو المنطقة *
                  </label>
                  <select
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-amber-500"
                  >
                    {(EGYPT_GOVERNORATES[governorate] || []).map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  العنوان التفصيلي وأقرب علامة مميزة *
                </label>
                <input
                  type="text"
                  value={detailedAddress}
                  onChange={(e) => setDetailedAddress(e.target.value)}
                  placeholder="اسم الشارع، رقم العقار، بجوار علامة شهيرة"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-amber-500 focus:bg-white"
                />
              </div>

              {/* Interactive Demo Map & Pin */}
              <div className="p-3.5 bg-amber-50/50 rounded-2xl border border-amber-200/80">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                    <Compass className="w-4 h-4 text-amber-600" />
                    <span>تحديد موقع المطعم على الخريطة التجريبية</span>
                  </div>
                  <span className="text-[11px] text-slate-500">
                    خط العرض: {latitude.toFixed(4)} | خط الطول: {longitude.toFixed(4)}
                  </span>
                </div>

                {/* Simulated interactive map canvas */}
                <div
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const xPercent = (e.clientX - rect.left) / rect.width;
                    const yPercent = (e.clientY - rect.top) / rect.height;
                    setLatitude(31.0 + yPercent * 0.1);
                    setLongitude(31.3 + xPercent * 0.15);
                  }}
                  className="relative h-32 sm:h-36 bg-gradient-to-tr from-slate-200 via-amber-100 to-emerald-100 rounded-xl overflow-hidden cursor-crosshair border border-slate-300 flex items-center justify-center select-none"
                  title="انقر على أي نقطة لتغيير إحداثيات المطعم تجريبيًا"
                >
                  {/* Grid lines styling */}
                  <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#000_1px,transparent_1px)] [background-size:16px_16px]" />
                  <div className="text-center text-xs text-slate-600 z-10 bg-white/70 backdrop-blur-xs px-3 py-1 rounded-full shadow-2xs">
                    انقر في أي مكان على الخريطة لتثبيت دبوس المطعم
                  </div>
                  {/* Pin */}
                  <div className="absolute transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center pointer-events-none transition-all">
                    <div className="p-1.5 bg-rose-600 text-white rounded-full shadow-lg ring-4 ring-rose-200 animate-bounce">
                      <MapPin className="w-4 h-4" />
                    </div>
                    <span className="mt-1 text-[10px] font-bold bg-slate-900 text-white px-1.5 py-0.5 rounded shadow">
                      {restaurantName || 'موقع المطعم'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: OPERATIONAL SETTINGS */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="border-b border-slate-100 pb-2 mb-3">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-amber-600" />
                  إعدادات التشغيل ونطاق التوصيل
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  حدد نطاق خدمة التوصيل الذاتي لمطعمك وفق القواعد الإدارية المعتمدة.
                </p>
              </div>

              {/* Delivery radius slider */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800">
                    نصف قطر التوصيل المطلوب:
                  </label>
                  <span className="text-base font-black text-amber-600 bg-amber-50 px-3 py-1 rounded-xl border border-amber-200">
                    {deliveryRadiusKm} كم
                  </span>
                </div>

                <input
                  type="range"
                  min="1"
                  max={maxAllowedRadiusKm}
                  step="0.5"
                  value={deliveryRadiusKm}
                  onChange={(e) => setDeliveryRadiusKm(parseFloat(e.target.value))}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-amber-500"
                />

                <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium">
                  <span>1 كم (توصيل محلي محدود)</span>
                  <span className="text-amber-800 font-bold">
                    الحد الأقصى المسموح به إداريًا: {maxAllowedRadiusKm} كم
                  </span>
                </div>
              </div>

              {/* Administrative Policy Clarification Note */}
              <div className="p-4 bg-amber-50/80 rounded-2xl border border-amber-200 text-slate-800 space-y-2 text-xs">
                <div className="flex items-center gap-2 font-bold text-amber-900">
                  <ShieldCheck className="w-4 h-4 text-amber-700" />
                  <span>توضيح هام حول شروط الإدارة المركزية والعمولة</span>
                </div>
                <p className="leading-relaxed text-slate-700">
                  • <strong>عمولة الإدارة:</strong> تحدد مركزيًا بنسبة <strong>10%</strong> وتُحتسب حصريًا على قيمة الطعام بعد الخصم (ولا يتم احتساب عمولة إدارية على رسوم التوصيل).
                </p>
                <p className="leading-relaxed text-slate-700">
                  • <strong>رسوم التوصيل المقترحة:</strong> 25.00 ج.م ثابتة في نطاق التوصيل، وتذهب للمطعم بالكامل في مسار التوصيل الذاتي وفق الاتفاق المعتمد.
                </p>
                <p className="leading-relaxed text-slate-700">
                  • <strong>دورة تسوية المستحقات:</strong> أسبوعية عبر الحساب البنكي أو المحفظة الإلكترونية المعتمدة.
                </p>
              </div>
            </div>
          )}

          {/* STEP 4: REVIEW & AGREEMENT */}
          {step === 4 && (
            <div className="space-y-4">
              <div className="border-b border-slate-100 pb-2 mb-3">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-amber-600" />
                  مراجعة بيانات التسجيل والموافقة على الشروط
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  يرجى التأكد من صحة بياناتك قبل إرسال طلب الانضمام للمراجعة.
                </p>
              </div>

              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-2.5 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-500">اسم صاحب المطعم:</span>
                  <span className="font-bold text-slate-800">{ownerName}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-500">رقم الهاتف والبريد:</span>
                  <span className="font-semibold text-slate-800 dir-ltr">{ownerPhone} | {ownerEmail}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-500">اسم المطعم التجاري:</span>
                  <span className="font-bold text-amber-700">{restaurantName}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-500">العنوان والمنطقة:</span>
                  <span className="font-medium text-slate-800">{city}، {governorate} — {detailedAddress}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-500">نطاق التوصيل والعمولة:</span>
                  <span className="font-bold text-emerald-700">{deliveryRadiusKm} كم — عمولة الإدارة 10%</span>
                </div>
              </div>

              {/* Checkboxes */}
              <div className="space-y-3 pt-2">
                <label className="flex items-start gap-2.5 cursor-pointer text-xs text-slate-700 select-none">
                  <input
                    type="checkbox"
                    checked={agreedCommission}
                    onChange={(e) => setAgreedCommission(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded text-amber-600 focus:ring-amber-500 border-slate-300"
                  />
                  <span>
                    أقر بموافقتي على نسبة عمولة الإدارة المعتمدة (10% على صافي قيمة الطعام المباع) ونظام التسوية الأسبوعية.
                  </span>
                </label>

                <label className="flex items-start gap-2.5 cursor-pointer text-xs text-slate-700 select-none">
                  <input
                    type="checkbox"
                    checked={agreedTerms}
                    onChange={(e) => setAgreedTerms(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded text-amber-600 focus:ring-amber-500 border-slate-300"
                  />
                  <span>
                    أوافق على شروط وسياسات منظومة «طلبات البيت» والالتزام بجودة المأكولات والتسعير المعتمد.
                  </span>
                </label>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
            {step > 1 ? (
              <button
                type="button"
                onClick={() => setStep((prev) => (prev - 1) as any)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 font-bold text-xs flex items-center gap-1.5"
              >
                <ArrowRight className="w-4 h-4" />
                <span>السابق</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onGoToLogin}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 font-bold text-xs"
              >
                لديك حساب بالفعل؟ تسجيل الدخول
              </button>
            )}

            {step < 4 ? (
              <button
                type="button"
                onClick={handleNext}
                className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-xl text-xs flex items-center gap-1.5 shadow-md shadow-amber-500/20"
              >
                <span>التالي</span>
                <ArrowLeft className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl text-xs flex items-center gap-1.5 shadow-md shadow-emerald-600/25"
              >
                <CheckCircle className="w-4 h-4" />
                <span>إرسال طلب التسجيل للمراجعة</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
