import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
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
  INITIAL_CATEGORIES,
  INITIAL_MENU_ITEMS,
  INITIAL_OFFERS,
  INITIAL_ORDERS,
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
  latitude: 31.0409,
  longitude: 31.3785,
  deliveryRadiusKm: 5.0,
  maxAllowedRadiusKm: 12.0,
  deliveryFee: 25.0,
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

  // Profile & Restaurant Updates
  updateOwner: (updated: Partial<RestaurantOwner>) => void;
  updateRestaurant: (updated: Partial<RestaurantProfile>) => void;
  setRegistrationStatus: (status: RegistrationStatus, reason?: string) => void;
  registerRestaurantReal: (payload: CreateRestaurantPayload) => Promise<CreateRestaurantResult>;
  registerRestaurant: (ownerData: Omit<RestaurantOwner, 'id'>, restData: Partial<RestaurantProfile>) => Promise<CreateRestaurantResult>;

  // Categories & Menu
  categories: MenuCategory[];
  menuItems: MenuItem[];
  addCategory: (name: string, description?: string) => void;
  updateCategory: (id: string, updated: Partial<MenuCategory>) => void;
  deleteCategory: (id: string) => boolean;
  reorderCategories: (orderedIds: string[]) => void;

  addItem: (item: Omit<MenuItem, 'id'>) => void;
  updateItem: (id: string, updated: Partial<MenuItem>) => void;
  deleteItem: (id: string) => void;
  toggleItemAvailability: (id: string) => void;

  // Offers
  offers: Offer[];
  addOffer: (offer: Omit<Offer, 'id'>) => void;
  updateOffer: (id: string, updated: Partial<Offer>) => void;
  deleteOffer: (id: string) => void;
  toggleOfferStatus: (id: string) => void;

  // Orders
  orders: Order[];
  acceptOrder: (orderId: string) => void;
  rejectOrder: (orderId: string, reason: string) => void;
  startPreparingOrder: (orderId: string) => void;
  markOrderReady: (orderId: string) => void;
  completeOrder: (orderId: string) => void;
  injectMockOrder: (route?: ExecutionRoute) => void;

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

  // Real owned restaurant state
  const [dbRestaurant, setDbRestaurant] = useState<DbRestaurant | null>(null);
  const [restaurant, setRestaurant] = useState<RestaurantProfile>(EMPTY_RESTAURANT);
  const [owner, setOwner] = useState<RestaurantOwner>(EMPTY_OWNER);

  // Operational states: Start empty (no fake mock data presented as real database records)
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [movements, setMovements] = useState<FinancialMovement[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [newOrderAlert, setNewOrderAlert] = useState<Order | null>(null);

  const isAuthenticated = Boolean(session && user);
  const hasRestaurant = Boolean(dbRestaurant && dbRestaurant.id);

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
        latitude: db.latitude || 31.0409,
        longitude: db.longitude || 31.3785,
        deliveryRadiusKm: 6.0,
        maxAllowedRadiusKm: 12.0,
        deliveryFee: db.delivery_fee ?? 25.0,
        isOpen: db.is_open ?? false,
        openingHours: '10:00 ص - 01:00 ص',
        holidays: 'يعمل طوال الأسبوع',
        adminCommissionPercent: 10,
        settlementPeriod: 'WEEKLY',
        registrationStatus: regStatus,
        registrationDate: db.created_at || new Date().toISOString(),
        rawDbRestaurant: db,
      };
    },
    []
  );

  // Load User Data and Owned Restaurant from Supabase
  const loadUserData = useCallback(
    async (authUser: User) => {
      // 1. Fetch Profile
      const profResult = await fetchUserProfile(authUser.id);
      setUserProfile(profResult.profile);
      setIsUserBanned(profResult.isBanned);
      setIsUserSuspended(profResult.isSuspended);
      setBanReason(profResult.banReason);

      const ownerName =
        profResult.profile?.full_name ||
        profResult.profile?.name ||
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
      if (restResult.restaurant) {
        setDbRestaurant(restResult.restaurant);
        const mapped = mapDbRestaurantToProfile(
          restResult.restaurant,
          authUser.email || '',
          ownerName
        );
        setRestaurant(mapped);
      } else {
        setDbRestaurant(null);
        setRestaurant({
          ...EMPTY_RESTAURANT,
          registrationStatus: 'NOT_REGISTERED',
        });
      }
    },
    [mapDbRestaurantToProfile]
  );

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
        }

        if (isMounted) {
          const currentSession = data?.session || null;
          setSession(currentSession);
          setUser(currentSession?.user || null);

          if (currentSession?.user) {
            await loadUserData(currentSession.user);
          } else {
            setDbRestaurant(null);
            setRestaurant(EMPTY_RESTAURANT);
            setOwner(EMPTY_OWNER);
          }
        }
      } catch (err) {
        console.error('Failed to init auth session:', err);
      } finally {
        if (isMounted) {
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

      setSession(newSession);
      setUser(newSession?.user || null);

      if (newSession?.user) {
        setAuthLoading(true);
        await loadUserData(newSession.user);
        setAuthLoading(false);
      } else {
        setDbRestaurant(null);
        setRestaurant(EMPTY_RESTAURANT);
        setOwner(EMPTY_OWNER);
        setAuthLoading(false);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [loadUserData]);

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

      // Session will be updated by onAuthStateChange, but we also proactively load data
      await loadUserData(data.user);
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
        await loadUserData(data.user);
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
    if (isSupabaseConfigured) {
      try {
        await supabase.auth.signOut();
      } catch (err) {
        console.error('Logout error:', err);
      }
    }
    setSession(null);
    setUser(null);
    setUserProfile(null);
    setDbRestaurant(null);
    setRestaurant(EMPTY_RESTAURANT);
    setOwner(EMPTY_OWNER);
    setCategories([]);
    setMenuItems([]);
    setOffers([]);
    setOrders([]);
    setMovements([]);
    setNotifications([]);
  };

  const refreshRestaurant = async () => {
    if (user) {
      await loadUserData(user);
    }
  };

  // Real Restaurant Registration Submission
  const registerRestaurantReal = async (
    payload: CreateRestaurantPayload
  ): Promise<CreateRestaurantResult> => {
    const result = await attemptCreateRestaurant(payload);
    if (result.success && result.restaurant && user) {
      await loadUserData(user);
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

  const setRegistrationStatus = (status: RegistrationStatus, reason?: string) => {
    setRestaurant((prev) => ({
      ...prev,
      registrationStatus: status,
      rejectionReason: reason || (status === 'REJECTED' ? 'نقص في المستندات' : undefined),
    }));
  };

  // Menu Categories
  const addCategory = (name: string, description?: string) => {
    const newCat: MenuCategory = {
      id: `cat-${Date.now()}`,
      name,
      description,
      sortOrder: categories.length + 1,
      isVisible: true,
    };
    setCategories((prev) => [...prev, newCat]);
  };

  const updateCategory = (id: string, updated: Partial<MenuCategory>) => {
    setCategories((prev) => prev.map((c) => (c.id === id ? { ...c, ...updated } : c)));
  };

  const deleteCategory = (id: string): boolean => {
    const hasItems = menuItems.some((i) => i.categoryId === id);
    if (hasItems) return false;
    setCategories((prev) => prev.filter((c) => c.id !== id));
    return true;
  };

  const reorderCategories = (orderedIds: string[]) => {
    setCategories((prev) => {
      const map = new Map(prev.map((c) => [c.id, c]));
      return orderedIds.map((id, index) => ({
        ...map.get(id)!,
        sortOrder: index + 1,
      }));
    });
  };

  // Menu items
  const addItem = (item: Omit<MenuItem, 'id'>) => {
    const newItem: MenuItem = { ...item, id: `item-${Date.now()}` };
    setMenuItems((prev) => [...prev, newItem]);
  };

  const updateItem = (id: string, updated: Partial<MenuItem>) => {
    setMenuItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...updated } : i)));
  };

  const deleteItem = (id: string) => {
    setMenuItems((prev) => prev.filter((i) => i.id !== id));
  };

  const toggleItemAvailability = (id: string) => {
    setMenuItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, isAvailable: !i.isAvailable } : i))
    );
  };

  // Offers
  const addOffer = (offer: Omit<Offer, 'id'>) => {
    const newOff: Offer = { ...offer, id: `offer-${Date.now()}`, sortOrder: offers.length + 1 };
    setOffers((prev) => [...prev, newOff]);
  };

  const updateOffer = (id: string, updated: Partial<Offer>) => {
    setOffers((prev) => prev.map((o) => (o.id === id ? { ...o, ...updated } : o)));
  };

  const deleteOffer = (id: string) => {
    setOffers((prev) => prev.filter((o) => o.id !== id));
  };

  const toggleOfferStatus = (id: string) => {
    setOffers((prev) =>
      prev.map((o) => (o.id === id ? { ...o, status: o.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE' } : o))
    );
  };

  // Orders
  const updateOrderStatus = (
    orderId: string,
    nextStatus: OrderStatus,
    note: string,
    updatedBy: string,
    rejectionReason?: string
  ) => {
    setOrders((prev) =>
      prev.map((ord) => {
        if (ord.id !== orderId) return ord;
        const newHistory = [
          ...ord.statusHistory,
          { status: nextStatus, timestamp: new Date().toISOString(), note, updatedBy },
        ];
        return {
          ...ord,
          status: nextStatus,
          rejectionReason: rejectionReason || ord.rejectionReason,
          statusHistory: newHistory,
        };
      })
    );
  };

  const acceptOrder = (orderId: string) => {
    updateOrderStatus(orderId, 'ACCEPTED', 'تم قبول الطلب رسميًا من قِبل المطعم.', 'مدير المطعم');
  };

  const rejectOrder = (orderId: string, reason: string) => {
    updateOrderStatus(orderId, 'REJECTED', `اعتذر المطعم: ${reason}`, 'مدير المطعم', reason);
  };

  const startPreparingOrder = (orderId: string) => {
    updateOrderStatus(orderId, 'PREPARING', 'بدأ تجهيز أصناف الطلب.', 'طاقم المطبخ');
  };

  const markOrderReady = (orderId: string) => {
    updateOrderStatus(orderId, 'READY', 'الطلب جاهز للتسليم.', 'طاقم المطبخ');
  };

  const completeOrder = (orderId: string) => {
    updateOrderStatus(orderId, 'COMPLETED', 'تم التسليم بنجاح.', 'طيار المطعم');
  };

  const injectMockOrder = (route: ExecutionRoute = 'SELF_DELIVERY') => {
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
        updateOwner,
        updateRestaurant,
        setRegistrationStatus,
        registerRestaurantReal,
        registerRestaurant,
        categories,
        menuItems,
        addCategory,
        updateCategory,
        deleteCategory,
        reorderCategories,
        addItem,
        updateItem,
        deleteItem,
        toggleItemAvailability,
        offers,
        addOffer,
        updateOffer,
        deleteOffer,
        toggleOfferStatus,
        orders,
        acceptOrder,
        rejectOrder,
        startPreparingOrder,
        markOrderReady,
        completeOrder,
        injectMockOrder,
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
