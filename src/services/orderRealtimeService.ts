/**
 * مدير الاستقبال اللحظي والمزامنة الذكية لطلبات المطعم
 * متوافق مع Supabase Realtime (postgres_changes) على جدول public.restaurant_orders
 * يتضمن:
 * 1. اشتراك لحظي بفلتر restaurant_id=eq.<id>
 * 2. قفل isFetching ومنع تداخل الاستعلامات (fetchQueued)
 * 3. تجميع الأحداث عبر Debounce
 * 4. إعادة مزامنة عند عودة الاتصال (online) وظهور التطبيق (visibilitychange)
 * 5. مزامنة احتياطية كل 30 ثانية في حال تعطل الاتصال اللحظي
 * 6. تمييز الطلبات الجديدة لمنع تكرار التنبيهات الصوتية والمرئية
 */

import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from './supabase';
import { fetchRestaurantOrders, playNewOrderChime } from './orderService';
import { Order } from '../types';

export type RealtimeConnectionStatus = 'CONNECTED' | 'CONNECTING' | 'DISCONNECTED';

export interface OrderRealtimeCallbacks {
  onOrdersUpdated: (orders: Order[]) => void;
  onNewOrderReceived: (order: Order) => void;
  onStatusChanged: (status: RealtimeConnectionStatus) => void;
  onError: (errorMessage: string) => void;
}

export class OrderRealtimeManager {
  private restaurantId: string | null = null;
  private channel: RealtimeChannel | null = null;
  private callbacks: OrderRealtimeCallbacks | null = null;

  private isFetching = false;
  private fetchQueued = false;
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private fallbackInterval: ReturnType<typeof setInterval> | null = null;

  // مجموعة لتخزين معرفات الطلبات التي تم تحميلها بالفعل لتفادي التنبيهات المكررة
  private knownOrderIds = new Set<string>();
  private isInitialLoadDone = false;

  private status: RealtimeConnectionStatus = 'DISCONNECTED';

  /**
   * بدء الاستماع والمزامنة اللحظية لمطعم محدد
   */
  public start(restaurantId: string, callbacks: OrderRealtimeCallbacks) {
    if (!restaurantId || !restaurantId.trim()) return;

    // إذا كان نفس المطعم يعمل بالفعل، نكتفي بالمزامنة
    if (this.restaurantId === restaurantId && this.channel) {
      this.triggerSync();
      return;
    }

    // إيقاف أي اشتراك سابق
    this.stop();

    this.restaurantId = restaurantId;
    this.callbacks = callbacks;
    this.knownOrderIds.clear();
    this.isInitialLoadDone = false;

    this.updateStatus('CONNECTING');

    // 1. تنفيذ الجلب الأولي المباشر
    this.executeFetch(true);

    // 2. إعداد اشتراك Supabase Realtime
    this.setupRealtimeSubscription(restaurantId);

    // 3. إعداد مستمعات الشبكة والواجهة
    this.setupWindowListeners();

    // 4. إعداد مزامنة احتياطية دورية كل 30 ثانية
    this.setupFallbackTimer();
  }

  /**
   * إيقاف الاشتراك وتنظيف كافة المؤقتات والمستمعات
   */
  public stop() {
    if (this.channel) {
      try {
        supabase.removeChannel(this.channel);
      } catch (e) {
        console.warn('Error removing realtime channel:', e);
      }
      this.channel = null;
    }

    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }

    if (this.fallbackInterval) {
      clearInterval(this.fallbackInterval);
      this.fallbackInterval = null;
    }

    this.removeWindowListeners();

