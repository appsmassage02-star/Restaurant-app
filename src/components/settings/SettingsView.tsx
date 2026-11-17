import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Settings,
  Store,
  MapPin,
  Clock,
  Save,
  CheckCircle,
  Lock,
  AlertCircle,
  Loader2,
  RefreshCw,
  Truck,
  Compass,
  ShieldCheck,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import {
  fetchRestaurantCentralTariffs,
  fetchSectionSettings,
  CentralDeliveryTariffItem,
  RestaurantSectionSettings,
} from '../../services/deliveryAreaService';
import { verifyPointInGeoBoundary } from '../../services/geographicService';

export const SettingsView: React.FC = () => {
  const {
    restaurant,
    updateRestaurantSettingsDb,
    updateRestaurantDeliveryEnabled,
    dbRestaurant,
    refreshRestaurant,
  } = useApp();

  // Basic Commercial Info (no delivery_fee or max_delivery_radius_km)
  const [name, setName] = useState(restaurant.name);
  const [description, setDescription] = useState(restaurant.description);
  const [phone, setPhone] = useState(restaurant.phone);
  const [address, setAddress] = useState(restaurant.address);
  const [logo, setLogo] = useState(restaurant.logo);
  const [openingHours, setOpeningHours] = useState(restaurant.openingHours);
  const [holidays, setHolidays] = useState(restaurant.holidays);
  const [isOpen, setIsOpen] = useState(restaurant.isOpen);
  const [isTogglingDelivery, setIsTogglingDelivery] = useState(false);

  // Read-only Central Tariffs (from delivery_area_tariffs)
  const [centralTariffs, setCentralTariffs] = useState<CentralDeliveryTariffItem[]>([]);
  const [tariffsError, setTariffsError] = useState<string | null>(null);
  const [loadingTariffs, setLoadingTariffs] = useState(false);

  // Central section settings (Read-only from restaurant_section_settings)
  const [sectionSettings, setSectionSettings] = useState<RestaurantSectionSettings | null>(null);
  const [sectionSettingsError, setSectionSettingsError] = useState<string | null>(null);

  // Feedback
  const [isSavingBasic, setIsSavingBasic] = useState(false);
  const [isTogglingOpen, setIsTogglingOpen] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Sync state with restaurant changes
  useEffect(() => {
    setName(restaurant.name);
    setDescription(restaurant.description);
    setPhone(restaurant.phone);
    setAddress(restaurant.address);
    setLogo(restaurant.logo);
    setOpeningHours(restaurant.openingHours);
    setHolidays(restaurant.holidays);
    setIsOpen(restaurant.isOpen);
  }, [restaurant]);

  // Verify restaurant coordinates against geo_* boundaries when present
  const locationBoundaryStatus = useMemo(() => {
    if (
      restaurant.latitude === null ||
      restaurant.longitude === null ||
      !dbRestaurant
    ) {
      return null;
    }
    return verifyPointInGeoBoundary(restaurant.latitude, restaurant.longitude, {
      area: dbRestaurant.area || null,
      center: dbRestaurant.center || null,
      governorate: dbRestaurant.governorate || null,
    });
  }, [restaurant.latitude, restaurant.longitude, dbRestaurant]);

  // Load Read-Only Central Coverage & Tariffs and Section Settings
  const loadCentralDeliveryData = useCallback(async () => {
    if (!restaurant.id) return;
    setLoadingTariffs(true);
    setTariffsError(null);
    setSectionSettingsError(null);
    try {
      const [tariffsRes, secRes] = await Promise.all([
        fetchRestaurantCentralTariffs(restaurant.id),
        fetchSectionSettings(),
      ]);

      if (tariffsRes.error) {
        setTariffsError(tariffsRes.error);
        setCentralTariffs([]);
      } else if (tariffsRes.data) {
        setCentralTariffs(tariffsRes.data);
      }

      if (secRes.error) {
        setSectionSettingsError(secRes.error);
        setSectionSettings(null);
      } else {
        setSectionSettings(secRes.data);
      }
    } catch (err: any) {
      setTariffsError(err?.message || 'تعذر جلب التغطية والتسعير المركزي.');
    } finally {
      setLoadingTariffs(false);
    }
  }, [restaurant.id]);

  useEffect(() => {
    loadCentralDeliveryData();
  }, [loadCentralDeliveryData]);

  // Quick Open/Close Toggle
  const handleToggleOpen = async () => {
    setErrorMessage(null);
    setSaveSuccess(null);
    setIsTogglingOpen(true);
    const nextState = !isOpen;

    const res = await updateRestaurantSettingsDb({
      is_open: nextState,
    });

    if (!res.success) {
      setErrorMessage(res.error || 'فشل تحديث حالة استقبال الطلبات في قاعدة البيانات.');
    } else {
      setIsOpen(nextState);
      setSaveSuccess(
        nextState
          ? 'تم فتح المطعم لاستقبال طلبات الزبائن بنجاح في قاعدة البيانات.'
          : 'تم إغلاق المطعم مؤقتًا بنجاح.'
      );
      setTimeout(() => setSaveSuccess(null), 4000);
    }
    setIsTogglingOpen(false);
  };

  // Toggle Restaurant Delivery Availability (restaurant_delivery_enabled)
  const handleToggleDeliveryEnabled = async () => {
    setErrorMessage(null);
    setSaveSuccess(null);
    setIsTogglingDelivery(true);
    const nextState = !restaurant.restaurantDeliveryEnabled;

    const res = await updateRestaurantDeliveryEnabled(nextState);

    if (!res.success) {
      setErrorMessage(res.error || 'فشل تحديث إعداد دليفري المطعم في قاعدة البيانات.');
    } else {
      setSaveSuccess(
        nextState
          ? 'تم تفعيل خيار «دليفري المطعم متاح» بنجاح في قاعدة البيانات. يمكنك الآن اختيار التوصيل الذاتي عند قبول الطلبات.'
          : 'تم تعطيل «دليفري المطعم». سيقتصر قبول الطلبات على مسار دليفري طلباتي (كباتن المنظومة).'
      );
      setTimeout(() => setSaveSuccess(null), 4500);
    }
    setIsTogglingDelivery(false);
  };

  // Save Basic Commercial Info to Supabase (strictly without delivery_fee or max_delivery_radius_km)
  const handleSaveBasic = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSaveSuccess(null);
    setIsSavingBasic(true);

    const res = await updateRestaurantSettingsDb({
      name,
      description,
      phone,
      address,
      is_open: isOpen,
    });

    if (!res.success) {
      setErrorMessage(res.error || 'فشل حفظ الإعدادات في قاعدة البيانات.');
    } else {
      setSaveSuccess('تم حفظ وتحديث بيانات المطعم التجارية بنجاح في قاعدة البيانات!');
      setTimeout(() => setSaveSuccess(null), 4000);
      refreshRestaurant();
    }
    setIsSavingBasic(false);
  };

  return (
    <div className="space-y-6 max-w-4xl text-right">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
            <Settings className="w-5 h-5 text-amber-500" />
            إعدادات المطعم والموقع والتغطية المركزية
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            ضبط حالة التشغيل والبيانات التجارية للمطعم، والاطلاع على مناطق التغطية والتسعير المعينة مركزيًا
          </p>
        </div>

        <button
          onClick={() => {
            loadCentralDeliveryData();
            refreshRestaurant();
          }}
          disabled={loadingTariffs}
          className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loadingTariffs ? 'animate-spin text-amber-600' : ''}`} />
          <span>تحديث من السحابة</span>
        </button>
      </div>

      {/* Success Feedback Banner */}
      {saveSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between gap-2 text-emerald-800 text-xs font-bold">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{saveSuccess}</span>
          </div>
          <button onClick={() => setSaveSuccess(null)} className="text-emerald-500 font-normal">
            إغلاق
          </button>
        </div>
      )}

      {/* Error Feedback Banner */}
      {errorMessage && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center justify-between gap-2 text-rose-700 text-xs font-bold leading-relaxed">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage(null)} className="text-rose-500 font-normal">
            إغلاق
          </button>
        </div>
      )}

      {/* 1. Open / Close Switch Card */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span
              className={`w-3 h-3 rounded-full ${
                isOpen ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
              }`}
            />
            <h3 className="text-sm font-bold text-slate-900">
              حالة استقبال الطلبات للزبائن: {isOpen ? 'مفتوح للطلب الآن' : 'مغلق مؤقتًا'}
            </h3>
          </div>
          <p className="text-slate-500 text-xs leading-relaxed max-w-xl">
            يتم تحديث حقل is_open في جدول restaurants فورًا، وإغلاق المطعم يمنع تلقي طلبات جديدة في تطبيق الزبائن.
          </p>
        </div>

        <button
          type="button"
          disabled={isTogglingOpen}
          onClick={handleToggleOpen}
          className={`px-5 py-2.5 rounded-xl font-bold text-xs transition-all shadow-xs shrink-0 cursor-pointer disabled:opacity-60 flex items-center gap-1.5 ${
            isOpen
              ? 'bg-rose-100 text-rose-700 hover:bg-rose-200 border border-rose-300'
              : 'bg-emerald-600 text-white hover:bg-emerald-700'
          }`}
        >
          {isTogglingOpen ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>جارٍ التحديث...</span>
            </>
          ) : isOpen ? (
            'إغلاق المطعم مؤقتًا'
          ) : (
            'فتح المطعم لاستقبال الزبائن'
          )}
        </button>
      </div>

      {/* 1.5 Restaurant Self Delivery Toggle Card */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Truck className="w-4 h-4 text-amber-600" />
            <span
              className={`w-3 h-3 rounded-full ${
                restaurant.restaurantDeliveryEnabled ? 'bg-emerald-500' : 'bg-slate-400'
              }`}
            />
            <h3 className="text-sm font-bold text-slate-900">
              دليفري المطعم: {restaurant.restaurantDeliveryEnabled ? 'متاح ونشط' : 'معطل'}
            </h3>
          </div>
          <p className="text-slate-500 text-xs leading-relaxed max-w-xl">
            يتحكم في إمكانية اختيار مسار «توصيل المطعم» عند قبول الطلبات الواردة عبر RPC المعتمد{' '}
            <code className="text-[11px] font-mono text-amber-800 bg-amber-50 px-1 py-0.5 rounded">
              restaurant_set_delivery_enabled
            </code>
            . إذا كان معطلاً، لن يُسمح للمطعم باختيار مسار التوصيل الذاتي وسيقتصر القبول على دليفري طلباتي.
          </p>
        </div>

        <button
          type="button"
          disabled={isTogglingDelivery}
          onClick={handleToggleDeliveryEnabled}
          className={`px-5 py-2.5 rounded-xl font-bold text-xs transition-all shadow-xs shrink-0 cursor-pointer disabled:opacity-60 flex items-center gap-1.5 ${
            restaurant.restaurantDeliveryEnabled
              ? 'bg-amber-100 text-amber-900 hover:bg-amber-200 border border-amber-300'
              : 'bg-slate-900 text-white hover:bg-slate-800'
          }`}
        >
          {isTogglingDelivery ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>جارٍ التحديث...</span>
            </>
          ) : restaurant.restaurantDeliveryEnabled ? (
            'تعطيل دليفري المطعم'
          ) : (
            'تفعيل دليفري المطعم'
          )}
        </button>
      </div>

      {/* 2. Read-Only Central Coverage & Tariffs + Restaurant Geographic Location */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-amber-600" />
              نطاق التغطية والتسعير المركزي للمطعم (للقراءة فقط)
            </h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              تُدار التغطية الجغرافية ورسوم التوصيل مركزيًا بالكامل من لوحة الإدارة عبر جدول التسعير المركزي{' '}
              <code className="font-mono text-[11px] bg-slate-100 px-1 py-0.5 rounded text-slate-700">
                delivery_area_tariffs
              </code>
              ، ولا يُسمح بتعديلها أو إضافة نطاقات محلية من تطبيق المطعم.
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200 text-[11px] font-bold shrink-0 w-fit">
            <Lock className="w-3.5 h-3.5 text-amber-600" />
            <span>للعرض فقط — إدارة مركزية</span>
          </span>
        </div>

        {/* Registered Restaurant Geo Location Summary */}
        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2.5 text-xs">
          <div className="flex items-center justify-between gap-2">
            <span className="font-bold text-slate-800 flex items-center gap-1.5">
              <Compass className="w-4 h-4 text-amber-600" />
              الموقع الجغرافي المسجل للمطعم:
            </span>
            {locationBoundaryStatus?.hasBoundary && (
              <span
                className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                  locationBoundaryStatus.valid
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                    : 'bg-rose-100 text-rose-800 border border-rose-200'
                }`}
              >
                {locationBoundaryStatus.valid ? 'داخل الحدود المعتمدة' : 'خارج الحدود المعتمدة'}
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div className="bg-white p-2.5 rounded-xl border border-slate-200">
              <span className="text-[10px] text-slate-400 block">المحافظة:</span>
              <span className="font-bold text-slate-800">{restaurant.governorate || 'غير محدد'}</span>
            </div>
            <div className="bg-white p-2.5 rounded-xl border border-slate-200">
              <span className="text-[10px] text-slate-400 block">المركز / المدينة:</span>
              <span className="font-bold text-slate-800">{restaurant.city || 'غير محدد'}</span>
            </div>
            <div className="bg-white p-2.5 rounded-xl border border-slate-200">
              <span className="text-[10px] text-slate-400 block">الحي / المنطقة:</span>
              <span className="font-bold text-slate-800">{restaurant.area || 'المركز بالكامل'}</span>
            </div>
          </div>

          <div className="text-[11px] text-slate-600 flex flex-wrap items-center justify-between gap-2 pt-1">
            <span>
              إحداثيات GPS:{' '}
              <strong className="font-mono dir-ltr inline-block text-slate-800">
                {restaurant.latitude !== null && restaurant.longitude !== null
                  ? `${restaurant.latitude.toFixed(6)}, ${restaurant.longitude.toFixed(6)}`
                  : 'غير مسجلة'}
              </strong>
            </span>
          </div>
        </div>

        {/* Central Tariffs Error Notice */}
        {tariffsError && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-2.5 text-xs text-amber-900">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold">تعذر قراءة جدول التسعير والتغطية المركزي</p>
              <p className="text-[11px] text-amber-800 leading-relaxed">{tariffsError}</p>
            </div>
          </div>
        )}

        {/* Central Tariffs Read-Only List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-800">
              مناطق وتسعيرات توصيل المطعم المعتمدة مركزيًا ({centralTariffs.length}):
            </h4>
            {loadingTariffs && (
              <span className="text-[11px] text-amber-600 flex items-center gap-1 font-bold">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                جاري الجلب من الإدارة المركزية...
              </span>
            )}
          </div>

          {!tariffsError && centralTariffs.length === 0 ? (
            <div className="p-6 bg-slate-50 border border-dashed border-slate-200 rounded-2xl text-center text-xs text-slate-500 space-y-1">
              <p className="font-bold text-slate-700">
                لا توجد تسعيرات مخصصة لتوصيل المطعم مسجلة حاليًا في النظام المركزي.
              </p>
              <p className="text-[11px] text-slate-400">
                يتم احتساب التغطية ورسوم التوصيل لكل طلب تلقائيًا عند إنشاء الطلب وفق التسعير المركزي في لوحة الإدارة.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden bg-white">
              {centralTariffs.map((item) => {
                const scopeLabel =
                  item.resolved_scope_level === 'area'
                    ? 'مستوى المنطقة'
                    : item.resolved_scope_level === 'center'
                    ? 'مستوى المركز'
                    : 'مستوى المحافظة';

                return (
                  <div
                    key={item.id}
                    className="p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`w-2.5 h-2.5 rounded-full ${
                            item.is_enabled ? 'bg-emerald-500' : 'bg-slate-300'
                          }`}
                        />
                        <span className="font-bold text-slate-900">{item.area_name}</span>
                        <span className="text-slate-400 text-[11px]">
                          ({item.center_name} - {item.governorate_name})
                        </span>
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md border border-slate-200 text-[10px] font-bold">
                          {scopeLabel}
                        </span>
                      </div>

                      {item.notes && (
                        <p className="text-[11px] text-slate-500 pr-4">{item.notes}</p>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 self-end sm:self-center">
                      {item.customer_delivery_fee !== null && (
                        <span className="px-2.5 py-1 bg-amber-50 text-amber-900 font-bold rounded-lg border border-amber-200 text-xs">
                          رسوم العميل: {item.customer_delivery_fee} ج.م
                        </span>
                      )}

                      {item.base_delivery_fee !== null && (
                        <span className="px-2.5 py-1 bg-slate-100 text-slate-700 font-semibold rounded-lg border border-slate-200 text-[11px]">
                          الأجرة الأساسية: {item.base_delivery_fee} ج.م
                        </span>
                      )}

                      {item.admin_commission !== null && (
                        <span className="px-2.5 py-1 bg-slate-100 text-slate-700 font-semibold rounded-lg border border-slate-200 text-[11px]">
                          عمولة التوصيل: {item.admin_commission} ج.م
                        </span>
                      )}

                      {item.driver_net_fee !== null && (
                        <span className="px-2.5 py-1 bg-blue-50 text-blue-800 font-semibold rounded-lg border border-blue-200 text-[11px]">
                          صافي المندوب: {item.driver_net_fee} ج.م
                        </span>
                      )}

                      <span
                        className={`px-2.5 py-1 rounded-lg font-bold text-[11px] ${
                          item.is_enabled
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : 'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}
                      >
                        {item.is_enabled ? 'مفعّل' : 'معطّل'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* 3. Central System Administration Policies (Read-only) */}
      <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-3">
        <div className="flex items-center gap-2 font-bold text-slate-900 text-xs">
          <ShieldCheck className="w-4 h-4 text-amber-600" />
          <span>سياسات وإعدادات الإدارة المركزية (للقراءة فقط)</span>
        </div>

        <p className="text-[11px] text-slate-600 leading-relaxed">
          هذه الإعدادات تحددها إدارة منظومة طلباتي مركزيًا لضبط معايير الخدمة والتسوية، ولا يمكن تعديلها بواسطة المطعم:
        </p>

        {sectionSettingsError && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-900 font-bold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>{sectionSettingsError}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
          <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1">
            <span className="text-slate-400 block text-[10px]">حالة قسم المطاعم بالمنظومة:</span>
            {sectionSettings ? (
              sectionSettings.section_enabled === null ? (
                <span className="font-bold text-amber-700 text-xs">غير محدد في الإعداد المركزي</span>
              ) : (
                <span
                  className={`font-extrabold text-xs flex items-center gap-1 ${
                    sectionSettings.section_enabled ? 'text-emerald-700' : 'text-rose-700'
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      sectionSettings.section_enabled ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
                    }`}
                  />
                  {sectionSettings.section_enabled ? 'مفعل ويعمل' : 'معطل مركزيًا'}
                </span>
              )
            ) : (
              <span className="font-bold text-slate-500 text-xs">غير متاح من القاعدة المركزية</span>
            )}
          </div>

          <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1">
            <span className="text-slate-400 block text-[10px]">نسبة عمولة الإدارة المعتمدة:</span>
            <span className="font-extrabold text-amber-600 text-xs">
              {restaurant.adminCommissionPercent}% على صافي الطعام
            </span>
          </div>
        </div>
      </div>

      {/* 4. Basic Restaurant Commercial Info Form */}
      <form onSubmit={handleSaveBasic} className="space-y-5 text-xs">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2 flex items-center gap-2">
            <Store className="w-4 h-4 text-amber-600" />
            البيانات التجارية الأساسية للمطعم
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-700 font-bold mb-1">اسم المطعم *</label>
              <input
                type="text"
                required
                disabled={isSavingBasic}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-amber-500 focus:bg-white font-bold disabled:opacity-50"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">رقم هاتف المطعم *</label>
              <input
                type="tel"
                required
                disabled={isSavingBasic}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-left dir-ltr focus:ring-2 focus:ring-amber-500 focus:bg-white disabled:opacity-50"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-700 font-bold mb-1">وصف المطعم ونوع المأكولات</label>
            <textarea
              rows={2}
              disabled={isSavingBasic}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-amber-500 focus:bg-white disabled:opacity-50"
            />
          </div>

          <div>
            <label className="block text-slate-700 font-bold mb-1">العنوان التفصيلي</label>
            <input
              type="text"
              disabled={isSavingBasic}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs disabled:opacity-50"
            />
          </div>

          {/* Logo & Visuals note */}
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <img
                src={logo || restaurant.logo}
                alt={name}
                className="w-12 h-12 rounded-xl object-cover border border-amber-200 shadow-xs"
              />
              <div>
                <p className="text-xs font-bold text-slate-800">شعار وصورة المطعم الحالية</p>
                <p className="text-[11px] text-slate-500">
                  تُدار وسائط وشعارات المطاعم وتُعتمد مركزيًا من إدارة المنظومة (غير متاح للرفع المباشر في هذه المرحلة).
                </p>
              </div>
            </div>
            <span className="text-[10px] font-bold text-slate-600 bg-slate-200/80 px-2.5 py-1 rounded-lg shrink-0">
              إدارة مركزية
            </span>
          </div>
        </div>

        {/* Operating Hours - Explicitly marked as unsupported in schema */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-600" />
              ساعات ومواعيد العمل
            </h3>
            <span className="text-[11px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full w-fit">
              غير مدعوم حاليًا في المخطط (محدد مركزيًا)
            </span>
          </div>

          <p className="text-xs text-slate-500 leading-relaxed">
            مواعيد العمل والعطلات محددة وفق وثيقة الاعتماد المركزي، ولا توجد أعمدة مخصصة لها في جدول{' '}
            <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-700 font-mono">restaurants</code> الفعلي. يتم التحكم في استقبال الطلبات لحظيًا عبر زر الفتح/الإغلاق المعتمد أعلاه.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            <div>
              <label className="block text-slate-700 font-bold mb-1">
                ساعات العمل اليومية
                <span className="text-[10px] text-slate-400 font-normal mr-1.5">(للقراءة فقط)</span>
              </label>
              <input
                type="text"
                disabled
                value={openingHours}
                className="w-full px-3.5 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-500 cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">
                أيام الإجازات
                <span className="text-[10px] text-slate-400 font-normal mr-1.5">(للقراءة فقط)</span>
              </label>
              <input
                type="text"
                disabled
                value={holidays}
                className="w-full px-3.5 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-500 cursor-not-allowed"
              />
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex items-center justify-end">
          <button
            type="submit"
            disabled={isSavingBasic}
            className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-60 text-slate-950 font-black rounded-xl text-xs flex items-center gap-2 shadow-md shadow-amber-500/20 cursor-pointer"
          >
            {isSavingBasic ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>جارٍ حفظ بيانات المطعم...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>حفظ بيانات المطعم الأساسية</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
