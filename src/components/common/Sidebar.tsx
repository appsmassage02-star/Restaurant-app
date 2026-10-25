import React from 'react';
import {
  LayoutDashboard,
  ShoppingBag,
  UtensilsCrossed,
  Sparkles,
  Wallet,
  Settings,
  User,
  HelpCircle,
  X,
  Store,
  ExternalLink,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

interface SidebarProps {
  currentView: string;
  onNavigate: (view: string) => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onNavigate,
  isOpenMobile,
  onCloseMobile,
}) => {
  const { stats, restaurant } = useApp();

  const navItems = [
    {
      id: 'dashboard',
      label: 'الرئيسية والملخص',
      icon: LayoutDashboard,
      badge: null,
    },
    {
      id: 'orders',
      label: 'إدارة الطلبات',
      icon: ShoppingBag,
      badge: stats.pendingOrdersCount > 0 ? stats.pendingOrdersCount : null,
      badgeColor: 'bg-rose-500 text-white',
    },
    {
      id: 'menu',
      label: 'المنيو والأقسام',
      icon: UtensilsCrossed,
      badge: null,
    },
    {
      id: 'offers',
      label: 'العروض والسلايدر',
      icon: Sparkles,
      badge: null,
    },
    {
      id: 'finance',
      label: 'الحسابات والمستحقات',
      icon: Wallet,
      badge: stats.totalUnsettled > 0 ? 'مستحق' : null,
      badgeColor: 'bg-emerald-600 text-white',
    },
    {
      id: 'settings',
      label: 'إعدادات المطعم',
      icon: Settings,
      badge: null,
    },
    {
      id: 'profile',
      label: 'الملف الشخصي',
      icon: User,
      badge: null,
    },
    {
      id: 'help',
      label: 'مركز المساعدة والدعم',
      icon: HelpCircle,
      badge: null,
    },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-40 lg:hidden"
        />
      )}

      {/* Sidebar container */}
      <aside
        className={`fixed top-0 bottom-0 right-0 z-40 w-72 bg-slate-900 text-slate-100 flex flex-col transition-transform duration-300 ease-in-out border-l border-slate-800 ${
          isOpenMobile ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 flex items-center justify-between px-5 border-b border-slate-800/80 bg-slate-950/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center text-white shadow-md shadow-amber-500/20">
              <Store className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-base tracking-wide text-white">طلبات البيت</span>
                <span className="px-1.5 py-0.5 text-[10px] bg-amber-500/20 text-amber-400 font-bold rounded">
                  المطاعم
                </span>
              </div>
              <p className="text-[11px] text-slate-400">بوابة الشركاء المستقلة</p>
            </div>
          </div>

          <button
            onClick={onCloseMobile}
            className="lg:hidden p-1.5 text-slate-400 hover:text-white rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Items */}
        <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          <div className="px-3 pb-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            لوحة الإدارة
          </div>

          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onNavigate(item.id);
                  onCloseMobile();
                }}
                className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-sm font-semibold transition-all ${
                  isActive
                    ? 'bg-amber-500 text-white shadow-md shadow-amber-500/25'
                    : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>

                {item.badge && (
                  <span
                    className={`px-2 py-0.5 text-xs font-bold rounded-full ${
                      item.badgeColor || 'bg-amber-600 text-white'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Footer info card */}
        <div className="p-4 border-t border-slate-800/80 bg-slate-950/40">
          <div className="p-3 bg-slate-800/70 rounded-xl border border-slate-700/60">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="text-slate-400">عمولة الإدارة المعتمدة</span>
              <span className="font-extrabold text-amber-400">
                {restaurant.adminCommissionPercent}%
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">أقصى نطاق توصيل</span>
              <span className="font-semibold text-slate-300">
                {restaurant.deliveryRadiusKm} كم
              </span>
            </div>
            <div className="mt-2.5 pt-2 border-t border-slate-700/60 text-[11px] text-slate-400 flex items-center justify-between">
              <span>دورة التسوية: أسبوعية</span>
              <span className="text-emerald-400 font-medium">معتمدة</span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