    this.restaurantId = null;
    this.callbacks = null;
    this.isFetching = false;
    this.fetchQueued = false;
    this.knownOrderIds.clear();
    this.isInitialLoadDone = false;
    this.status = 'DISCONNECTED';
  }

  /**
   * طلب مزامنة عاجلة ومجمعة (Debounced)
   */
  public triggerSync() {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    this.debounceTimer = setTimeout(() => {
      this.executeFetch(false);
    }, 300);
  }

  private updateStatus(newStatus: RealtimeConnectionStatus) {
    if (this.status !== newStatus) {
      this.status = newStatus;
      this.callbacks?.onStatusChanged(newStatus);
    }
  }

  /**
   * إنشاء قناة Realtime بفلتر خاص بالمطعم
   */
  private setupRealtimeSubscription(restaurantId: string) {
    if (!isSupabaseConfigured) {
      this.updateStatus('DISCONNECTED');
      return;
    }

    const channelTopic = `restaurant_orders_${restaurantId}_${Date.now()}`;

    try {
      this.channel = supabase
        .channel(channelTopic)
        .on(
          'postgres_changes',
          {
            event: '*', // INSERT, UPDATE, DELETE
            schema: 'public',
            table: 'restaurant_orders',
            filter: `restaurant_id=eq.${restaurantId}`,
          },
          (payload) => {
            // استقبال حدث فوري: نطلب جلب موثوق للطلب مع أصنافه وسجل حالاته
            this.triggerSync();
          }
        )
        .subscribe((subscribeStatus, err) => {
          if (subscribeStatus === 'SUBSCRIBED') {
            this.updateStatus('CONNECTED');
            // عند اكتمال الاشتراك بنجاح، ننفذ مزامنة للتأكد من عدم ضياع أي طلب في الفترة الفاصلة
            this.triggerSync();
          } else if (subscribeStatus === 'CLOSED' || subscribeStatus === 'CHANNEL_ERROR') {
            this.updateStatus('DISCONNECTED');
            if (err) {
              console.warn('Realtime channel error:', err);
            }
          } else if (subscribeStatus === 'TIMED_OUT') {
            this.updateStatus('CONNECTING');
          }
        });
    } catch (e: any) {
      console.error('Failed to set up realtime subscription:', e);
      this.updateStatus('DISCONNECTED');
      this.callbacks?.onError(e?.message || 'تعذر بدء الاستماع اللحظي للطلبات.');
    }
  }

  /**
   * تنفيذ جلب الطلبات مع قفل التكرار ومقارنة المعرفات
   */
  private async executeFetch(isInitial = false) {
    if (!this.restaurantId) return;

    if (this.isFetching) {
      this.fetchQueued = true;
      return;
    }

    this.isFetching = true;

    try {
      const res = await fetchRestaurantOrders(this.restaurantId);

      if (res.error) {
        this.callbacks?.onError(res.error);
        return;
      }

      const freshOrders = res.orders;

      // فحص الطلبات الجديدة الواردة فقط بعد التحميل الأولي
      if (this.isInitialLoadDone && !isInitial) {
        freshOrders.forEach((order) => {
          if (!this.knownOrderIds.has(order.id)) {
            // طلب جديد لم يكن مسجلاً لدينا
            this.knownOrderIds.add(order.id);
            // تشغيل التنبيه الصوتي
            playNewOrderChime();
            // إخطار الواجهة
            this.callbacks?.onNewOrderReceived(order);
          }
        });
      } else {
        // التحميل الأولي: نسجل جميع المعرفات الحالية دون إصدار صوت
        freshOrders.forEach((o) => this.knownOrderIds.add(o.id));
        this.isInitialLoadDone = true;
      }

      // إرسال القائمة المحدثة بالكامل
      this.callbacks?.onOrdersUpdated(freshOrders);
    } catch (err: any) {
      this.callbacks?.onError(err?.message || 'فشلت مزامنة الطلبات.');
    } finally {
      this.isFetching = false;

      // إذا ورد طلب مزامنة أثناء العملية السابقة، ننفذه فورًا
      if (this.fetchQueued) {
        this.fetchQueued = false;
        setTimeout(() => this.executeFetch(false), 50);
      }
    }
  }

  /**
   * مستمعات نافذة المتصفح (Online و Visibility)
   */
  private handleOnline = () => {
    this.updateStatus('CONNECTING');
    this.triggerSync();
  };

  private handleVisibilityChange = () => {
    if (document.visibilityState === 'visible') {
      this.triggerSync();
    }
  };

  private setupWindowListeners() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', this.handleOnline);
      document.addEventListener('visibilitychange', this.handleVisibilityChange);
    }
  }

  private removeWindowListeners() {
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', this.handleOnline);
      document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    }
  }

  /**
   * مزامنة احتياطية دورية كل 30 ثانية عند انقطاع أو تذبذب Realtime
   */
  private setupFallbackTimer() {
    this.fallbackInterval = setInterval(() => {
      // إذا كان الاتصال اللحظي غير مستقر، أو للمزامنة الدورية الهادئة
      this.triggerSync();
    }, 30000);
  }
}

// كائن مفرد مركزي للاستخدام
export const orderRealtimeManager = new OrderRealtimeManager();
