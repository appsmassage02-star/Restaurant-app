import React, { useState, useEffect, useCallback } from 'react';
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
  Plus,
  Trash2,
  Check,
  AlertCircle,
  Loader2,
  Layers,
  DollarSign,
  Info,
  RefreshCw,
  Truck,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import {
  fetchGovernorates,
  fetchCenters,
  fetchAreas,
} from '../../services/geographicService';
import {
  fetchRestaurantServiceAreas,
  fetchSectionSettings,
  addRestaurantServiceArea,
  toggleServiceAreaActive,
  deleteRestaurantServiceArea,
  updateAreaDeliveryFee,
  RestaurantServiceAreaItem,
  RestaurantSectionSettings,
} from '../../services/deliveryAreaService';
import { FoodGovernorate, FoodCenter, FoodArea } from '../../types/database';

export const SettingsView: React.FC = () => {
  const {
    restaurant,
    updateRestaurantSettingsDb,
    updateRestaurantDeliveryEnabled,
    dbRestaurant,
    refreshRestaurant,
  } = useApp();

  // Basic Info
  const [name, setName] = useState(restaurant.name);
  const [description, setDescription] = useState(restaurant.description);
  const [phone, setPhone] = useState(restaurant.phone);
  const [address, setAddress] = useState(restaurant.address);
  const [logo, setLogo] = useState(restaurant.logo);
  const [openingHours, setOpeningHours] = useState(restaurant.openingHours);
  const [holidays, setHolidays] = useState(restaurant.holidays);
  const [deliveryFee, setDeliveryFee] = useState<number | ''>(restaurant.deliveryFee || 25);
  const [deliveryRadiusKm, setDeliveryRadiusKm] = useState(restaurant.deliveryRadiusKm || 5);
  const [isOpen, setIsOpen] = useState(restaurant.isOpen);
  const [isTogglingDelivery, setIsTogglingDelivery] = useState(false);

  // Geographic cascaded selection for adding a new service area
  const [governorates, setGovernorates] = useState<FoodGovernorate[]>([]);
  const [centers, setCenters] = useState<FoodCenter[]>([]);
  const [areas, setAreas] = useState<FoodArea[]>([]);

  const [selectedGovId, setSelectedGovId] = useState('');
  const [selectedCenterId, setSelectedCenterId] = useState('');
  const [selectedAreaId, setSelectedAreaId] = useState('');
  const [newAreaFee, setNewAreaFee] = useState<number | ''>(25);
  const [newAreaNotes, setNewAreaNotes] = useState('');

  const [loadingGovs, setLoadingGovs] = useState(false);
  const [loadingCenters, setLoadingCenters] = useState(false);
  const [loadingAreas, setLoadingAreas] = useState(false);

  // Service Areas list
  const [serviceAreas, setServiceAreas] = useState<RestaurantServiceAreaItem[]>([]);
  const [loadingAreasList, setLoadingAreasList] = useState(false);
  const [addingArea, setAddingArea] = useState(false);

  // Central section settings (Read-only from restaurant_section_settings)
  const [sectionSettings, setSectionSettings] = useState<RestaurantSectionSettings | null>(null);

  // Editing fee inline per area
  const [editingFeeAreaId, setEditingFeeAreaId] = useState<string | null>(null);
  const [editingFeeValue, setEditingFeeValue] = useState<number>(25);

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
    setDeliveryFee(restaurant.deliveryFee || 25);
    setDeliveryRadiusKm(restaurant.deliveryRadiusKm || 5);
    setIsOpen(restaurant.isOpen);
  }, [restaurant]);

  // Load Governorates
  useEffect(() => {
    async function loadGovs() {
      setLoadingGovs(true);
      const res = await fetchGovernorates();
      if (res.data) setGovernorates(res.data);
      setLoadingGovs(false);
    }
    loadGovs();
  }, []);

  // Load Centers when Governorate changes
  useEffect(() => {
    setSelectedCenterId('');
    setSelectedAreaId('');
    setCenters([]);
    setAreas([]);
    if (!selectedGovId) return;

    async function loadCentersData() {
      setLoadingCenters(true);
      const res = await fetchCenters(selectedGovId);
      if (res.data) setCenters(res.data);
      setLoadingCenters(false);
    }
    loadCentersData();
  }, [selectedGovId]);

  // Load Areas when Center changes
  useEffect(() => {
    setSelectedAreaId('');
    setAreas([]);
    if (!selectedCenterId) return;

    async function loadAreasData() {
      setLoadingAreas(true);
      const res = await fetchAreas(selectedCenterId);
      if (res.data) setAreas(res.data);
      setLoadingAreas(false);
    }
    loadAreasData();
  }, [selectedCenterId]);

  // Load Service Areas and Central Section Settings
  const loadDeliveryData = useCallback(async () => {
    if (!restaurant.id) return;
    setLoadingAreasList(true);
    try {
      const [areasRes, secRes] = await Promise.all([
        fetchRestaurantServiceAreas(restaurant.id),
        fetchSectionSettings(),
      ]);

      if (areasRes.data) {
        setServiceAreas(areasRes.data);
      }
      if (secRes.data) {
        setSectionSettings(secRes.data);
      }
    } catch (err: any) {
      console.warn('Failed loading delivery settings:', err);
    } finally {
      setLoadingAreasList(false);
    }
  }, [restaurant.id]);

  useEffect(() => {
    loadDeliveryData();
  }, [loadDeliveryData]);

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
      setSaveSuccess(nextState ? 'تم فتح المطعم لاستقبال طلبات الزبائن بنجاح في قاعدة البيانات.' : 'تم إغلاق المطعم مؤقتًا بنجاح.');
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

  // Save Basic Info to Supabase
  const handleSaveBasic = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSaveSuccess(null);
    setIsSavingBasic(true);

    const fee = typeof deliveryFee === 'number' ? deliveryFee : 25;

    const res = await updateRestaurantSettingsDb({
      name,
      description,
      phone,
      address,
      delivery_fee: fee,
      max_delivery_radius_km: deliveryRadiusKm,
      is_open: isOpen,
    });

    if (!res.success) {
      setErrorMessage(res.error || 'فشل حفظ الإعدادات في قاعدة البيانات.');
    } else {
      setSaveSuccess('تم حفظ وتحديث بيانات المطعم بنجاح في جدول restaurants بقاعدة البيانات!');
      setTimeout(() => setSaveSuccess(null), 4000);
      refreshRestaurant();
    }
    setIsSavingBasic(false);
  };

  // Add Service Area
  const handleAddServiceArea = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restaurant.id) {
      setErrorMessage('معرف المطعم غير متوفر.');
      return;
    }
    if (!selectedGovId || !selectedCenterId || !selectedAreaId) {
      setErrorMessage('يرجى اختيار المحافظة والمركز والحي / المنطقة بالكامل.');
      return;
    }

    setErrorMessage(null);
    setSaveSuccess(null);
    setAddingArea(true);

    const fee = typeof newAreaFee === 'number' ? newAreaFee : 25;

    const res = await addRestaurantServiceArea(
      restaurant.id,
      selectedGovId,
      selectedCenterId,
      selectedAreaId,
      fee,
      newAreaNotes
    );

    if (res.error || !res.data) {
      setErrorMessage(res.error || 'تعذر إضافة المنطقة المخدومة.');
    } else {
      setSaveSuccess('تمت إضافة المنطقة المخدومة ورسوم التوصيل الخاصة بها بنجاح في قاعدة البيانات.');
      setTimeout(() => setSaveSuccess(null), 4000);
      setSelectedAreaId('');
      setNewAreaNotes('');
      await loadDeliveryData();
    }
    setAddingArea(false);
  };

  // Toggle Service Area is_active
  const handleToggleAreaActive = async (item: RestaurantServiceAreaItem) => {
    setErrorMessage(null);
    const next = !item.is_active;
    const res = await toggleServiceAreaActive(item.id, next);
    if (res.error) {
      setErrorMessage(res.error || 'تعذر تعديل حالة المنطقة.');
    } else {
      setServiceAreas((prev) =>
        prev.map((a) => (a.id === item.id ? { ...a, is_active: next } : a))
      );
    }
  };

  // Delete Service Area
  const handleDeleteArea = async (item: RestaurantServiceAreaItem) => {
    setErrorMessage(null);
    setSaveSuccess(null);
    const res = await deleteRestaurantServiceArea(item.id, restaurant.id, item.area_id);
    if (res.error) {
      setErrorMessage(res.error || 'تعذر حذف المنطقة المخدومة.');
    } else {
      setServiceAreas((prev) => prev.filter((a) => a.id !== item.id));
      setSaveSuccess('تم حذف المنطقة من نطاق الخدمة بنجاح.');
      setTimeout(() => setSaveSuccess(null), 3000);
    }
  };

  // Save Updated Delivery Fee for Area
  const handleSaveAreaFee = async (areaId: string) => {
    setErrorMessage(null);
    const res = await updateAreaDeliveryFee(restaurant.id, areaId, editingFeeValue);
    if (res.error) {
      setErrorMessage(res.error || 'تعذر تحديث رسوم التوصيل لهذه المنطقة.');
    } else {
      setServiceAreas((prev) =>
        prev.map((a) => (a.area_id === areaId ? { ...a, delivery_fee: editingFeeValue } : a))
      );
      setEditingFeeAreaId(null);
      setSaveSuccess('تم تحديث رسوم التوصيل للمنطقة بنجاح في قاعدة البيانات.');
      setTimeout(() => setSaveSuccess(null), 3000);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl text-right">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
            <Settings className="w-5 h-5 text-amber-500" />
            إعدادات المطعم ونطاق التوصيل الجغرافي
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            ضبط حالة التشغيل، المناطق المخدومة ورسوم التوصيل الخاصة بكل حي، والاطلاع على سياسات الإدارة المركزية
          </p>
        </div>

        <button
          onClick={() => {
            loadDeliveryData();
            refreshRestaurant();
          }}
          disabled={loadingAreasList}
          className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loadingAreasList ? 'animate-spin text-amber-600' : ''}`} />
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

      {/* 2. Hierarchical Geographic Service Areas & Delivery Fees */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-5">
        <div className="border-b border-slate-100 pb-3">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-amber-600" />
            نطاق التوصيل الجغرافي والمناطق المخدومة ورسوم التوصيل
          </h3>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            وفقًا للمنظومة الفعلية، يعتمد التوصيل على تحديد المحافظات والمراكز والأحياء المعتمدة وتعيين رسوم التوصيل المخصصة لكل منطقة في جدول restaurant_service_areas وجدول restaurant_area_delivery_fees.
          </p>
        </div>

        {/* Add Area Form */}
        <form onSubmit={handleAddServiceArea} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3 text-xs">
          <span className="font-bold text-slate-800 block text-xs">
            إضافة منطقة مخدومة جديدة لنطاق المطعم:
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Gov */}
            <div>
              <label className="block text-slate-700 font-bold mb-1">المحافظة *</label>
              <select
                required
                value={selectedGovId}
                onChange={(e) => setSelectedGovId(e.target.value)}
                disabled={loadingGovs || addingArea}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-amber-500 disabled:opacity-50"
              >
                <option value="">-- اختر المحافظة --</option>
                {governorates.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name_ar}
                  </option>
                ))}
              </select>
            </div>

            {/* Center */}
            <div>
              <label className="block text-slate-700 font-bold mb-1">المركز / المدينة *</label>
              <select
                required
                value={selectedCenterId}
                onChange={(e) => setSelectedCenterId(e.target.value)}
                disabled={!selectedGovId || loadingCenters || addingArea}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-amber-500 disabled:opacity-50"
              >
                <option value="">
                  {loadingCenters ? 'جارٍ التحميل...' : '-- اختر المركز --'}
                </option>
                {centers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name_ar}
                  </option>
                ))}
              </select>
            </div>

            {/* Area */}
            <div>
              <label className="block text-slate-700 font-bold mb-1">الحي / المنطقة *</label>
              <select
                required
                value={selectedAreaId}
                onChange={(e) => setSelectedAreaId(e.target.value)}
                disabled={!selectedCenterId || loadingAreas || addingArea}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-amber-500 disabled:opacity-50"
              >
                <option value="">
                  {loadingAreas ? 'جارٍ التحميل...' : '-- اختر المنطقة/الحي --'}
                </option>
                {areas.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name_ar}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block text-slate-700 font-bold mb-1">
                رسوم التوصيل لهذه المنطقة (ج.م) *
              </label>
              <input
                type="number"
                min="0"
                step="1"
                required
                disabled={addingArea}
                value={newAreaFee}
                onChange={(e) =>
                  setNewAreaFee(e.target.value === '' ? '' : parseFloat(e.target.value))
                }
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-amber-500 font-bold"
                placeholder="25"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">ملاحظات التوصيل للمنطقة (اختياري)</label>
              <input
                type="text"
                disabled={addingArea}
                value={newAreaNotes}
                onChange={(e) => setNewAreaNotes(e.target.value)}
                placeholder="مثال: التوصيل حتى مدخل الحي الرئيسي فقط..."
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={addingArea || !selectedAreaId}
              className="px-5 py-2 bg-amber-500 hover:bg-amber-600 disabled:bg-slate-200 disabled:text-slate-400 text-slate-950 font-black rounded-xl text-xs flex items-center gap-1.5 shadow-xs cursor-pointer disabled:cursor-not-allowed"
            >
              {addingArea ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>جارٍ الإضافة في قاعدة البيانات...</span>
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  <span>إضافة المنطقة إلى نطاق الخدمة</span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* Existing Service Areas List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-800">
              المناطق المسجلة حاليًا لنطاق خدمة المطعم ({serviceAreas.length}):
            </h4>
            {loadingAreasList && (
              <span className="text-[11px] text-amber-600 flex items-center gap-1 font-bold">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                تحميل المناطق...
              </span>
            )}
          </div>

          {serviceAreas.length === 0 ? (
            <div className="p-8 bg-slate-50 border border-dashed border-slate-200 rounded-2xl text-center text-xs text-slate-400">
              لا توجد مناطق مخدومة مسجلة لهذا المطعم حتى الآن. يرجى اختيار وإضافة الأحياء التي يمكنك التوصيل إليها أعلاه.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden bg-white">
              {serviceAreas.map((item) => {
                const isEditingFee = editingFeeAreaId === item.area_id;

                return (
                  <div
                    key={item.id}
                    className="p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs hover:bg-slate-50 transition-colors"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-2.5 h-2.5 rounded-full ${
                            item.is_active ? 'bg-emerald-500' : 'bg-slate-300'
                          }`}
                        />
                        <span className="font-bold text-slate-900 text-xs">
                          {item.area_name}
                        </span>
                        <span className="text-slate-400 text-[11px]">
                          ({item.center_name} - {item.governorate_name})
                        </span>
                      </div>

                      {item.fee_notes && (
                        <p className="text-[11px] text-slate-500 pr-4">{item.fee_notes}</p>
                      )}
                    </div>

                    <div className="flex items-center gap-2.5 self-end sm:self-center">
                      {/* Delivery Fee Box */}
                      {isEditingFee ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            min="0"
                            value={editingFeeValue}
                            onChange={(e) =>
                              setEditingFeeValue(parseFloat(e.target.value) || 0)
                            }
                            className="w-16 px-2 py-1 bg-white border border-amber-400 rounded-lg text-xs font-bold text-center"
                          />
                          <button
                            onClick={() => handleSaveAreaFee(item.area_id)}
                            className="p-1 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600"
                            title="حفظ الرسوم"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setEditingFeeAreaId(item.area_id);
                            setEditingFeeValue(item.delivery_fee ?? 25);
                          }}
                          className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 font-bold rounded-lg border border-amber-200 text-xs cursor-pointer transition-colors"
                          title="انقر لتعديل رسوم التوصيل لهذه المنطقة"
                        >
                          {item.delivery_fee ?? 25} ج.م
                        </button>
                      )}

                      {/* Active Toggle */}
                      <button
                        onClick={() => handleToggleAreaActive(item)}
                        className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-colors cursor-pointer ${
                          item.is_active
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {item.is_active ? 'نشط' : 'معطل'}
                      </button>

                      {/* Delete */}
                      <button
                        onClick={() => handleDeleteArea(item)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="حذف المنطقة من نطاق الخدمة"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* 3. Central System Administration Restrictions (Read-only) */}
      <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-3">
        <div className="flex items-center gap-2 font-bold text-slate-900 text-xs">
          <Lock className="w-4 h-4 text-amber-600" />
          <span>سياسات وإعدادات الإدارة المركزية (جدول restaurant_section_settings — للقراءة فقط)</span>
        </div>

        <p className="text-[11px] text-slate-600 leading-relaxed">
          هذه الإعدادات تحددها إدارة منظومة طلباتي مركزيًا لضبط معايير الخدمة والتسوية، ولا يمكن تعديلها بواسطة المطعم:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs pt-1">
          <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1">
            <span className="text-slate-400 block text-[10px]">حالة قسم المطاعم بالمنظومة:</span>
            <span className="font-extrabold text-emerald-700 text-xs flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              {sectionSettings?.section_enabled !== false ? 'مفعل ويعمل' : 'معطل مركزيًا'}
            </span>
          </div>

          <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1">
            <span className="text-slate-400 block text-[10px]">الحد الأقصى للتوصيل (مركزي):</span>
            <span className="font-extrabold text-amber-800 text-xs">
              {sectionSettings?.global_max_delivery_radius_km || 15} كم كحد أقصى
            </span>
          </div>

          <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1">
            <span className="text-slate-400 block text-[10px]">مهلة انتظار كابتن التوصيل:</span>
            <span className="font-extrabold text-slate-800 text-xs">
              {sectionSettings?.no_driver_timeout_minutes || 10} دقائق
            </span>
          </div>

          <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1">
            <span className="text-slate-400 block text-[10px]">نسبة عمولة الإدارة المعتمدة:</span>
            <span className="font-extrabold text-amber-600 text-xs">
              10% على صافي الطعام
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

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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

            <div>
              <label className="block text-slate-700 font-bold mb-1">رسوم التوصيل العامة (ج.م) *</label>
              <input
                type="number"
                min="0"
                step="1"
                disabled={isSavingBasic}
                value={deliveryFee}
                onChange={(e) =>
                  setDeliveryFee(e.target.value === '' ? '' : parseFloat(e.target.value))
                }
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold disabled:opacity-50"
              />
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">أقصى نطاق توصيل عام (كم) *</label>
              <input
                type="number"
                min="1"
                max="30"
                step="0.5"
                disabled={isSavingBasic}
                value={deliveryRadiusKm}
                onChange={(e) =>
                  setDeliveryRadiusKm(e.target.value === '' ? 5 : parseFloat(e.target.value))
                }
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold disabled:opacity-50"
              />
            </div>
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
            مواعيد العمل والعطلات محددة وفق وثيقة الاعتماد المركزي، ولا توجد أعمدة مخصصة لها في جدول <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-700 font-mono">restaurants</code> الفعلي. يتم التحكم في استقبال الطلبات لحظيًا عبر زر الفتح/الإغلاق المعتمد أعلاه.
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
                <span>حفظ بيانات وإعدادات المطعم</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
