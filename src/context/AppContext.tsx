import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured, getSupabaseConfig } from '../services/supabase';
import {
  RestaurantProfile,
  RestaurantOwner,
  MenuCategory,
  MenuItem,
  Offer,
  Order,
  FinancialMovement,
  AppNotification,
  OrderStatus,
  RegistrationStatus,
  ExecutionRoute,
} from '../types';
import {
  DbProfile,
  DbRestaurant,
  CreateRestaurantPayload,
} from '../types/database';
import {
  fetchOwnerRestaurant,
  fetchUserProfile,
  attemptCreateRestaurant,
  CreateRestaurantResult,
} from '../services/restaurantService';
import {
  fetchRestaurantMenuCategories,
  fetchRestaurantMenuItems,
  createRestaurantMenuCategory,
  updateRestaurantMenuCategory,
  deleteRestaurantMenuCategory,
  createRestaurantMenuItem,
  updateRestaurantMenuItem,
  deleteRestaurantMenuItem,
  toggleRestaurantMenuItemAvailability,
} from '../services/menuService';
import {
  fetchRestaurantOffers,
  createRestaurantOffer,
  updateRestaurantOffer,
  deleteRestaurantOffer,
  toggleRestaurantOfferStatus,
} from '../services/offerService';
import {
  updateRestaurantDbSettings,
} from '../services/deliveryAreaService';
import {
  orderRealtimeManager,
  RealtimeConnectionStatus,
} from '../services/orderRealtimeService';
import {
  acceptOrderWithRoute,
  rejectOrder as rejectOrderRpc,
  setOrderPreparing as setOrderPreparingRpc,
  markOrderReady as markOrderReadyRpc,
  setRestaurantDeliveryEnabled as setRestaurantDeliveryEnabledRpc,
  listPendingCancellations,
  decideCancellation as decideCancellationRpc,
} from '../services/orderWorkflowService';
import { DbPendingCancellation } from '../types/database';
import {
  INITIAL_CATEGORIES,
  INITIAL_MENU_ITEMS,
  INITIAL_OFFERS,
  INITIAL_MOVEMENTS,
  INITIAL_NOTIFICATIONS,
} from '../services/mockData';

const EMPTY_RESTAURANT: RestaurantProfile = {
  id: '',
  name: 'مطعم جديد',
  description: '',
  phone: '',
  logo: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=200&auto=format&fit=crop&q=80',
  coverImage: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=1200&auto=format&fit=crop&q=80',
  address: '',
  governorate: '',
  city: '',
  latitude: null,
  longitude: null,
  deliveryRadiusKm: 5.0,
  maxAllowedRadiusKm: 12.0,
  deliveryFee: 25.0,
  restaurantDeliveryEnabled: true,
  isOpen: false,
  openingHours: '10:00 ص - 12:00 م',
  holidays: '',
  adminCommissionPercent: 10,
  settlementPeriod: 'WEEKLY',
  registrationStatus: 'NOT_REGISTERED',
  registrationDate: '',
};

const EMPTY_OWNER: RestaurantOwner = {
  id: '',
  fullName: '',
  phone: '',
  email: '',
};

interface AuthResult {
  success: boolean;
  error?: string;
  requiresEmailConfirmation?: boolean;
}

interface AppContextType {
  // Supabase Auth & Session
  isSupabaseReady: boolean;
  authLoading: boolean;
  isAuthenticated: boolean;
  user: User | null;
  session: Session | null;
  userProfile: DbProfile | null;
  isUserBanned: boolean;
  isUserSuspended: boolean;
  banReason?: string;
  hasRestaurant: boolean;

  // Owner & Restaurant
  owner: RestaurantOwner;
  restaurant: RestaurantProfile;
  dbRestaurant: DbRestaurant | null;

  // Auth Actions
  login: (email: string, pass: string) => Promise<AuthResult>;
  signUp: (email: string, pass: string, fullName: string, phone: string) => Promise<AuthResult>;
  resetPassword: (email: string) => Promise<AuthResult>;
  logout: () => Promise<void>;
  refreshRestaurant: () => Promise<void>;
  dataLoadError: string | null;
  retryLoadUserData: () => Promise<void>;

  // Profile & Restaurant Updates
  updateOwner: (updated: Partial<RestaurantOwner>) => void;
  updateRestaurant: (updated: Partial<RestaurantProfile>) => void;
  updateRestaurantSettingsDb: (updates: {
    name?: string;
    description?: string;
    phone?: string;
    address?: string;
    is_open?: boolean;
    delivery_fee?: number;
    max_delivery_radius_km?: number;
  }) => Promise<{ success: boolean; error?: string }>;
  setRegistrationStatus: (status: RegistrationStatus, reason?: string) => void;
  registerRestaurantReal: (payload: CreateRestaurantPayload) => Promise<CreateRestaurantResult>;
  registerRestaurant: (ownerData: Omit<RestaurantOwner, 'id'>, restData: Partial<RestaurantProfile>) => Promise<CreateRestaurantResult>;

  // Categories & Menu
  categories: MenuCategory[];
  menuItems: MenuItem[];
  menuLoading: boolean;
  menuError: string | null;
  reloadMenu: () => Promise<void>;
  addCategory: (name: string, description?: string) => void;
  addCategoryAsync: (name: string, description?: string) => Promise<{ success: boolean; error?: string; category?: MenuCategory }>;
  updateCategory: (id: string, updated: Partial<MenuCategory>) => void;
  updateCategoryAsync: (id: string, updated: Partial<MenuCategory>) => Promise<{ success: boolean; error?: string }>;
  deleteCategory: (id: string) => boolean;
  deleteCategoryAsync: (id: string) => Promise<{ success: boolean; error?: string }>;
  reorderCategories: (orderedIds: string[]) => void;

  addItem: (item: Omit<MenuItem, 'id'>) => void;
  addItemAsync: (item: Omit<MenuItem, 'id'>) => Promise<{ success: boolean; error?: string; item?: MenuItem }>;
  updateItem: (id: string, updated: Partial<MenuItem>) => void;
  updateItemAsync: (id: string, updated: Partial<MenuItem>) => Promise<{ success: boolean; error?: string }>;
  deleteItem: (id: string) => void;
  deleteItemAsync: (id: string) => Promise<{ success: boolean; error?: string }>;
  toggleItemAvailability: (id: string) => void;
  toggleItemAvailabilityAsync: (id: string) => Promise<{ success: boolean; error?: string }>;

