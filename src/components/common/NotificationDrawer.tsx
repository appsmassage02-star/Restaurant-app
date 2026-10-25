import React, { useState } from 'react';
import {
  X,
  Bell,
  CheckCheck,
  ShoppingBag,
  Wallet,
  AlertTriangle,
  Info,
  Clock,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateToOrder?: (orderId: string) => void;
}

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({
  isOpen,
  onClose,
  onNavigateToOrder,
}) => {
  const { notifications, markNotificationAsRead, markAllNotificationsAsRead } = useApp();
  const [filter, setFilter] = useState<'ALL' | 'ORDER' | 'FINANCE' | 'SYSTEM'>('ALL');

  if (!isOpen) return null;

  const filteredNotifs = notifications.filter((n) => {
    if (filter === 'ALL') return true;
    return n.type === filter;
  });

  const getIcon = (type: string) => {
    switch (type) {
      case 'ORDER':
        return <ShoppingBag className="w-5 h-5 text-amber-500" />;
      case 'FINANCE':
        return <Wallet className="w-5 h-5 text-emerald-500" />;
      case 'ALERT':
        return <AlertTriangle className="w-5 h-5 text-rose-500" />;
      default:
        return <Info className="w-5 h-5 text-blue-500" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      <div className="fixed inset-y-0 left-0 max-w-full flex pl-0 sm:pl-10">
        <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col border-r border-slate-200">
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-amber-100 text-amber-700 rounded-xl">
                <Bell className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">مركز الإشعارات</h2>
                <p className="text-xs text-slate-500">تنبيهات الطلبات والعمليات والمستحقات</p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Filters & Mark all read */}
          <div className="px-4 py-2.5 border-b border-slate-100 flex items-center justify-between gap-2 bg-white">
            <div className="flex items-center gap-1 overflow-x-auto pb-1 text-xs">
              <button
                onClick={() => setFilter('ALL')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-colors ${
                  filter === 'ALL'
                    ? 'bg-amber-500 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                الكل ({notifications.length})
              </button>
              <button
                onClick={() => setFilter('ORDER')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-colors ${
                  filter === 'ORDER'
                    ? 'bg-amber-500 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                الطلبات
              </button>
              <button
                onClick={() => setFilter('FINANCE')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-colors ${
                  filter === 'FINANCE'
                    ? 'bg-amber-500 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                المالية
              </button>
            </div>

            <button
              onClick={markAllNotificationsAsRead}
              className="text-xs text-amber-600 hover:text-amber-700 font-bold flex items-center gap-1 whitespace-nowrap"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span>قراءة الكل</span>
            </button>
          </div>

          {/* Notification List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
            {filteredNotifs.length === 0 ? (
              <div className="py-12 text-center text-slate-400">
                <Bell className="w-10 h-10 mx-auto mb-2 text-slate-300 stroke-1" />
                <p className="text-sm font-semibold">لا توجد إشعارات في هذا القسم</p>
                <p className="text-xs text-slate-400 mt-1">
                  ستظهر هنا التنبيهات المباشرة فور حدوث أي حركة جديدة.
                </p>
              </div>
            ) : (
              filteredNotifs.map((item) => (
                <div
                  key={item.id}
                  onClick={() => {
                    markNotificationAsRead(item.id);
                    if (item.orderId && onNavigateToOrder) {
                      onNavigateToOrder(item.orderId);
                      onClose();
                    }
                  }}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                    item.read
                      ? 'bg-white border-slate-200 hover:bg-slate-50'
                      : 'bg-amber-50/70 border-amber-200 hover:bg-amber-50 shadow-xs'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-white rounded-lg border border-slate-100 shadow-xs shrink-0">
                      {getIcon(item.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <h4
                          className={`text-xs font-bold truncate ${
                            item.read ? 'text-slate-800' : 'text-slate-950 font-black'
                          }`}
                        >
                          {item.title}
                        </h4>
                        <span className="text-[10px] text-slate-400 flex items-center gap-0.5 shrink-0">
                          <Clock className="w-3 h-3" />
                          {item.timestamp}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                        {item.message}
                      </p>
                      {item.orderId && (
                        <div className="mt-2 text-[11px] font-bold text-amber-700">
                          اضغط لعرض تفاصيل الطلب &larr;
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
