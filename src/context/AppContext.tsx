import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
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
  INITIAL_OWNER,
  INITIAL_RESTAURANT,
  INITIAL_CATEGORIES,
  INITIAL_MENU_ITEMS,
  INITIAL_OFFERS,
  INITIAL_ORDERS,
  INITIAL_MOVEMENTS,
  INITIAL_NOTIFICATIONS,
} from '../services/mockData';

interface AppContextType {
  // Auth & Profile
  isAuthenticated: boolean;
  owner: RestaurantOwner;
  restaurant: RestaurantProfile;
  login: (email: string, pass: string) => boolean;
  logout: () => void;
  updateOwner: (updated: Partial<RestaurantOwner>) => void;
  updateRestaurant: (updated: Partial<RestaurantProfile>) => void;
  setRegistrationStatus: (status: RegistrationStatus, reason?: string) => void;
  registerRestaurant: (ownerData: Omit<RestaurantOwner, 'id'>, restData: Partial<RestaurantProfile>) => void;

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

  // Simulation Tools
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

const STORAGE_KEY = 'talabat_elbeit_restaurant_app_v1';

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Load initial from localStorage or mockData
  const loadState = () => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {
      // Fallback
    }
    return {
      isAuthenticated: true,
      owner: INITIAL_OWNER,
      restaurant: INITIAL_RESTAURANT,
      categories: INITIAL_CATEGORIES,
      menuItems: INITIAL_MENU_ITEMS,
      offers: INITIAL_OFFERS,
      orders: INITIAL_ORDERS,
      movements: INITIAL_MOVEMENTS,
      notifications: INITIAL_NOTIFICATIONS,
    };
  };

  const initialState = loadState();

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(initialState.isAuthenticated);
  const [owner, setOwner] = useState<RestaurantOwner>(initialState.owner);
  const [restaurant, setRestaurant] = useState<RestaurantProfile>(initialState.restaurant);
  const [categories, setCategories] = useState<MenuCategory[]>(initialState.categories);
  const [menuItems, setMenuItems] = useState<MenuItem[]>(initialState.menuItems);
  const [offers, setOffers] = useState<Offer[]>(initialState.offers);
  const [orders, setOrders] = useState<Order[]>(initialState.orders);
  const [movements, setMovements] = useState<FinancialMovement[]>(initialState.movements);
  const [notifications, setNotifications] = useState<AppNotification[]>(initialState.notifications);
  const [newOrderAlert, setNewOrderAlert] = useState<Order | null>(null);

  // Sync state to LocalStorage
  useEffect(() => {
    try {
      const payload = {
        isAuthenticated,
        owner,
        restaurant,
        categories,
        menuItems,
        offers,
        orders,
        movements,
        notifications,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // ignore
    }
  }, [isAuthenticated, owner, restaurant, categories, menuItems, offers, orders, movements, notifications]);

  // Auth
  const login = (email: string, pass: string): boolean => {
    if (email.trim() && pass.trim()) {
      setIsAuthenticated(true);
      return true;
    }
    return false;
  };

  const logout = () => {
    setIsAuthenticated(false);
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
      rejectionReason: reason || (status === 'REJECTED' ? 'نقص في مستندات السجل التجاري والمطابقة الصحية' : undefined),
    }));
  };

  const registerRestaurant = (ownerData: Omit<RestaurantOwner, 'id'>, restData: Partial<RestaurantProfile>) => {
    const newOwner: RestaurantOwner = {
      id: `owner-${Date.now()}`,
      ...ownerData,
    };
    const newRest: RestaurantProfile = {
      ...INITIAL_RESTAURANT,
      id: `rest-${Date.now()}`,
      ...restData,
      adminCommissionPercent: 10, // Central administration rule!
      registrationStatus: 'PENDING',
      registrationDate: new Date().toISOString(),
    };
    setOwner(newOwner);
    setRestaurant(newRest);
    setIsAuthenticated(true);
  };

  // Categories
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
    // Check if category has items
    const hasItems = menuItems.some((i) => i.categoryId === id);
    if (hasItems) {
      return false; // prevent accidental orphan items
    }
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
    const newItem: MenuItem = {
      ...item,
      id: `item-${Date.now()}`,
    };
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
    const newOff: Offer = {
      ...offer,
      id: `offer-${Date.now()}`,
      sortOrder: offers.length + 1,
    };
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
      prev.map((o) => {
        if (o.id === id) {
          const nextStatus = o.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
          return { ...o, status: nextStatus };
        }
        return o;
      })
    );
  };

  // Orders Transitions
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
          {
            status: nextStatus,
            timestamp: new Date().toISOString(),
            note,
            updatedBy,
          },
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
    updateOrderStatus(
      orderId,
      'ACCEPTED',
      'تم قبول الطلب رسميًا من قِبل المطعم وإصدار الفاتورة للعميل.',
      'مدير المطعم'
    );
    // Add in-app notification
    const ord = orders.find((o) => o.id === orderId);
    if (ord) {
      addNotification({
        title: `تم قبول الطلب #${ord.orderNumber}`,
        message: 'تم إصدار الفاتورة وجاهز للبدء في التجهيز.',
        type: 'ORDER',
        orderId,
      });
    }
  };

  const rejectOrder = (orderId: string, reason: string) => {
    updateOrderStatus(
      orderId,
      'REJECTED',
      `اعتذر المطعم عن تنفيذ الطلب: ${reason}`,
      'مدير المطعم',
      reason
    );
    const ord = orders.find((o) => o.id === orderId);
    if (ord) {
      addNotification({
        title: `تم رفض الطلب #${ord.orderNumber}`,
        message: `السبب: ${reason}`,
        type: 'ALERT',
        orderId,
      });
    }
  };

  const startPreparingOrder = (orderId: string) => {
    updateOrderStatus(
      orderId,
      'PREPARING',
      'بدأ مطبخ المطعم في تجهيز وطهي أصناف الطلب.',
      'طاقم المطبخ'
    );
  };

  const markOrderReady = (orderId: string) => {
    updateOrderStatus(
      orderId,
      'READY',
      'تم الانتهاء من تجهيز وتغليف الطلب وهو جاهز لتسليمه للطيار.',
      'طاقم المطبخ'
    );
  };

  const completeOrder = (orderId: string) => {
    const ord = orders.find((o) => o.id === orderId);
    if (!ord) return;

    updateOrderStatus(
      orderId,
      'COMPLETED',
      'تم تسليم الطلب للعميل وتحصيل القيمة نقدًا بالكامل بنجاح.',
      'طيار المطعم'
    );

    // If this is self-delivery, log the financial movements
    if (ord.route === 'SELF_DELIVERY') {
      const foodMovement: FinancialMovement = {
        id: `mov-${Date.now()}-1`,
        date: new Date().toISOString(),
        orderId: ord.id,
        orderNumber: ord.orderNumber,
        type: 'FOOD_SALE',
        description: `قيمة طعام مباع بعد الخصم (طلب #${ord.orderNumber})`,
        amount: ord.foodTotal,
        isCredit: true,
        settlementStatus: 'SETTLED',
        receiptNumber: `REC-${Date.now().toString().slice(-6)}`,
        notes: 'تم استلام المبلغ كاش بواسطة دليفري المطعم.',
      };

      const deliveryMovement: FinancialMovement = {
        id: `mov-${Date.now()}-2`,
        date: new Date().toISOString(),
        orderId: ord.id,
        orderNumber: ord.orderNumber,
        type: 'DELIVERY_FEE_EARNED',
        description: `رسوم توصيل ذاتي للمطعم (طلب #${ord.orderNumber})`,
        amount: ord.deliveryFee,
        isCredit: true,
        settlementStatus: 'SETTLED',
        receiptNumber: `REC-${Date.now().toString().slice(-6)}`,
      };

      const commMovement: FinancialMovement = {
        id: `mov-${Date.now()}-3`,
        date: new Date().toISOString(),
        orderId: ord.id,
        orderNumber: ord.orderNumber,
        type: 'ADMIN_COMMISSION_DEDUCTION',
        description: `عمولة الإدارة (${(ord.adminCommissionRate * 100).toFixed(0)}%) على صافي الطعام`,
        amount: ord.adminCommissionAmount,
        isCredit: false,
        settlementStatus: 'SETTLED',
        notes: `أساس العمولة: ${ord.foodTotal} ج.م (باستبعاد رسوم التوصيل)`,
      };

      setMovements((prev) => [foodMovement, deliveryMovement, commMovement, ...prev]);
    }

    addNotification({
      title: `اكتمل الطلب #${ord.orderNumber} بنجاح`,
      message: `تم تحصيل ${ord.grandTotal} ج.م وتسجيل المستحقات المالية للمطعم.`,
      type: 'FINANCE',
      orderId,
    });
  };

  // Inject a mock order for interactive testing
  const injectMockOrder = (route: ExecutionRoute = 'SELF_DELIVERY') => {
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const orderNum = `TB-${randomSuffix}`;

    const sampleItem = menuItems.find((i) => i.isAvailable) || menuItems[0];
    const qty = 2;
    const itemTotal = sampleItem.price * qty;
    const discount = 20;
    const foodTotal = itemTotal - discount;
    const deliveryFee = route === 'SELF_DELIVERY' ? restaurant.deliveryFee : 30;
    const grandTotal = foodTotal + deliveryFee;
    const commissionRate = restaurant.adminCommissionPercent / 100;
    const commissionAmount = Number((foodTotal * commissionRate).toFixed(2));
    const netDue = route === 'SELF_DELIVERY' ? foodTotal - commissionAmount + deliveryFee : foodTotal - commissionAmount;

    const newOrder: Order = {
      id: `ord-${Date.now()}`,
      orderNumber: orderNum,
      createdAt: new Date().toISOString(),
      customer: {
        name: 'كريم عبد العزيز (عميل تجريبي)',
        phone: '01011223344',
        address: 'حي الجامعة، برج الأمل، الدور 3',
        governorate: restaurant.governorate,
        city: restaurant.city,
        notes: 'الرجاء التأكيد عند التحرك.',
      },
      items: [
        {
          itemId: sampleItem.id,
          name: sampleItem.name,
          priceAtOrder: sampleItem.price,
          quantity: qty,
          selectedOptions: [],
          itemDiscount: discount,
        },
      ],
      subtotal: itemTotal,
      discountTotal: discount,
      foodTotal,
      deliveryFee,
      grandTotal,
      paymentMethod: 'CASH_ON_DELIVERY',
      route,
      status: 'PENDING',
      statusHistory: [
        {
          status: 'PENDING',
          timestamp: new Date().toISOString(),
          note: route === 'SELF_DELIVERY' ? 'تم إنشاء الطلب إلكترونيًا عبر التطبيق.' : 'تم توجيه الطلب للمندوب للاتصال بالمطعم.',
          updatedBy: 'محاكي طلبات البيت',
        },
      ],
      adminCommissionRate: commissionRate,
      adminCommissionAmount: commissionAmount,
      netRestaurantDue: netDue,
      settlementStatus: 'PENDING',
      ...(route === 'COURIER_PHONE'
        ? {
            phoneCourierCallLog: {
              courierName: 'كابتن محمود الباز (مندوب تجريبي)',
              courierPhone: '01099887766',
              callTime: new Date().toISOString(),
              itemsConfirmed: true,
              notes: 'اتصل للتأكد من توافر الصنف وسعره الحالي.',
            },
          }
        : {}),
    };

    setOrders((prev) => [newOrder, ...prev]);
    setNewOrderAlert(newOrder);

    addNotification({
      title: `طلب تجريبي جديد وصل! #${orderNum}`,
      message: `قيمة الطلب: ${grandTotal} ج.م — المسار: ${route === 'SELF_DELIVERY' ? 'توصيل ذاتي' : 'مندوب واتصال هاتفي'}.`,
      type: 'ORDER',
      orderId: newOrder.id,
    });
  };

  const clearNewOrderAlert = () => {
    setNewOrderAlert(null);
  };

  // Settlements
  const recordSettlement = (amount: number, receiptNum: string, notes: string) => {
    const mov: FinancialMovement = {
      id: `mov-${Date.now()}`,
      date: new Date().toISOString(),
      type: 'PARTIAL_SETTLEMENT',
      description: `تسوية أرباح مالية معتمدة من الإدارة (إيصال #${receiptNum})`,
      amount,
      isCredit: false,
      settlementStatus: 'SETTLED',
      receiptNumber: receiptNum,
      notes,
    };
    setMovements((prev) => [mov, ...prev]);

    addNotification({
      title: `تم تسجيل تسوية مالية #${receiptNum}`,
      message: `تم تحويل وتسوية مبلغ ${amount.toLocaleString('ar-EG')} ج.م إلى حسابك.`,
      type: 'FINANCE',
    });
  };

  // Notifications
  const addNotification = (notif: Omit<AppNotification, 'id' | 'timestamp' | 'read'>) => {
    const item: AppNotification = {
      ...notif,
      id: `notif-${Date.now()}`,
      timestamp: 'الآن',
      read: false,
    };
    setNotifications((prev) => [item, ...prev]);
  };

  const markNotificationAsRead = (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  const markAllNotificationsAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  // Reset to original mock data
  const resetAllData = () => {
    localStorage.removeItem(STORAGE_KEY);
    setIsAuthenticated(true);
    setOwner(INITIAL_OWNER);
    setRestaurant(INITIAL_RESTAURANT);
    setCategories(INITIAL_CATEGORIES);
    setMenuItems(INITIAL_MENU_ITEMS);
    setOffers(INITIAL_OFFERS);
    setOrders(INITIAL_ORDERS);
    setMovements(INITIAL_MOVEMENTS);
    setNotifications(INITIAL_NOTIFICATIONS);
    setNewOrderAlert(null);
  };

  // Derived real-time statistics strictly from orders & movements!
  const pendingOrdersCount = orders.filter((o) => o.status === 'PENDING').length;
  const acceptedOrdersCount = orders.filter((o) => o.status === 'ACCEPTED').length;
  const preparingOrdersCount = orders.filter((o) => o.status === 'PREPARING').length;
  const readyOrdersCount = orders.filter((o) => o.status === 'READY').length;
  const completedOrdersCount = orders.filter((o) => o.status === 'COMPLETED').length;
  const rejectedOrdersCount = orders.filter((o) => o.status === 'REJECTED' || o.status === 'CANCELLED').length;
  const totalOrdersCount = orders.length;

  // Financial statistics from completed orders & movements
  const completedOrders = orders.filter((o) => o.status === 'COMPLETED');
  const totalFoodSales = completedOrders.reduce((sum, o) => sum + o.subtotal, 0);
  const totalDiscounts = completedOrders.reduce((sum, o) => sum + o.discountTotal, 0);
  const netFoodSales = completedOrders.reduce((sum, o) => sum + o.foodTotal, 0);
  const totalAdminCommission = completedOrders.reduce((sum, o) => sum + o.adminCommissionAmount, 0);
  const totalNetRestaurantDue = completedOrders.reduce((sum, o) => sum + o.netRestaurantDue, 0);

  // Settlement calculations from financial movements
  const settledPayouts = movements
    .filter((m) => m.type === 'PARTIAL_SETTLEMENT' || m.type === 'CASH_PAYOUT')
    .reduce((sum, m) => sum + m.amount, 0);

  const totalCollected = movements
    .filter((m) => m.isCredit)
    .reduce((sum, m) => sum + m.amount, 0);

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
        isAuthenticated,
        owner,
        restaurant,
        login,
        logout,
        updateOwner,
        updateRestaurant,
        setRegistrationStatus,
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