  // Offers
  offers: Offer[];
  offersLoading: boolean;
  offersError: string | null;
  reloadOffers: () => Promise<void>;
  addOffer: (offer: Omit<Offer, 'id'>) => void;
  addOfferAsync: (offer: Omit<Offer, 'id'>) => Promise<{ success: boolean; error?: string; offer?: Offer }>;
  updateOffer: (id: string, updated: Partial<Offer>) => void;
  updateOfferAsync: (id: string, updated: Partial<Offer>) => Promise<{ success: boolean; error?: string }>;
  deleteOffer: (id: string) => void;
  deleteOfferAsync: (id: string) => Promise<{ success: boolean; error?: string }>;
  toggleOfferStatus: (id: string) => void;
  toggleOfferStatusAsync: (id: string) => Promise<{ success: boolean; error?: string }>;

  // Orders
  orders: Order[];
  ordersLoading: boolean;
  ordersError: string | null;
  ordersRealtimeStatus: RealtimeConnectionStatus;
  refreshOrders: () => void;
  acceptOrder: (orderId: string) => void;
  rejectOrder: (orderId: string, reason: string) => void;
  startPreparingOrder: (orderId: string) => void;
  markOrderReady: (orderId: string) => void;
  completeOrder: (orderId: string) => void;
  injectMockOrder: (route?: ExecutionRoute) => void;

  // Phase 2 Workflow Operations
  updateRestaurantDeliveryEnabled: (enabled: boolean) => Promise<{ success: boolean; error?: string }>;
  acceptOrderWorkflow: (orderId: string, fulfillmentRoute: 'restaurant_delivery' | 'driver_delivery') => Promise<{ success: boolean; error?: string }>;
  rejectOrderWorkflow: (orderId: string, reason: string) => Promise<{ success: boolean; error?: string }>;
  setOrderPreparingWorkflow: (orderId: string) => Promise<{ success: boolean; error?: string }>;
  markOrderReadyWorkflow: (orderId: string) => Promise<{ success: boolean; error?: string }>;
  decideCancellationWorkflow: (requestId: string, approve: boolean, reason?: string) => Promise<{ success: boolean; error?: string }>;
  pendingCancellations: DbPendingCancellation[];
  refreshPendingCancellations: () => Promise<void>;

  // Financials & Movements
  movements: FinancialMovement[];
  recordSettlement: (amount: number, receiptNum: string, notes: string) => void;

  // Notifications
  notifications: AppNotification[];
  markNotificationAsRead: (id: string) => void;
  markAllNotificationsAsRead: () => void;
  newOrderAlert: Order | null;
  clearNewOrderAlert: () => void;

  // Simulation / Stats
  resetAllData: () => void;
  stats: {
    pendingOrdersCount: number;
    acceptedOrdersCount: number;
    awaitingDriverOrdersCount: number;
    preparingOrdersCount: number;
    readyOrdersCount: number;
    completedOrdersCount: number;
    rejectedOrdersCount: number;
    totalOrdersCount: number;
    totalFoodSales: number;
    totalDiscounts: number;
    netFoodSales: number;
    totalAdminCommission: number;
    totalNetRestaurantDue: number;
    totalCollected: number;
    totalUnsettled: number;
  };
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Auth state derived strictly from Supabase
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<DbProfile | null>(null);
  const [isUserBanned, setIsUserBanned] = useState<boolean>(false);
  const [isUserSuspended, setIsUserSuspended] = useState<boolean>(false);
  const [banReason, setBanReason] = useState<string | undefined>(undefined);
  const [dataLoadError, setDataLoadError] = useState<string | null>(null);

  // تنسيق موحد لعمليات تحميل بيانات المستخدم لمنع التداخل والتضارب بين مسارات الدخول واستعادة الجلسة وإعادة المحاولة
  const activeLoadPromiseRef = useRef<Promise<void> | null>(null);
  const activeUserIdRef = useRef<string | null>(null);
  const loadedUserIdRef = useRef<string | null>(null);
  const activeRestaurantIdRef = useRef<string | null>(null);
  const loadSequenceRef = useRef<number>(0);
  const menuSequenceRef = useRef<number>(0);
  const offersSequenceRef = useRef<number>(0);

  // Real owned restaurant state
  const [dbRestaurant, setDbRestaurant] = useState<DbRestaurant | null>(null);
  const [restaurant, setRestaurant] = useState<RestaurantProfile>(EMPTY_RESTAURANT);
  const [owner, setOwner] = useState<RestaurantOwner>(EMPTY_OWNER);

  // Operational states: Start empty (no fake mock data presented as real database records)
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [menuLoading, setMenuLoading] = useState<boolean>(false);
  const [menuError, setMenuError] = useState<string | null>(null);

