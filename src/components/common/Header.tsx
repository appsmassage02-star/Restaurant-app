import React, { useState } from 'react';
import {
  Bell,
  Store,
  Power,
  ChevronDown,
  User,
  Settings,
  LogOut,
  PlusCircle,
  PhoneCall,
  CheckCircle,
  Menu as MenuIcon,
  X,
  Volume2,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

interface HeaderProps {
  onToggleMobileMenu: () => void;
  onOpenNotifications: () => void;
  onNavigate: (view: string) => void;
  currentView: string;
}

export const Header: React.FC<HeaderProps> = ({
  onToggleMobileMenu,
  onOpenNotifications,
  onNavigate,
}) => {
  const {
    restaurant,
    owner,
    updateRestaurant,
    logout,
    notifications,
    injectMockOrder,
  } = useApp();

  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showNewOrderMenu, setShowNewOrderMenu] = useState(false);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const toggleRestaurantOpen = () => {
    updateRestaurant({ isOpen: !restaurant.isOpen });
  };

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-slate-200 shadow-xs">
      <div className="px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Right side: Mobile Menu Button & Restaurant Name / Status */}
        <div className="flex items-center gap-3 sm:gap-4">
          <button
            onClick={onToggleMobileMenu}
            className="lg:hidden p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg"
            aria-label="القائمة الجانبية"
          >
            <MenuIcon className="w-6 h-6" />
          </button>

          <div className="flex items-center gap-3">
            <div className="relative">
              <img
                src={restaurant.logo}
                alt={restaurant.name}
                className="w-10 h-10 rounded-xl object-cover border border-amber-200 shadow-xs"
              />
              <span
                className={`absolute -bottom-1 -left-1 w-3.5 h-3.5 rounded-full border-2 border-white ${
                  restaurant.isOpen ? 'bg-emerald-500' : 'bg-rose-500'
                }`}
                title={restaurant.isOpen ? 'المطعم مفتوح لاستقبال الطلبات' : 'المطعم مغلق حاليًا'}
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
                  {restaurant.name}
                </h1>
                <span className="hidden sm:inline-block px-2 py-0.5 text-xs font-semibold rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                  طلبات البيت
                </span>
              </div>
              <p className="text-xs text-slate-500">
                {restaurant.city}، {restaurant.governorate}
              </p>
            </div>
          </div>
        </div>

        {/* Center / Actions */}
        <div className="flex items-center gap-2 sm:gap-4">
          {/* Status Quick Toggle */}
          <div className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                restaurant.isOpen ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
              }`}
            />
            <span className="text-xs font-semibold text-slate-700 hidden md:inline">
              {restaurant.isOpen ? 'استقبال الطلبات مفتوح' : 'المطعم مغلق'}
            </span>
            <button
              onClick={toggleRestaurantOpen}
              className={`text-xs px-2.5 py-1 rounded-lg font-bold transition-colors ${
                restaurant.isOpen
                  ? 'bg-rose-100 text-rose-700 hover:bg-rose-200'
                  : 'bg-emerald-600 text-white hover:bg-emerald-700'
              }`}
              title="تغيير حالة استقبال الطلبات"
            >
              {restaurant.isOpen ? 'إغلاق مؤقت' : 'فتح المطعم'}
            </button>
          </div>

          {/* Quick Mock Order Generator */}
          <div className="relative">
            <button
              onClick={() => setShowNewOrderMenu(!showNewOrderMenu)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-amber-900 bg-amber-100 hover:bg-amber-200 border border-amber-300 rounded-xl transition-all shadow-xs"
            >
              <PlusCircle className="w-4 h-4 text-amber-700" />
              <span className="hidden sm:inline">طلب تجريبي</span>
              <ChevronDown className="w-3 h-3 text-amber-800" />
            </button>

            {showNewOrderMenu && (
              <div className="absolute left-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50 text-right">
                <div className="px-3 py-1 text-xs font-bold text-slate-400 border-b border-slate-100 mb-1">
                  محاكاة وصول طلب جديد
                </div>
                <button
                  onClick={() => {
                    injectMockOrder('SELF_DELIVERY');
                    setShowNewOrderMenu(false);
                  }}
                  className="w-full px-3 py-2 text-xs text-slate-700 hover:bg-amber-50 flex items-center justify-between"
                >
                  <span className="font-semibold text-slate-800">مسار 1: توصيل ذاتي للمطعم</span>
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded">إلكتروني</span>
                </button>
                <button
                  onClick={() => {
                    injectMockOrder('COURIER_PHONE');
                    setShowNewOrderMenu(false);
                  }}
                  className="w-full px-3 py-2 text-xs text-slate-700 hover:bg-amber-50 flex items-center justify-between"
                >
                  <span className="font-semibold text-slate-800">مسار 2: مندوب واتصال هاتفي</span>
                  <PhoneCall className="w-3.5 h-3.5 text-blue-600" />
                </button>
              </div>
            )}
          </div>

          {/* Notifications Button */}
          <button
            onClick={onOpenNotifications}
            className="relative p-2 text-slate-600 hover:text-amber-600 hover:bg-slate-100 rounded-xl transition-colors"
            title="الإشعارات والتنبيهات"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 left-1 w-4 h-4 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-bounce">
                {unreadCount}
              </span>
            )}
          </button>

          {/* User Profile Menu */}
          <div className="relative">
            <button
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="flex items-center gap-2 p-1.5 hover:bg-slate-100 rounded-xl transition-colors border border-transparent hover:border-slate-200"
            >
              <div className="w-8 h-8 rounded-lg bg-amber-500 text-white font-bold flex items-center justify-center text-sm shadow-xs">
                {owner.fullName.slice(0, 1)}
              </div>
              <div className="hidden md:block text-right">
                <p className="text-xs font-bold text-slate-800">{owner.fullName}</p>
                <p className="text-[11px] text-slate-500">مالك المطعم</p>
              </div>
              <ChevronDown className="w-4 h-4 text-slate-400 hidden md:block" />
            </button>

            {showProfileMenu && (
              <div className="absolute left-0 mt-2 w-52 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50 text-right">
                <div className="px-4 py-2 border-b border-slate-100">
                  <p className="text-xs font-bold text-slate-800">{owner.fullName}</p>
                  <p className="text-[11px] text-slate-500 truncate">{owner.email}</p>
                </div>
                <button
                  onClick={() => {
                    onNavigate('profile');
                    setShowProfileMenu(false);
                  }}
                  className="w-full px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2 font-medium"
                >
                  <User className="w-4 h-4 text-slate-400" />
                  الملف الشخصي للمالك
                </button>
                <button
                  onClick={() => {
                    onNavigate('settings');
                    setShowProfileMenu(false);
                  }}
                  className="w-full px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2 font-medium"
                >
                  <Settings className="w-4 h-4 text-slate-400" />
                  إعدادات المطعم والتوصيل
                </button>
                <div className="my-1 border-t border-slate-100" />
                <button
                  onClick={() => {
                    logout();
                    setShowProfileMenu(false);
                  }}
                  className="w-full px-4 py-2 text-xs text-rose-600 hover:bg-rose-50 flex items-center gap-2 font-bold"
                >
                  <LogOut className="w-4 h-4 text-rose-500" />
                  تسجيل الخروج
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
