import React, { useState, useEffect } from 'react';
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
  ShieldCheck,
  Building,
  Loader2,
  Tag,
  ShieldAlert,
  AlertTriangle,
  Info,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import {
  fetchGovernorates,
  fetchCenters,
  fetchAreas,
  fetchRestaurantCategories,
} from '../../services/geographicService';
import {
  FoodGovernorate,
  FoodCenter,
  FoodArea,
  RestaurantCategory,
  CreateRestaurantPayload,
} from '../../types/database';

interface RegisterPageProps {
  onGoToLogin: () => void;
  onRegisteredSuccess: () => void;
}

export const RegisterPage: React.FC<RegisterPageProps> = ({
  onGoToLogin,
  onRegisteredSuccess,
}) => {
  const {
    user,
    isAuthenticated,
    signUp,
    registerRestaurantReal,
    isSupabaseReady,
  } = useApp();

  const [step, setStep] = useState<1 | 2 | 3 | 4>(isAuthenticated ? 2 : 1);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // RLS Blocker feedback state
  const [rlsBlockedInfo, setRlsBlockedInfo] = useState<{
    blocked: boolean;
    error?: string;
    details?: string;
    requiredPath?: string;
  } | null>(null);

  // Step 1: Owner Info (Supabase Auth)
  const [ownerName, setOwnerName] = useState(user?.user_metadata?.full_name || '');
  const [ownerPhone, setOwnerPhone] = useState(user?.user_metadata?.phone || '');
  const [ownerEmail, setOwnerEmail] = useState(user?.email || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [emailConfirmationRequired, setEmailConfirmationRequired] = useState(false);

  // Step 2: Restaurant Info (Dynamic Geographic Tables from Supabase)
  const [restaurantName, setRestaurantName] = useState('');
  const [restaurantDesc, setRestaurantDesc] = useState('');
  const [restaurantPhone, setRestaurantPhone] = useState('');
  const [detailedAddress, setDetailedAddress] = useState('');
  const [logoUrl, setLogoUrl] = useState('https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&auto=format&fit=crop&q=80');
  const [latitude, setLatitude] = useState(31.0409);
  const [longitude, setLongitude] = useState(31.3785);

  // Dynamic Geographic state
  const [governorates, setGovernorates] = useState<FoodGovernorate[]>([]);
  const [centers, setCenters] = useState<FoodCenter[]>([]);
  const [areas, setAreas] = useState<FoodArea[]>([]);
  const [categories, setCategories] = useState<RestaurantCategory[]>([]);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<(string | number)[]>([]);

  const [selectedGovId, setSelectedGovId] = useState<string | number>('');
  const [selectedCenterId, setSelectedCenterId] = useState<string | number>('');
  const [selectedAreaId, setSelectedAreaId] = useState<string | number>('');

  const [loadingGovs, setLoadingGovs] = useState(false);
  const [loadingCenters, setLoadingCenters] = useState(false);
  const [loadingAreas, setLoadingAreas] = useState(false);

  // Step 3 & 4: Agreements
  const [agreedTerms, setAgreedTerms] = useState(false);
  const [agreedCommission, setAgreedCommission] = useState(false);

  // Load Governorates and Categories from Supabase on mount
  useEffect(() => {
    let isMounted = true;

    async function loadInitialData() {
      setLoadingGovs(true);
      const [govsRes, catsRes] = await Promise.all([
        fetchGovernorates(),
        fetchRestaurantCategories(),
      ]);

      if (isMounted) {
        if (govsRes.data.length > 0) {
          setGovernorates(govsRes.data);
          setSelectedGovId(govsRes.data[0].id);
        } else if (govsRes.error) {
          console.warn('Governorates fetch message:', govsRes.error);
        }

        if (catsRes.data.length > 0) {
          setCategories(catsRes.data);
          setSelectedCategoryIds([catsRes.data[0].id]);
        }
        setLoadingGovs(false);
      }
    }

    loadInitialData();

    return () => {
      isMounted = false;
    };
  }, []);

  // When Governorates change, fetch sequential Centers from food_centers
  useEffect(() => {
    let isMounted = true;
    if (!selectedGovId) {
      setCenters([]);
      setSelectedCenterId('');
      setAreas([]);
      setSelectedAreaId('');
      return;
    }

    async function loadCenters() {
      setLoadingCenters(true);
      const res = await fetchCenters(selectedGovId);
      if (isMounted) {
        setCenters(res.data);
        if (res.data.length > 0) {
          setSelectedCenterId(res.data[0].id);
        } else {
          setSelectedCenterId('');
          setAreas([]);
          setSelectedAreaId('');
        }
        setLoadingCenters(false);
      }
    }

    loadCenters();

    return () => {
      isMounted = false;
    };
  }, [selectedGovId]);

  // When Center changes, fetch sequential Areas from food_areas
  useEffect(() => {
    let isMounted = true;
    if (!selectedCenterId) {
      setAreas([]);
      setSelectedAreaId('');
      return;
    }

    async function loadAreas() {
      setLoadingAreas(true);
      const res = await fetchAreas(selectedCenterId);
      if (isMounted) {
        setAreas(res.data);
        if (res.data.length > 0) {
          setSelectedAreaId(res.data[0].id);
        } else {
          setSelectedAreaId('');
        }
        setLoadingAreas(false);
      }
    }

    loadAreas();

    return () => {
      isMounted = false;
    };
  }, [selectedCenterId]);

  const toggleCategory = (catId: string | number) => {
    if (selectedCategoryIds.includes(catId)) {
      setSelectedCategoryIds(selectedCategoryIds.filter((id) => id !== catId));
    } else {
      setSelectedCategoryIds([...selectedCategoryIds, catId]);
    }
  };

  const validateStep1 = () => {
    if (!ownerName.trim()) return 'يرجى إدخال اسم صاحب المطعم بالكامل.';
    if (!ownerPhone.trim() || ownerPhone.length < 11)
      return 'يرجى إدخال رقم هاتف صحيح لصاحب المطعم (11 رقمًا).';
    if (!ownerEmail.trim() || !ownerEmail.includes('@'))
      return 'يرجى إدخال بريد إلكتروني صالح.';
    if (!password || password.length < 6)
      return 'كلمة المرور يجب ألا تقل عن 6 خانات.';
    if (password !== confirmPassword) return 'كلمتا المرور غير متطابقتين.';
    return null;
  };

  const validateStep2 = () => {
    if (!restaurantName.trim()) return 'يرجى إدخال اسم المطعم التجاري.';
    if (!restaurantDesc.trim()) return 'يرجى كتابة نبذة مختصرة عن المطعم.';
    if (!restaurantPhone.trim()) return 'يرجى إدخال رقم هاتف المطعم لاستقبال الاتصالات.';
    if (!selectedGovId) return 'يرجى اختيار المحافظة المعتمدة من القائمة.';
    if (!selectedCenterId && centers.length > 0) return 'يرجى اختيار المركز أو المدينة التابعة.';
    if (!detailedAddress.trim()) return 'يرجى كتابة العنوان التفصيلي بدقة.';
    return null;
  };

  const handleNext = async () => {
    setErrorMsg('');
    if (step === 1) {
      const err = validateStep1();
      if (err) {
        setErrorMsg(err);
        return;
      }

      // If user is not yet logged in, create Auth account in Supabase
      if (!isAuthenticated) {
        setIsSubmitting(true);
        const res = await signUp(ownerEmail, password, ownerName, ownerPhone);
        setIsSubmitting(false);

        if (!res.success) {
          setErrorMsg(res.error || 'فشل إنشاء حساب المالك في Supabase.');
          return;
        }

        if (res.requiresEmailConfirmation) {
          setEmailConfirmationRequired(true);
          return;
        }
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setRlsBlockedInfo(null);

    if (!agreedTerms || !agreedCommission) {
      setErrorMsg('يجب الموافقة على الشروط العامة ونسبة العمولة الإدارية لإرسال الطلب.');
      return;
    }

    if (!user) {
      setErrorMsg('انتهت الجلسة أو تعذر التعرف على هوية المستخدم. يرجى تسجيل الدخول أولاً.');
      return;
    }

    setIsSubmitting(true);

    const payload: CreateRestaurantPayload = {
      owner_user_id: user.id, // auth.uid()
      name: restaurantName.trim(),
      description: restaurantDesc.trim(),
      phone: restaurantPhone.trim(),
      address: detailedAddress.trim(),
      latitude,
      longitude,
      governorate_id: selectedGovId,
      center_id: selectedCenterId,
      area_id: selectedAreaId || null,
      logo_url: logoUrl.trim() || undefined,
      category_ids: selectedCategoryIds,
    };

    try {
      const result = await registerRestaurantReal(payload);
      setIsSubmitting(false);

      if (result.blockedByRls) {
        // Handle documented RLS Block policy rule
        setRlsBlockedInfo({
          blocked: true,
          error: result.error,
          details: result.details,
          requiredPath: result.requiredPath,
        });
        return;
      }

      if (result.success && result.restaurant) {
        onRegisteredSuccess();
      } else {
        setErrorMsg(result.error || 'تعذر إرسال طلب تسجيل المطعم.');
      }
    } catch (err: any) {
      setIsSubmitting(false);
      setErrorMsg(err?.message || 'حدث خطأ غير متوقع أثناء إرسال طلب التسجيل.');
    }
  };

  const selectedGovName = governorates.find((g) => String(g.id) === String(selectedGovId))?.name || '';
  const selectedCenterName = centers.find((c) => String(c.id) === String(selectedCenterId))?.name || '';
  const selectedAreaName = areas.find((a) => String(a.id) === String(selectedAreaId))?.name || '';

  return (
    <div className="min-h-screen bg-slate-900 py-8 px-4 sm:px-6 lg:px-8 flex items-center justify-center font-['Cairo',sans-serif]">
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
            منظومة «طلبات البيت» — ربط المطعم بقاعدة بيانات Supabase الموحدة
          </p>
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
              <span>حساب المالك</span>
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
              <span>نطاق الخدمة</span>
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

          {/* Email Confirmation Notice */}
          {emailConfirmationRequired && (
            <div className="mb-5 p-4 bg-emerald-50 border border-emerald-300 rounded-2xl text-emerald-900 text-xs space-y-2">
              <div className="flex items-center gap-2 font-bold text-emerald-800">
                <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>تم إنشاء حساب المالك بنجاح في Supabase Auth!</span>
              </div>
              <p className="leading-relaxed text-slate-700">
                أرسل نظام Supabase رابط تأكيد إلى بريدك الإلكتروني <strong>{ownerEmail}</strong>. يرجى تأكيد البريد أولاً لتفعيل الجلسة واستكمال تسجيل المطعم.
              </p>
              <div className="pt-2 flex items-center gap-3">
                <button
                  type="button"
                  onClick={onGoToLogin}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-xl font-bold text-xs"
                >
                  الذهاب لتسجيل الدخول بعد التأكيد
                </button>
              </div>
            </div>
          )}

          {/* RLS Block Policy Notice (Requirement 4) */}
          {rlsBlockedInfo && (
            <div className="mb-5 p-4 bg-amber-50 border-2 border-amber-400 rounded-2xl text-amber-950 text-xs space-y-3">
              <div className="flex items-start gap-2.5">
                <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-black text-amber-900 text-sm">
                    تنبيه أمني: عملية إنشاء المطعم موقوفة بسبب سياسات RLS
                  </h4>
                  <p className="text-amber-800 mt-1 leading-relaxed">
                    {rlsBlockedInfo.details}
                  </p>
                </div>
              </div>

              <div className="p-3 bg-white/90 rounded-xl border border-amber-200 text-[11px] space-y-1">
                <span className="font-bold text-slate-900 block">
                  المسار المعتمد المطلوب تفعيله في قاعدة البيانات:
                </span>
                <p className="text-slate-700 font-mono text-[10px] leading-relaxed">
                  {rlsBlockedInfo.requiredPath}
                </p>
              </div>

              <p className="text-[11px] text-amber-800 font-medium">
                * التزامًا بالقواعد، لن يتم إظهار نجاح زائف أو استخدام مفاتيح سرية في الواجهة. يمكنك التواصل مع مسؤول النظام لاعتماد الصلاحيات.
              </p>
            </div>
          )}

          {/* STEP 1: OWNER (Supabase Auth) */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="border-b border-slate-100 pb-2 mb-3">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <User className="w-4 h-4 text-amber-600" />
                  حساب مدير ومالك المطعم (Supabase Auth)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  سيتم إنشاء هذا الحساب رسميًا في مصادقة Supabase لربطه بالمطعم عبر <code className="font-mono text-amber-700">owner_user_id</code>.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  الاسم الكامل لمالك المطعم *
                </label>
                <input
                  type="text"
                  required
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  placeholder="مثال: أحمد محمد النحاس"
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
                    required
                    value={ownerPhone}
                    onChange={(e) => setOwnerPhone(e.target.value)}
                    placeholder="01012345678"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-left dir-ltr focus:ring-2 focus:ring-amber-500 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    البريد الإلكتروني للتسجيل *
                  </label>
                  <input
                    type="email"
                    required
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
                    required
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
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-left dir-ltr focus:ring-2 focus:ring-amber-500 focus:bg-white"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: RESTAURANT INFO & SEQUENTIAL GEOGRAPHY */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="border-b border-slate-100 pb-2 mb-3">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <Building className="w-4 h-4 text-amber-600" />
                  بيانات المطعم والموقع والمناطق الجغرافية الفعلية
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  يتم جلب المحافظات والمراكز والمناطق مباشرة من جداول <code className="font-mono text-amber-700">food_governorates</code> و <code className="font-mono text-amber-700">food_centers</code> و <code className="font-mono text-amber-700">food_areas</code>.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    اسم المطعم التجاري *
                  </label>
                  <input
                    type="text"
                    required
                    value={restaurantName}
                    onChange={(e) => setRestaurantName(e.target.value)}
                    placeholder="مثال: مشويات واحة النحاس"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-amber-500 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    هاتف المطعم لاستقبال الزبائن *
                  </label>
                  <input
                    type="tel"
                    required
                    value={restaurantPhone}
                    onChange={(e) => setRestaurantPhone(e.target.value)}
                    placeholder="01223456789"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-left dir-ltr focus:ring-2 focus:ring-amber-500 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  نبذة ووصف المطعم *
                </label>
                <textarea
                  rows={2}
                  required
                  value={restaurantDesc}
                  onChange={(e) => setRestaurantDesc(e.target.value)}
                  placeholder="مشويات وطواجن فخار وسلطات ومشروبات طازجة..."
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-amber-500 focus:bg-white"
                />
              </div>

              {/* Sequential Dynamic Geographic Dropdowns */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                <span className="text-xs font-bold text-slate-800 block">
                  نطاق الخدمة الجغرافي المعتمد:
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Governorate */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      المحافظة (food_governorates) *
                    </label>
                    <select
                      value={selectedGovId}
                      onChange={(e) => setSelectedGovId(e.target.value)}
                      disabled={loadingGovs}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-amber-500"
                    >
                      {governorates.length === 0 ? (
                        <option value="">لا توجد محافظات</option>
                      ) : (
                        governorates.map((g) => (
                          <option key={g.id} value={g.id}>
                            {g.name}
                          </option>
                        ))
                      )}
                    </select>
                  </div>

                  {/* Center */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      المركز / المدينة (food_centers) *
                    </label>
                    <select
                      value={selectedCenterId}
                      onChange={(e) => setSelectedCenterId(e.target.value)}
                      disabled={loadingCenters || centers.length === 0}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-amber-500"
                    >
                      {centers.length === 0 ? (
                        <option value="">
                          {loadingCenters ? 'جاري التحميل...' : 'اختر المحافظة أولاً'}
                        </option>
                      ) : (
                        centers.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))
                      )}
                    </select>
                  </div>

                  {/* Area */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      المنطقة / الحي (food_areas)
                    </label>
                    <select
                      value={selectedAreaId}
                      onChange={(e) => setSelectedAreaId(e.target.value)}
                      disabled={loadingAreas || areas.length === 0}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-amber-500"
                    >
                      {areas.length === 0 ? (
                        <option value="">
                          {loadingAreas ? 'جاري التحميل...' : 'المركز بأكمله أو غير محدد'}
                        </option>
                      ) : (
                        areas.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.name}
                          </option>
                        ))
                      )}
                    </select>
                  </div>
                </div>
              </div>

              {/* Restaurant Categories from restaurant_categories */}
              {categories.length > 0 && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-amber-600" />
                    <span>تصنيفات المطعم (restaurant_categories):</span>
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {categories.map((cat) => {
                      const isSelected = selectedCategoryIds.includes(cat.id);
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => toggleCategory(cat.id)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                            isSelected
                              ? 'bg-amber-500 text-slate-950 border-amber-600 shadow-2xs'
                              : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {cat.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  العنوان التفصيلي وأقرب علامة مميزة *
                </label>
                <input
                  type="text"
                  required
                  value={detailedAddress}
                  onChange={(e) => setDetailedAddress(e.target.value)}
                  placeholder="اسم الشارع، رقم العقار، بجوار علامة مميزة"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-amber-500 focus:bg-white"
                />
              </div>

              {/* Interactive Coordinates Pin */}
              <div className="p-3.5 bg-amber-50/50 rounded-2xl border border-amber-200/80">
                <div className="flex items-center justify-between mb-2 text-xs">
                  <span className="font-bold text-slate-800 flex items-center gap-1.5">
                    <Compass className="w-4 h-4 text-amber-600" />
                    <span>إحداثيات موقع المطعم (latitude, longitude):</span>
                  </span>
                  <span className="font-mono text-slate-500 text-[11px]">
                    {latitude.toFixed(4)}, {longitude.toFixed(4)}
                  </span>
                </div>

                <div
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const xPercent = (e.clientX - rect.left) / rect.width;
                    const yPercent = (e.clientY - rect.top) / rect.height;
                    setLatitude(31.0 + yPercent * 0.1);
                    setLongitude(31.3 + xPercent * 0.15);
                  }}
                  className="relative h-28 bg-gradient-to-tr from-slate-200 via-amber-100 to-emerald-100 rounded-xl overflow-hidden cursor-crosshair border border-slate-300 flex items-center justify-center select-none"
                  title="انقر لتعديل إحداثيات الموقع"
                >
                  <div className="text-center text-[11px] text-slate-600 z-10 bg-white/75 backdrop-blur-xs px-3 py-1 rounded-full shadow-2xs">
                    انقر على الخريطة لتثبيت إحداثيات المطعم
                  </div>
                  <div className="absolute transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center pointer-events-none">
                    <div className="p-1.5 bg-rose-600 text-white rounded-full shadow-lg ring-4 ring-rose-200">
                      <MapPin className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: SCOPE & POLICIES */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="border-b border-slate-100 pb-2 mb-3">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-amber-600" />
                  قواعد التشغيل ونطاق الخدمة الجغرافي
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  يتم اعتماد الخدمة بناءً على النطاق الجغرافي الرسمي وليس قياس الكيلومترات التجريبي.
                </p>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2 text-xs">
                <span className="font-bold text-slate-800 block">نطاق التغطية المحدد لمطعمك:</span>
                <p className="text-slate-700 leading-relaxed">
                  • <strong>المحافظة:</strong> {selectedGovName || 'غير محدد'}
                </p>
                <p className="text-slate-700 leading-relaxed">
                  • <strong>المركز أو المدينة:</strong> {selectedCenterName || 'غير محدد'}
                </p>
                <p className="text-slate-700 leading-relaxed">
                  • <strong>المنطقة المخصصة:</strong> {selectedAreaName || 'المركز بالكامل'}
                </p>
              </div>

              <div className="p-4 bg-amber-50/80 rounded-2xl border border-amber-200 text-slate-800 space-y-2 text-xs">
                <div className="flex items-center gap-2 font-bold text-amber-900">
                  <Info className="w-4 h-4 text-amber-700" />
                  <span>السياسات الإدارية المعتمدة للعمولة والتوصيل</span>
                </div>
                <p className="leading-relaxed text-slate-700">
                  • يتم تحديد نسبة العمولة ورسوم التوصيل مركزيًا من قِبل إدارة «طلبات البيت» ولا يتم تثبيت قيم افتراضية غير حقيقية.
                </p>
                <p className="leading-relaxed text-slate-700">
                  • عمولة الإدارة تُحتسب حصريًا على صافي قيمة الطعام بعد الخصم المعتمد، ولا يُحتسب أي عمولة على رسوم التوصيل.
                </p>
              </div>
            </div>
          )}

          {/* STEP 4: REVIEW & SUBMIT */}
          {step === 4 && (
            <div className="space-y-4">
              <div className="border-b border-slate-100 pb-2 mb-3">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-amber-600" />
                  مراجعة الطلب والموافقة
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  تأكد من صحة البيانات قبل إرسال طلب التسجيل لقاعدة البيانات.
                </p>
              </div>

              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-2.5 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-500">حساب المالك (auth.uid):</span>
                  <span className="font-mono text-slate-900 text-[11px] truncate max-w-xs">
                    {user?.id || 'جاري الإنشاء'}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-500">اسم المطعم:</span>
                  <span className="font-bold text-slate-900">{restaurantName}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-500">النطاق الجغرافي:</span>
                  <span className="font-bold text-amber-700">
                    {selectedGovName} — {selectedCenterName} {selectedAreaName ? `(${selectedAreaName})` : ''}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-500">العنوان:</span>
                  <span className="text-slate-800">{detailedAddress}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-500">هاتف المطعم:</span>
                  <span className="font-mono text-slate-800">{restaurantPhone}</span>
                </div>
              </div>

              {/* Checkboxes */}
              <div className="space-y-2.5 pt-2 text-xs">
                <label className="flex items-start gap-2.5 cursor-pointer text-slate-700 select-none">
                  <input
                    type="checkbox"
                    checked={agreedCommission}
                    onChange={(e) => setAgreedCommission(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded text-amber-600 focus:ring-amber-500 border-slate-300"
                  />
                  <span>
                    أقر بموافقتي على سياسات العمولة والتسوية المعتمدة من إدارة طلبات البيت.
                  </span>
                </label>

                <label className="flex items-start gap-2.5 cursor-pointer text-slate-700 select-none">
                  <input
                    type="checkbox"
                    checked={agreedTerms}
                    onChange={(e) => setAgreedTerms(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded text-amber-600 focus:ring-amber-500 border-slate-300"
                  />
                  <span>
                    أوافق على الشروط والالتزام بجودة المأكولات ومعايير السلامة الصحية.
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
                disabled={isSubmitting}
                onClick={handleNext}
                className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-xl text-xs flex items-center gap-1.5 shadow-md shadow-amber-500/20 disabled:opacity-60"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>جاري المعالجة...</span>
                  </>
                ) : (
                  <>
                    <span>التالي</span>
                    <ArrowLeft className="w-4 h-4" />
                  </>
                )}
              </button>
            ) : (
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleSubmit}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl text-xs flex items-center gap-1.5 shadow-md shadow-emerald-600/25 disabled:opacity-60"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>جاري إرسال الطلب...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    <span>إرسال طلب تسجيل المطعم</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
