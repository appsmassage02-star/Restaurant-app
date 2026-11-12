import {
  DbOrderWorkflowItem,
  DbPendingCancellation,
  DbRestaurantDeliveryOrder,
} from './database';

export type ExecutionRoute = 'SELF_DELIVERY' | 'COURIER_PHONE';

export type OrderStatus =
  | 'PENDING'
  | 'ACCEPTED'
  | 'AWAITING_DRIVER'
  | 'ASSIGNED_TO_DRIVER'
  | 'PREPARING'
  | 'READY'
  | 'PICKED_UP'
  | 'ON_THE_WAY'
  | 'DELIVERED'
  | 'COMPLETED'
  | 'REJECTED'
  | 'CANCELLED';

export type RegistrationStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'NOT_REGISTERED';

export type DiscountType = 'PERCENTAGE' | 'FIXED';

export type OfferStatus = 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'EXPIRED';

export type SettlementStatus = 'SETTLED' | 'PENDING' | 'PARTIAL';

export type SettlementPeriod = 'PER_ORDER' | 'DAILY' | 'WEEKLY' | 'MONTHLY';

export type MovementType =
  | 'FOOD_SALE'
  | 'DELIVERY_FEE_EARNED'
  | 'ADMIN_COMMISSION_DEDUCTION'
  | 'CASH_PAYOUT'
  | 'COURIER_COLLECTION'
  | 'PARTIAL_SETTLEMENT'
  | 'ADJUSTMENT_REFUND';

export interface OptionItem {
  id: string;
  name: string;
  price: number;
  isAvailable: boolean;
}

export interface OptionGroup {
  id: string;
  name: string;
  isRequired: boolean;
  minSelections: number;
  maxSelections: number;
  options: OptionItem[];
}

export interface MenuItem {
  id: string;
  categoryId: string;
  name: string;
  description: string;
  price: number;
  image: string;
  isAvailable: boolean;
  sortOrder: number;
  optionGroups: OptionGroup[];
}

export interface MenuCategory {
  id: string;
  name: string;
  description?: string;
  sortOrder: number;
  isVisible: boolean;
}

export interface Offer {
  id: string;
  title: string;
  description: string;
  bannerImage: string;
  discountType: DiscountType;
  discountValue: number;
  appliesToItemIds: string[]; // empty means applies to whole menu / featured
  startDate: string;
  endDate: string;
  status: OfferStatus;
  sortOrder: number;
}

export interface SelectedOption {
  groupId?: string;
  groupName: string;
  optionId?: string;
  optionName: string;
  price: number;
}

export interface OrderItem {
  id?: string;
  itemId: string;
  name: string;
  priceAtOrder: number;
  quantity: number;
  selectedOptions: SelectedOption[];
  itemDiscount: number;
  notes?: string;
}

export interface OrderStatusHistory {
  status: OrderStatus;
  rawStatus?: string;
  timestamp: string;
  note?: string;
  updatedBy: string;
}

export interface CustomerInfo {
  name: string;
  phone: string;
  address: string;
  governorate: string;
  city: string;
  center?: string;
  area?: string;
  notes?: string;
}

export interface DriverInfo {
  id?: string;
  name: string;
  phone: string;
  assignedAt?: string;
  pickedUpAt?: string;
  deliveredAt?: string;
  status?: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  createdAt: string;
  customer: CustomerInfo;
  items: OrderItem[];
  subtotal: number; // before discount
  discountTotal: number; // discount borne by restaurant
  foodTotal: number; // after discount
  deliveryFee: number;
  grandTotal: number;
  paymentMethod: 'CASH_ON_DELIVERY' | string;
  route: ExecutionRoute;
  rawRoute?: string;
  status: OrderStatus;
  rawStatus?: string;
  rejectionReason?: string;
  statusHistory: OrderStatusHistory[];
  adminCommissionRate: number; // e.g. 0.10 for 10%
  adminCommissionAmount: number; // calculated solely on foodTotal
  netRestaurantDue: number; // foodTotal - adminCommissionAmount + (route === 'SELF_DELIVERY' ? deliveryFee : 0)
  settlementStatus: SettlementStatus;
  adminFeeShare?: number;
  restaurantFeeShare?: number;
  driverFeeShare?: number;
  deliveryGovernorateSnapshot?: string;
  deliveryCenterSnapshot?: string;
  deliveryAreaSnapshot?: string;
  workflowItems?: DbOrderWorkflowItem[];
  pendingCancellation?: DbPendingCancellation | null;
  driverInfo?: DriverInfo;
  deliveryOrder?: DbRestaurantDeliveryOrder;
  phoneCourierCallLog?: {
    courierName: string;
    courierPhone: string;
    callTime: string;
    itemsConfirmed: boolean;
    notes: string;
  };
}

export interface FinancialMovement {
  id: string;
  date: string;
  orderId?: string;
  orderNumber?: string;
  type: MovementType;
  description: string;
  amount: number;
  isCredit: boolean; // true = money to restaurant, false = deduction/commission/payout
  settlementStatus: SettlementStatus;
  receiptNumber?: string;
  notes?: string;
}

export interface RestaurantOwner {
  id: string;
  fullName: string;
  phone: string;
  email: string;
}

export interface RestaurantProfile {
  id: string;
  name: string;
  description: string;
  phone: string;
  logo: string;
  coverImage: string;
  address: string;
  governorate: string;
  city: string;
  governorateId?: string | number | null;
  centerId?: string | number | null;
  areaId?: string | number | null;
  latitude: number | null;
  longitude: number | null;
  deliveryRadiusKm: number;
  maxAllowedRadiusKm: number; // Admin fixed restriction
  deliveryFee: number; // Fixed/Admin guidance
  restaurantDeliveryEnabled: boolean;
  isOpen: boolean;
  openingHours: string;
  holidays: string;
  adminCommissionPercent: number; // Read-only
  settlementPeriod: SettlementPeriod;
  registrationStatus: RegistrationStatus;
  registrationDate: string;
  rejectionReason?: string;
  rawDbRestaurant?: any;
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  type: 'ORDER' | 'FINANCE' | 'SYSTEM' | 'ALERT';
  read: boolean;
  orderId?: string;
}