  const [offers, setOffers] = useState<Offer[]>([]);
  const [offersLoading, setOffersLoading] = useState<boolean>(false);
  const [offersError, setOffersError] = useState<string | null>(null);

  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState<boolean>(false);
  const [ordersError, setOrdersError] = useState<string | null>(null);
  const [ordersRealtimeStatus, setOrdersRealtimeStatus] = useState<RealtimeConnectionStatus>('DISCONNECTED');
  const [pendingCancellations, setPendingCancellations] = useState<DbPendingCancellation[]>([]);
  const [movements, setMovements] = useState<FinancialMovement[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [newOrderAlert, setNewOrderAlert] = useState<Order | null>(null);

  const isAuthenticated = Boolean(session && user);
  const hasRestaurant = Boolean(dbRestaurant && dbRestaurant.id);

  // تصفير شامل لجميع بيانات وحالات المستخدم والمطعم السابق فورًا لمنع أي تسرب للبيانات
  const resetUserDataState = useCallback(() => {
    orderRealtimeManager.stop();
    setUserProfile(null);
    setIsUserBanned(false);
    setIsUserSuspended(false);
    setBanReason(undefined);
    setOwner(EMPTY_OWNER);
    setDbRestaurant(null);
    setRestaurant(EMPTY_RESTAURANT);
    setCategories([]);
    setMenuItems([]);
    setMenuLoading(false);
    setMenuError(null);
    setOffers([]);
    setOffersLoading(false);
    setOffersError(null);
    setOrders([]);
    setOrdersLoading(false);
    setOrdersError(null);
    setOrdersRealtimeStatus('DISCONNECTED');
    setPendingCancellations([]);
    setMovements([]);
    setNotifications([]);
    setNewOrderAlert(null);
    setDataLoadError(null);
    activeRestaurantIdRef.current = null;
  }, []);

  // Load Menu Data from Supabase with full protection against stale responses
  const loadMenuData = useCallback(
    async (restaurantId: string, targetSequence?: number) => {
      if (!restaurantId) return;

      const seq = targetSequence !== undefined ? targetSequence : loadSequenceRef.current;
      const menuSeq = ++menuSequenceRef.current;

      // فحص لضمان أن الطلب ما زال مطابقًا لتسلسل المستخدم والمطعم النشط
      const isStale = () => {
        return (
          seq !== loadSequenceRef.current ||
          menuSeq !== menuSequenceRef.current ||
          activeRestaurantIdRef.current !== restaurantId
        );
      };

      setMenuLoading(true);
      setMenuError(null);

      try {
        const [catsRes, itemsRes] = await Promise.all([
          fetchRestaurantMenuCategories(restaurantId),
          fetchRestaurantMenuItems(restaurantId),
        ]);

        if (isStale()) return;

        if (catsRes.error) {
          setMenuError(catsRes.error);
        } else if (catsRes.data) {
          setCategories(catsRes.data);
        }

        if (isStale()) return;

        if (itemsRes.error) {
          setMenuError((prev) => (prev ? `${prev} | ${itemsRes.error}` : itemsRes.error));
        } else if (itemsRes.data) {
          setMenuItems(itemsRes.data);
        }
      } catch (err: any) {
        if (!isStale()) {
          setMenuError(err?.message || 'فشل جلب بيانات المنيو من قاعدة البيانات.');
        }
      } finally {
        if (!isStale()) {
          setMenuLoading(false);
        }
      }
    },
    []
  );

  // Load Offers Data from Supabase with full protection against stale responses
  const loadOffersData = useCallback(
    async (restaurantId: string, targetSequence?: number) => {
      if (!restaurantId) return;

      const seq = targetSequence !== undefined ? targetSequence : loadSequenceRef.current;
      const offersSeq = ++offersSequenceRef.current;

      const isStale = () => {
        return (
          seq !== loadSequenceRef.current ||
          offersSeq !== offersSequenceRef.current ||
          activeRestaurantIdRef.current !== restaurantId
        );
      };

      setOffersLoading(true);
      setOffersError(null);

      try {
        const res = await fetchRestaurantOffers(restaurantId);
        if (isStale()) return;

        if (res.error) {
          setOffersError(res.error);
        } else if (res.data) {
          setOffers(res.data);
        }
      } catch (err: any) {
        if (!isStale()) {
          setOffersError(err?.message || 'فشل جلب بيانات العروض من قاعدة البيانات.');
        }
      } finally {
        if (!isStale()) {
          setOffersLoading(false);
        }
      }
    },
    []
  );

  const reloadMenu = useCallback(async () => {
    if (dbRestaurant?.id) {
      await loadMenuData(dbRestaurant.id, loadSequenceRef.current);
    }
  }, [dbRestaurant?.id, loadMenuData]);

  const reloadOffers = useCallback(async () => {
    if (dbRestaurant?.id) {
      await loadOffersData(dbRestaurant.id, loadSequenceRef.current);
    }
  }, [dbRestaurant?.id, loadOffersData]);

  // الاستقبال اللحظي للطلبات والمزامنة التلقائية (المرحلة الأولى)
  useEffect(() => {
    if (!dbRestaurant?.id) {
      orderRealtimeManager.stop();
      setOrders([]);
      setOrdersLoading(false);
      setOrdersError(null);
      setOrdersRealtimeStatus('DISCONNECTED');
      return;
    }

    setOrdersLoading(true);
    setOrdersError(null);

    orderRealtimeManager.start(dbRestaurant.id, {
      onOrdersUpdated: (freshOrders) => {
        setOrders(freshOrders);
        setOrdersLoading(false);
        setOrdersError(null);
      },
      onNewOrderReceived: (newOrder) => {
        setNewOrderAlert(newOrder);
        setNotifications((prev) => [
          {
            id: `notif-${Date.now()}-${newOrder.id}`,
            title: `وصول طلب جديد! #${newOrder.orderNumber}`,
            message: `طلب جديد بقيمة ${newOrder.grandTotal} ج.م من العميل ${newOrder.customer.name}`,
            timestamp: new Date().toISOString(),
            type: 'ORDER',
            read: false,
            orderId: newOrder.id,
          },
          ...prev,
        ]);
      },
      onStatusChanged: (status) => {
        setOrdersRealtimeStatus(status);
      },
      onError: (errMsg) => {
        setOrdersError(errMsg);
        setOrdersLoading(false);
      },
    });

    refreshPendingCancellations();

    return () => {
      orderRealtimeManager.stop();
    };
  }, [dbRestaurant?.id]);

  const refreshPendingCancellations = useCallback(async () => {
    if (!dbRestaurant?.id) {
      setPendingCancellations([]);
      return;
    }
    const res = await listPendingCancellations();
    if (res.data) {
      setPendingCancellations(res.data);
    }
  }, [dbRestaurant?.id]);

  const refreshOrders = useCallback(() => {
    if (dbRestaurant?.id) {
      orderRealtimeManager.triggerSync();
      refreshPendingCancellations();
    }
  }, [dbRestaurant?.id, refreshPendingCancellations]);

  // Translate Supabase Auth Error to Egyptian Arabic
  const translateAuthError = (message: string): string => {
    const msg = message.toLowerCase();
    if (msg.includes('invalid login credentials') || msg.includes('invalid_grant')) {
      return 'البريد الإلكتروني أو كلمة المرور غير صحيحة. يرجى التحقق وإعادة المحاولة.';
    }
    if (msg.includes('email not confirmed')) {
      return 'يرجى تأكيد بريدك الإلكتروني أولاً عبر الرابط المرسل إلى صندوق الوارد الخاص بك.';
    }
    if (msg.includes('user already registered') || msg.includes('already exists')) {
      return 'هذا البريد الإلكتروني مسجل بالفعل. يرجى تسجيل الدخول أو استعادة كلمة المرور.';
    }
    if (msg.includes('password should be at least')) {
      return 'كلمة المرور يجب ألا تقل عن 6 أحرف أو أرقام.';
    }
    if (msg.includes('rate limit') || msg.includes('too many requests')) {
      return 'تم تجاوز الحد المسموح من المحاولات مؤقتًا، يرجى الانتظار بضع دقائق ثم إعادة المحاولة.';
    }
    if (msg.includes('network') || msg.includes('fetch')) {
      return 'تعذر الاتصال بخادم Supabase. يرجى التحقق من اتصال الإنترنت أو إعدادات الرابط.';
    }
    return `فشل المصادقة: ${message}`;
  };

  // Convert DbRestaurant to RestaurantProfile format
  const mapDbRestaurantToProfile = useCallback(
    (db: DbRestaurant, ownerEmail: string, ownerName: string): RestaurantProfile => {
      // In the database, is_active indicates whether admin has approved/activated the restaurant
      const regStatus: RegistrationStatus = db.is_active ? 'APPROVED' : 'PENDING';

      return {
        id: db.id,
        name: db.name || 'بدون اسم',
        description: db.description || '',
        phone: db.phone || '',
        logo: db.image_url || EMPTY_RESTAURANT.logo,
        coverImage: db.image_url || EMPTY_RESTAURANT.coverImage,
        address: db.address || '',
        governorate: db.governorate?.name_ar || 'غير محدد',
        city: db.center?.name_ar || db.area?.name_ar || 'غير محدد',
        governorateId: db.governorate_id || undefined,
        centerId: db.center_id || undefined,
        areaId: db.area_id || undefined,
        latitude: db.latitude !== undefined && db.latitude !== null ? db.latitude : null,
        longitude: db.longitude !== undefined && db.longitude !== null ? db.longitude : null,
        deliveryRadiusKm: db.max_delivery_radius_km ?? 6.0,
        maxAllowedRadiusKm: 15.0,
        deliveryFee: db.delivery_fee ?? 25.0,
        restaurantDeliveryEnabled: db.restaurant_delivery_enabled !== false,
        isOpen: db.is_open ?? false,
        openingHours: '10:00 ص - 01:00 ص',
        holidays: 'يعمل طوال الأسبوع',
        adminCommissionPercent: db.commission_percent ?? 10,
        settlementPeriod: (db.food_money_settlement_mode as any) || 'WEEKLY',
        registrationStatus: regStatus,
        registrationDate: db.created_at || new Date().toISOString(),
        rawDbRestaurant: db,
      };
    },
    []
  );

  // التنفيذ الفعلي لعملية جلب بيانات المستخدم والمطعم
  const executeLoadUserData = useCallback(
    async (authUser: User, sequence: number) => {
      // إهمال العملية فورًا إذا بدأ تسلسل أحدث لمستخدم آخر
      if (sequence !== loadSequenceRef.current) return;

      setDataLoadError(null);

      // 1. Fetch Profile
      const profResult = await fetchUserProfile(authUser.id);
      if (sequence !== loadSequenceRef.current) return;

      if (profResult.error) {
        setDataLoadError(profResult.error);
        return;
      }

      setUserProfile(profResult.profile);
      setIsUserBanned(profResult.isBanned);
      setIsUserSuspended(profResult.isSuspended);
      setBanReason(profResult.banReason);

      if (profResult.isBanned || profResult.isSuspended) {
        setDbRestaurant(null);
        setCategories([]);
        setMenuItems([]);
        setOffers([]);
        return;
      }

      const ownerName =
        profResult.profile?.full_name ||
        authUser.user_metadata?.full_name ||
        authUser.user_metadata?.name ||
        authUser.email?.split('@')[0] ||
        'مالك المطعم';

      const ownerPhone =
        profResult.profile?.phone || authUser.user_metadata?.phone || '';

      const ownerObj: RestaurantOwner = {
        id: authUser.id,
        fullName: ownerName,
        phone: ownerPhone,
        email: authUser.email || '',
      };
      setOwner(ownerObj);

      // 2. Fetch Restaurant owned by this user
      const restResult = await fetchOwnerRestaurant(authUser.id);
      if (sequence !== loadSequenceRef.current) return;

      if (restResult.error) {
        setDataLoadError(restResult.error);
        return;
      }

      if (restResult.restaurant) {
        setDbRestaurant(restResult.restaurant);
        activeRestaurantIdRef.current = restResult.restaurant.id;
        const mapped = mapDbRestaurantToProfile(
          restResult.restaurant,
          authUser.email || '',
          ownerName
        );
        if (sequence !== loadSequenceRef.current) return;
        setRestaurant(mapped);
        loadedUserIdRef.current = authUser.id;

        // تحميل أقسام وأصناف وعروض المطعم الحقيقي بالتزامن مع التحقق المستمر من التسلسل والمطعم
        await Promise.all([
          loadMenuData(restResult.restaurant.id, sequence),
          loadOffersData(restResult.restaurant.id, sequence),
        ]);
      } else {
        setDbRestaurant(null);
        activeRestaurantIdRef.current = null;
        setRestaurant({
          ...EMPTY_RESTAURANT,
          registrationStatus: 'NOT_REGISTERED',
        });
        setCategories([]);
        setMenuItems([]);
        setOffers([]);
        loadedUserIdRef.current = authUser.id;
      }
    },
    [mapDbRestaurantToProfile, loadMenuData, loadOffersData]
  );

  /**
   * المنسق المشترك الموحد لجميع مسارات تحميل بيانات المستخدم:
   * 1. يمنع تسرب بيانات المستخدم والمطعم السابق بتصفيرها فورًا إذا تغير المستخدم قبل بدء أي طلب
   * 2. يمنع تشغيل تحميلين متزامنين لنفس المستخدم (يعيد الوعد الجاري بأمان)
   * 3. يدعم التبديل الفوري إذا تغير المستخدم بجلسة أحدث
   * 4. يمنع نتيجة قديمة من استبدال بيانات جلسة مستخدم أحدث عبر loadSequenceRef
   * 5. يضمن عودة authLoading إلى false وإلغاء القفل في جميع حالات النجاح والفشل والاستثناءات
   */
  const coordinateLoadUserData = useCallback(
    async (authUser: User): Promise<void> => {
      if (!authUser?.id) {
        setAuthLoading(false);
        return;
      }

      // إذا كان تحميل نفس المستخدم جاريًا بالفعل، نتعامل مع العملية الجارية بأمان دون تكرار
      if (
        activeUserIdRef.current === authUser.id &&
        activeLoadPromiseRef.current
      ) {
        try {
          await activeLoadPromiseRef.current;
        } catch {
          // الخطأ يعالج داخل الوعد النشط
        }
        return;
      }

      // إذا كان المستخدم الجديد مختلفًا عن المستخدم المحمل حاليًا: تصفير بيانات السابق فورًا قبل البدء
      const isDifferentUser =
        loadedUserIdRef.current !== null && loadedUserIdRef.current !== authUser.id;
      if (isDifferentUser) {
        resetUserDataState();
        loadedUserIdRef.current = null;
      }

      // زيادة رقم التسلسل لإبطال أي عمليات أقدم إذا تغير المستخدم
      const thisSequence = ++loadSequenceRef.current;
      activeUserIdRef.current = authUser.id;
      setAuthLoading(true);

      const promise = (async () => {
        try {
          await executeLoadUserData(authUser, thisSequence);
        } catch (err: any) {
          if (thisSequence === loadSequenceRef.current) {
            console.error('Unhandled error in coordinateLoadUserData:', err);
            setDataLoadError(
              err?.message || 'حدث استثناء غير متوقع أثناء تحميل بيانات الحساب والمطعم.'
            );
          }
        } finally {
          // ضمان إنهاء حالة التحميل وتحرير القفل حتمًا لجميع المسارات
          if (thisSequence === loadSequenceRef.current) {
            setAuthLoading(false);
            activeLoadPromiseRef.current = null;
            activeUserIdRef.current = null;
          }
        }
      })();

      activeLoadPromiseRef.current = promise;
      await promise;
    },
    [executeLoadUserData, resetUserDataState]
  );

  const retryLoadUserData = useCallback(async () => {
    setDataLoadError(null);
    if (user) {
      await coordinateLoadUserData(user);
    } else {
      setAuthLoading(false);
    }
  }, [user, coordinateLoadUserData]);

  // Initialize and listen to Supabase Auth session
  useEffect(() => {
    let isMounted = true;

    async function initAuth() {
      if (!isSupabaseConfigured) {
        console.warn('Supabase is not configured with environment variables.');
        setAuthLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) {
          console.error('Error getting Supabase session:', error);
          if (isMounted) {
            setDataLoadError('فشل استعادة جلسة المستخدم من Supabase. يرجى التحقق من الاتصال.');
          }
        }

        if (isMounted) {
          const currentSession = data?.session || null;
          setSession(currentSession);
          setUser(currentSession?.user || null);

          if (currentSession?.user) {
            await coordinateLoadUserData(currentSession.user);
          } else {
            setDbRestaurant(null);
            setRestaurant(EMPTY_RESTAURANT);
            setOwner(EMPTY_OWNER);
            setAuthLoading(false);
          }
        }
      } catch (err: any) {
        console.error('Failed to init auth session:', err);
        if (isMounted) {
          setDataLoadError(err?.message || 'تعذر استعادة جلسة المستخدم من Supabase.');
        }
      } finally {
        if (isMounted && !activeLoadPromiseRef.current) {
          setAuthLoading(false);
        }
      }
    }

    initAuth();

    // Listen to Auth State Changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      if (!isMounted) return;

      // Ignore INITIAL_SESSION event because initAuth() already handles initial getSession()
      if (event === 'INITIAL_SESSION') {
        return;
      }

      // If token refreshed, just update session & user without resetting full state or reloading
      if (event === 'TOKEN_REFRESHED') {
        setSession(newSession);
        setUser(newSession?.user || null);
        return;
      }

      setSession(newSession);
      setUser(newSession?.user || null);

      if (newSession?.user) {
        await coordinateLoadUserData(newSession.user);
      } else {
        loadSequenceRef.current++;
        activeLoadPromiseRef.current = null;
        activeUserIdRef.current = null;
        loadedUserIdRef.current = null;
        resetUserDataState();
        setAuthLoading(false);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [coordinateLoadUserData]);

  // Auth Operations
  const login = async (email: string, pass: string): Promise<AuthResult> => {
    if (!isSupabaseConfigured) {
      return {
        success: false,
        error:
          'لم يتم ضبط متغيرات Supabase في بيئة التشغيل (VITE_SUPABASE_URL و VITE_SUPABASE_ANON_KEY).',
      };
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: pass,
      });

      if (error) {
        return { success: false, error: translateAuthError(error.message) };
      }

      if (!data.user) {
        return { success: false, error: 'لم يتم العثور على بيانات المستخدم.' };
      }

      // Session will be updated by onAuthStateChange, and coordinateLoadUserData ensures only one load runs
      await coordinateLoadUserData(data.user);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: translateAuthError(err?.message || 'فشل الاتصال') };
    }
  };

  const signUp = async (
    email: string,
    pass: string,
    fullName: string,
    phone: string
  ): Promise<AuthResult> => {
    if (!isSupabaseConfigured) {
      return {
        success: false,
        error: 'خدمة Supabase غير مكونة بالبيئة الحالية.',
      };
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password: pass,
        options: {
          data: {
            full_name: fullName.trim(),
            name: fullName.trim(),
            phone: phone.trim(),
          },
        },
      });

      if (error) {
        return { success: false, error: translateAuthError(error.message) };
      }

      // If user is returned without session, Supabase requires email confirmation
      if (data.user && !data.session) {
        return {
          success: true,
          requiresEmailConfirmation: true,
        };
      }

      if (data.user) {
        await coordinateLoadUserData(data.user);
      }

      return { success: true };
    } catch (err: any) {
      return { success: false, error: translateAuthError(err?.message || 'فشل التسجيل') };
    }
  };

  const resetPassword = async (email: string): Promise<AuthResult> => {
    if (!isSupabaseConfigured) {
      return { success: false, error: 'خدمة Supabase غير مكونة.' };
    }

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: window.location.origin,
      });

      if (error) {
        return { success: false, error: translateAuthError(error.message) };
      }

      return { success: true };
    } catch (err: any) {
      return { success: false, error: translateAuthError(err?.message || '') };
    }
  };

  const logout = async () => {
    loadSequenceRef.current++;
    activeLoadPromiseRef.current = null;
    activeUserIdRef.current = null;
    loadedUserIdRef.current = null;
    if (isSupabaseConfigured) {
      try {
        await supabase.auth.signOut();
      } catch (err) {
        console.error('Logout error:', err);
      }
    }
    resetUserDataState();
    setSession(null);
    setUser(null);
    setAuthLoading(false);
  };

  const refreshRestaurant = async () => {
    if (user) {
      await coordinateLoadUserData(user);
    }
  };

  // Real Restaurant Registration Submission
  const registerRestaurantReal = async (
    payload: CreateRestaurantPayload
  ): Promise<CreateRestaurantResult> => {
    const result = await attemptCreateRestaurant(payload);
    if (result.success && result.restaurant && user) {
      await coordinateLoadUserData(user);
    }
    return result;
  };

  const registerRestaurant = async (
    ownerData: Omit<RestaurantOwner, 'id'>,
    restData: Partial<RestaurantProfile>
  ): Promise<CreateRestaurantResult> => {
    if (!user) {
      return {
        success: false,
        error: 'يجب تسجيل الدخول بحساب مالك أولاً لإتمام تسجيل المطعم.',
      };
    }

    const payload: CreateRestaurantPayload = {
      owner_user_id: user.id,
      name: restData.name || 'مطعم جديد',
      description: restData.description || '',
      phone: restData.phone || ownerData.phone || '',
      address: restData.address || '',
      latitude: restData.latitude,
      longitude: restData.longitude,
      governorate_id: String(restData.governorateId || ''),
      center_id: String(restData.centerId || ''),
      area_id: restData.areaId ? String(restData.areaId) : null,
      image_url: restData.logo,
    };

    return await registerRestaurantReal(payload);
  };

  const updateOwner = (updated: Partial<RestaurantOwner>) => {
    setOwner((prev) => ({ ...prev, ...updated }));
  };

  const updateRestaurant = (updated: Partial<RestaurantProfile>) => {
    setRestaurant((prev) => ({ ...prev, ...updated }));
  };

  // Real Database Update for Restaurant Settings
  const updateRestaurantSettingsDb = async (updates: {
    name?: string;
    description?: string;
    phone?: string;
    address?: string;
    is_open?: boolean;
    delivery_fee?: number;
    max_delivery_radius_km?: number;
  }): Promise<{ success: boolean; error?: string }> => {
    if (!restaurant.id) {
      return { success: false, error: 'معرف المطعم غير متوفر لحفظ الإعدادات في قاعدة البيانات.' };
    }

    const res = await updateRestaurantDbSettings(restaurant.id, updates);
    if (res.error) {
      return { success: false, error: res.error };
    }

    setDbRestaurant((prev) => (prev ? { ...prev, ...updates } : prev));

    setRestaurant((prev) => ({
      ...prev,
      name: updates.name !== undefined ? updates.name : prev.name,
      description: updates.description !== undefined ? updates.description : prev.description,
      phone: updates.phone !== undefined ? updates.phone : prev.phone,
      address: updates.address !== undefined ? updates.address : prev.address,
      isOpen: updates.is_open !== undefined ? updates.is_open : prev.isOpen,
      deliveryFee: updates.delivery_fee !== undefined ? updates.delivery_fee : prev.deliveryFee,
      deliveryRadiusKm: updates.max_delivery_radius_km !== undefined ? updates.max_delivery_radius_km : prev.deliveryRadiusKm,
    }));

    return { success: true };
  };

  const setRegistrationStatus = (status: RegistrationStatus, reason?: string) => {
    setRestaurant((prev) => ({
      ...prev,
      registrationStatus: status,
      rejectionReason: reason || (status === 'REJECTED' ? 'نقص في المستندات' : undefined),
    }));
  };

  // Menu Categories - Real Database Operations
  const addCategoryAsync = async (
    name: string,
    description?: string
  ): Promise<{ success: boolean; error?: string; category?: MenuCategory }> => {
    if (!restaurant.id) {
      return { success: false, error: 'لم يتم العثور على مطعم مسجل لحسابك.' };
    }

    const nextSort = categories.length + 1;
    const res = await createRestaurantMenuCategory(restaurant.id, name, nextSort);
    if (res.error || !res.data) {
      return { success: false, error: res.error || 'فشل حفظ القسم في قاعدة البيانات.' };
    }

    setCategories((prev) => [...prev, res.data!]);
    return { success: true, category: res.data };
  };

  const addCategory = (name: string, description?: string) => {
    addCategoryAsync(name, description);
  };

  const updateCategoryAsync = async (
    id: string,
    updated: Partial<MenuCategory>
  ): Promise<{ success: boolean; error?: string }> => {
    const res = await updateRestaurantMenuCategory(id, {
      name: updated.name,
      sortOrder: updated.sortOrder,
      isVisible: updated.isVisible,
    });

    if (res.error) {
      return { success: false, error: res.error };
    }

    setCategories((prev) => prev.map((c) => (c.id === id ? { ...c, ...updated } : c)));
    return { success: true };
  };

  const updateCategory = (id: string, updated: Partial<MenuCategory>) => {
    updateCategoryAsync(id, updated);
  };

  const deleteCategoryAsync = async (
    id: string
  ): Promise<{ success: boolean; error?: string }> => {
    const res = await deleteRestaurantMenuCategory(id);
    if (res.error) {
      return { success: false, error: res.error };
    }

    setCategories((prev) => prev.filter((c) => c.id !== id));
    return { success: true };
  };

  const deleteCategory = (id: string): boolean => {
    deleteCategoryAsync(id);
    return true;
  };

  const reorderCategories = (orderedIds: string[]) => {
    setCategories((prev) => {
      const map = new Map(prev.map((c) => [c.id, c]));
      return orderedIds.map((id, index) => {
        const item = map.get(id);
        const sortOrder = index + 1;
        if (item) {
          updateRestaurantMenuCategory(id, { sortOrder }).catch(console.warn);
          return { ...item, sortOrder };
        }
        return item!;
      }).filter(Boolean);
    });
  };

  // Menu Items - Real Database Operations
  const addItemAsync = async (
    item: Omit<MenuItem, 'id'>
  ): Promise<{ success: boolean; error?: string; item?: MenuItem }> => {
    if (!restaurant.id) {
      return { success: false, error: 'لم يتم العثور على مطعم مسجل لحسابك.' };
    }

    const res = await createRestaurantMenuItem(restaurant.id, item);
    if (res.error || !res.data) {
      return { success: false, error: res.error || 'فشل حفظ الصنف في قاعدة البيانات.' };
    }

    setMenuItems((prev) => [...prev, res.data!]);
    return { success: true, item: res.data };
  };

  const addItem = (item: Omit<MenuItem, 'id'>) => {
    addItemAsync(item);
  };

  const updateItemAsync = async (
    id: string,
    updated: Partial<MenuItem>
  ): Promise<{ success: boolean; error?: string }> => {
    if (!restaurant.id) {
      return { success: false, error: 'معرف المطعم غير متوفر.' };
    }

    const res = await updateRestaurantMenuItem(restaurant.id, id, updated);
    if (res.error) {
      return { success: false, error: res.error };
    }

    setMenuItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...updated } : i)));
    return { success: true };
  };

  const updateItem = (id: string, updated: Partial<MenuItem>) => {
    updateItemAsync(id, updated);
  };

  const toggleItemAvailabilityAsync = async (
    id: string
  ): Promise<{ success: boolean; error?: string }> => {
    const target = menuItems.find((i) => i.id === id);
    if (!target) return { success: false, error: 'الصنف غير موجود.' };

    const nextState = !target.isAvailable;
    const res = await toggleRestaurantMenuItemAvailability(id, nextState);
    if (res.error) {
      return { success: false, error: res.error };
    }

    setMenuItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, isAvailable: nextState } : i))
    );
    return { success: true };
  };

  const toggleItemAvailability = (id: string) => {
    toggleItemAvailabilityAsync(id);
  };

  const deleteItemAsync = async (
    id: string
  ): Promise<{ success: boolean; error?: string }> => {
    const res = await deleteRestaurantMenuItem(id);
    if (res.error) {
      return { success: false, error: res.error };
    }

    setMenuItems((prev) => prev.filter((i) => i.id !== id));
    return { success: true };
  };

  const deleteItem = (id: string) => {
    deleteItemAsync(id);
  };

  // Offers - Real Database Operations
  const addOfferAsync = async (
    offer: Omit<Offer, 'id'>
  ): Promise<{ success: boolean; error?: string; offer?: Offer }> => {
    if (!restaurant.id) {
      return { success: false, error: 'لم يتم العثور على مطعم مسجل لحسابك.' };
    }

    const res = await createRestaurantOffer(restaurant.id, offer);
    if (res.error || !res.data) {
      return { success: false, error: res.error || 'فشل حفظ العرض في قاعدة البيانات.' };
    }

    setOffers((prev) => [res.data!, ...prev]);
    return { success: true, offer: res.data };
  };

  const addOffer = (offer: Omit<Offer, 'id'>) => {
    addOfferAsync(offer);
  };

  const updateOfferAsync = async (
    id: string,
    updated: Partial<Offer>
  ): Promise<{ success: boolean; error?: string }> => {
    const res = await updateRestaurantOffer(id, updated);
    if (res.error) {
      return { success: false, error: res.error };
    }

    setOffers((prev) => prev.map((o) => (o.id === id ? { ...o, ...updated } : o)));
    return { success: true };
  };

  const updateOffer = (id: string, updated: Partial<Offer>) => {
    updateOfferAsync(id, updated);
  };

  const toggleOfferStatusAsync = async (
    id: string
  ): Promise<{ success: boolean; error?: string }> => {
    const target = offers.find((o) => o.id === id);
    if (!target) return { success: false, error: 'العرض غير موجود.' };

    const nextActive = target.status !== 'ACTIVE';
    const res = await toggleRestaurantOfferStatus(id, nextActive);
    if (res.error) {
      return { success: false, error: res.error };
    }

    setOffers((prev) =>
      prev.map((o) => (o.id === id ? { ...o, status: nextActive ? 'ACTIVE' : 'PAUSED' } : o))
    );
    return { success: true };
  };

  const toggleOfferStatus = (id: string) => {
    toggleOfferStatusAsync(id);
  };

  const deleteOfferAsync = async (
    id: string
  ): Promise<{ success: boolean; error?: string }> => {
    const res = await deleteRestaurantOffer(id);
    if (res.error) {
      return { success: false, error: res.error };
    }

    setOffers((prev) => prev.filter((o) => o.id !== id));
    return { success: true };
  };

  const deleteOffer = (id: string) => {
    deleteOfferAsync(id);
  };

  // Operations - Phase 2 Order Lifecycle & Delivery Toggle
  const updateRestaurantDeliveryEnabled = async (
    enabled: boolean
  ): Promise<{ success: boolean; error?: string }> => {
    const res = await setRestaurantDeliveryEnabledRpc(enabled);
    if (!res.success) {
      return { success: false, error: res.error };
    }
    setRestaurant((prev) => ({
      ...prev,
      restaurantDeliveryEnabled: enabled,
    }));
    if (dbRestaurant) {
      setDbRestaurant((prev) =>
        prev ? { ...prev, restaurant_delivery_enabled: enabled } : null
      );
    }
    return { success: true };
  };

  const acceptOrderWorkflow = async (
    orderId: string,
    fulfillmentRoute: 'restaurant_delivery' | 'driver_delivery'
  ): Promise<{ success: boolean; error?: string }> => {
    const res = await acceptOrderWithRoute(orderId, fulfillmentRoute);
    if (!res.success) {
      return { success: false, error: res.error };
    }
    orderRealtimeManager.triggerSync();
    return { success: true };
  };

  const rejectOrderWorkflow = async (
    orderId: string,
    reason: string
  ): Promise<{ success: boolean; error?: string }> => {
    const res = await rejectOrderRpc(orderId, reason);
    if (!res.success) {
      return { success: false, error: res.error };
    }
    orderRealtimeManager.triggerSync();
    return { success: true };
  };

  const setOrderPreparingWorkflow = async (
    orderId: string
  ): Promise<{ success: boolean; error?: string }> => {
    const res = await setOrderPreparingRpc(orderId);
    if (!res.success) {
      return { success: false, error: res.error };
    }
    orderRealtimeManager.triggerSync();
    return { success: true };
  };

  const markOrderReadyWorkflow = async (
    orderId: string
  ): Promise<{ success: boolean; error?: string }> => {
    const res = await markOrderReadyRpc(orderId);
    if (!res.success) {
      return { success: false, error: res.error };
    }
    orderRealtimeManager.triggerSync();
    return { success: true };
  };

  const decideCancellationWorkflow = async (
    requestId: string,
    approve: boolean,
    reason?: string
  ): Promise<{ success: boolean; error?: string }> => {
    const res = await decideCancellationRpc(requestId, approve, reason);
    if (!res.success) {
      return { success: false, error: res.error };
    }
    await refreshPendingCancellations();
    orderRealtimeManager.triggerSync();
    return { success: true };
  };

  const acceptOrder = (orderId: string) => {
    acceptOrderWorkflow(orderId, 'restaurant_delivery');
  };

  const rejectOrder = (orderId: string, reason: string) => {
    rejectOrderWorkflow(orderId, reason);
  };

  const startPreparingOrder = (orderId: string) => {
    setOrderPreparingWorkflow(orderId);
  };

  const markOrderReady = (orderId: string) => {
    markOrderReadyWorkflow(orderId);
  };

  const completeOrder = (_orderId: string) => {
    console.warn('اكتمال الطلب يتم تلقائياً بواسطة المنظومة أو السائق عند التسليم الفعلي.');
  };

  const injectMockOrder = (route: ExecutionRoute = 'SELF_DELIVERY') => {
    // منع خلط الطلبات التجريبية بالطلبات الحقيقية إذا كان الحساب مرتبطاً بمطعم حقيقي
    if (hasRestaurant && dbRestaurant?.id) {
      console.warn('تم تعطيل توليد الطلبات التجريبية نظراً لارتباط الحساب بمطعم فعلي في قاعدة البيانات.');
      return;
    }
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const orderNum = `TB-${randomSuffix}`;
    const sampleItem = menuItems.find((i) => i.isAvailable) || menuItems[0];
    const qty = 2;
    const itemTotal = (sampleItem?.price || 100) * qty;
    const foodTotal = itemTotal;
    const deliveryFee = restaurant.deliveryFee || 25;
    const grandTotal = foodTotal + deliveryFee;
    const commissionRate = (restaurant.adminCommissionPercent || 10) / 100;
    const commissionAmount = Number((foodTotal * commissionRate).toFixed(2));
    const netDue = route === 'SELF_DELIVERY' ? foodTotal - commissionAmount + deliveryFee : foodTotal - commissionAmount;

    const newOrder: Order = {
      id: `ord-${Date.now()}`,
      orderNumber: orderNum,
      createdAt: new Date().toISOString(),
      customer: {
        name: 'عميل طلبات البيت',
        phone: '01011223344',
        address: restaurant.address || 'العنوان المسجل',
        governorate: restaurant.governorate,
        city: restaurant.city,
      },
      items: [
        {
          itemId: sampleItem?.id || 'sample',
          name: sampleItem?.name || 'وجبة تجريبية',
          priceAtOrder: sampleItem?.price || 100,
          quantity: qty,
          selectedOptions: [],
          itemDiscount: 0,
        },
      ],
      subtotal: itemTotal,
      discountTotal: 0,
      foodTotal,
      deliveryFee,
      grandTotal,
      paymentMethod: 'CASH_ON_DELIVERY',
      route,
      status: 'PENDING',
      statusHistory: [
        { status: 'PENDING', timestamp: new Date().toISOString(), note: 'تم استلام الطلب', updatedBy: 'نظام طلبات البيت' },
      ],
      adminCommissionRate: commissionRate,
      adminCommissionAmount: commissionAmount,
      netRestaurantDue: netDue,
      settlementStatus: 'PENDING',
    };

    setOrders((prev) => [newOrder, ...prev]);
    setNewOrderAlert(newOrder);
  };

  const clearNewOrderAlert = () => setNewOrderAlert(null);

  const recordSettlement = (amount: number, receiptNum: string, notes: string) => {
    const mov: FinancialMovement = {
      id: `mov-${Date.now()}`,
      date: new Date().toISOString(),
      type: 'PARTIAL_SETTLEMENT',
      description: `تسوية أرباح مالية معتمدة (#${receiptNum})`,
      amount,
      isCredit: false,
      settlementStatus: 'SETTLED',
      receiptNumber: receiptNum,
      notes,
    };
    setMovements((prev) => [mov, ...prev]);
  };

  const markNotificationAsRead = (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  const markAllNotificationsAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const resetAllData = () => {
    setCategories([]);
    setMenuItems([]);
    setOffers([]);
    setOrders([]);
    setMovements([]);
    setNotifications([]);
  };

  // Stats
  const pendingOrdersCount = orders.filter((o) => o.status === 'PENDING').length;
  const acceptedOrdersCount = orders.filter((o) => o.status === 'ACCEPTED').length;
  const awaitingDriverOrdersCount = orders.filter((o) => o.status === 'AWAITING_DRIVER').length;
  const preparingOrdersCount = orders.filter((o) => o.status === 'PREPARING').length;
  const readyOrdersCount = orders.filter((o) => o.status === 'READY').length;
  const completedOrdersCount = orders.filter((o) => o.status === 'COMPLETED').length;
  const rejectedOrdersCount = orders.filter((o) => o.status === 'REJECTED' || o.status === 'CANCELLED').length;
  const totalOrdersCount = orders.length;

  const completedOrders = orders.filter((o) => o.status === 'COMPLETED');
  const totalFoodSales = completedOrders.reduce((sum, o) => sum + o.subtotal, 0);
  const totalDiscounts = completedOrders.reduce((sum, o) => sum + o.discountTotal, 0);
  const netFoodSales = completedOrders.reduce((sum, o) => sum + o.foodTotal, 0);
  const totalAdminCommission = completedOrders.reduce((sum, o) => sum + o.adminCommissionAmount, 0);
  const totalNetRestaurantDue = completedOrders.reduce((sum, o) => sum + o.netRestaurantDue, 0);

  const settledPayouts = movements
    .filter((m) => m.type === 'PARTIAL_SETTLEMENT' || m.type === 'CASH_PAYOUT')
    .reduce((sum, m) => sum + m.amount, 0);

  const totalCollected = movements.filter((m) => m.isCredit).reduce((sum, m) => sum + m.amount, 0);
  const totalUnsettled = Math.max(0, totalNetRestaurantDue - settledPayouts);

  const stats = {
    pendingOrdersCount,
    acceptedOrdersCount,
    awaitingDriverOrdersCount,
    preparingOrdersCount,
    readyOrdersCount,
    completedOrdersCount,
    rejectedOrdersCount,
    totalOrdersCount,
    totalFoodSales,
    totalDiscounts,
    netFoodSales,
    totalAdminCommission,
    totalNetRestaurantDue,
    totalCollected,
    totalUnsettled,
  };

  return (
    <AppContext.Provider
      value={{
        isSupabaseReady: isSupabaseConfigured,
        authLoading,
        isAuthenticated,
        user,
        session,
        userProfile,
        isUserBanned,
        isUserSuspended,
        banReason,
        hasRestaurant,
        owner,
        restaurant,
        dbRestaurant,
        login,
        signUp,
        resetPassword,
        logout,
        refreshRestaurant,
        dataLoadError,
        retryLoadUserData,
        updateOwner,
        updateRestaurant,
        updateRestaurantSettingsDb,
        setRegistrationStatus,
        registerRestaurantReal,
        registerRestaurant,
        categories,
        menuItems,
        menuLoading,
        menuError,
        reloadMenu,
        addCategory,
        addCategoryAsync,
        updateCategory,
        updateCategoryAsync,
        deleteCategory,
        deleteCategoryAsync,
        reorderCategories,
        addItem,
        addItemAsync,
        updateItem,
        updateItemAsync,
        deleteItem,
        deleteItemAsync,
        toggleItemAvailability,
        toggleItemAvailabilityAsync,
        offers,
        offersLoading,
        offersError,
        reloadOffers,
        addOffer,
        addOfferAsync,
        updateOffer,
        updateOfferAsync,
        deleteOffer,
        deleteOfferAsync,
        toggleOfferStatus,
        toggleOfferStatusAsync,
        orders,
        ordersLoading,
        ordersError,
        ordersRealtimeStatus,
        refreshOrders,
        acceptOrder,
        rejectOrder,
        startPreparingOrder,
        markOrderReady,
        completeOrder,
        injectMockOrder,
        updateRestaurantDeliveryEnabled,
        acceptOrderWorkflow,
        rejectOrderWorkflow,
        setOrderPreparingWorkflow,
        markOrderReadyWorkflow,
        decideCancellationWorkflow,
        pendingCancellations,
        refreshPendingCancellations,
        movements,
        recordSettlement,
        notifications,
        markNotificationAsRead,
        markAllNotificationsAsRead,
        newOrderAlert,
        clearNewOrderAlert,
        resetAllData,
        stats,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
