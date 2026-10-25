import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Header } from './components/common/Header';
import { Sidebar } from './components/common/Sidebar';
import { DemoBar } from './components/common/DemoBar';
import { NotificationDrawer } from './components/common/NotificationDrawer';
import { LoginPage } from './components/auth/LoginPage';
import { RegisterPage } from './components/auth/RegisterPage';
import { RegistrationStatusPage } from './components/auth/RegistrationStatusPage';
import { DashboardView } from './components/dashboard/DashboardView';
import { OrdersView } from './components/orders/OrdersView';
import { OrderDetailsModal } from './components/orders/OrderDetailsModal';
import { OrderInvoiceModal } from './components/orders/OrderInvoiceModal';
import { MenuView } from './components/menu/MenuView';
import { OffersView } from './components/offers/OffersView';
import { FinanceView } from './components/finance/FinanceView';
import { SettingsView } from './components/settings/SettingsView';
import { ProfileView } from './components/profile/ProfileView';
import { HelpView } from './components/help/HelpView';
import { Order } from './types';
import { Bell, X, ShoppingBag, Store, ShieldAlert, Loader2 } from 'lucide-react';

const MainAppContent: React.FC = () => {
  const {
    authLoading,
    isAuthenticated,
    isUserBanned,
    isUserSuspended,
    banReason,
    hasRestaurant,
    restaurant,
    orders,
    newOrderAlert,
    clearNewOrderAlert,
    logout,
  } = useApp();

  // Navigation
  const [currentView, setCurrentView] = useState<string>('dashboard');
  const [ordersInitialFilter, setOrdersInitialFilter] = useState<string>('ALL');
  const [authView, setAuthView] = useState<'LOGIN' | 'REGISTER'>('LOGIN');

  // Mobile Menu & Drawers
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  // Modals
  const [selectedOrderForDetails, setSelectedOrderForDetails] = useState<Order | null>(null);
  const [selectedOrderForInvoice, setSelectedOrderForInvoice] = useState<Order | null>(null);

  // Navigate helper
  const handleNavigate = (view: string, filter?: string) => {
    setCurrentView(view);
    if (view === 'orders' && filter) {
      setOrdersInitialFilter(filter);
    }
  };

  const handleOpenOrderDetails = (order: Order) => {
    setSelectedOrderForDetails(order);
  };

  const handleOpenOrderDetailsById = (orderId: string) => {
    const found = orders.find((o) => o.id === orderId);
    if (found) {
      setSelectedOrderForDetails(found);
    }
  };

  // 1. Initial Loading State while checking Supabase Session
  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 font-['Cairo',sans-serif] text-white">
        <div className="w-16 h-16 rounded-3xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center mb-4 shadow-lg shadow-amber-500/10">
          <Store className="w-8 h-8 text-amber-400 animate-pulse" />
        </div>
        <div className="flex items-center gap-2 mb-1">
          <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
          <h2 className="text-base font-bold text-white">
            جاري استعادة الجلسة والتحقق من حساب المطعم...
          </h2>
        </div>
        <p className="text-xs text-slate-400">
          منظومة طلبات البيت — الاتصال الآمن بـ Supabase
        </p>
      </div>
    );
  }

  // 2. Banned or Suspended User Guard
  if (isUserBanned || isUserSuspended) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 font-['Cairo',sans-serif]">
        <div className="max-w-md w-full bg-white text-slate-900 rounded-3xl p-6 sm:p-8 text-center space-y-4 shadow-2xl border border-slate-100">
          <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-2xl mx-auto flex items-center justify-center">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h2 className="text-lg font-black text-rose-900">
            {isUserBanned ? 'تم حظر حساب هذا المستخدم' : 'تم تعليق هذا الحساب مؤقتًا'}
          </h2>
          <p className="text-xs text-slate-600 leading-relaxed font-medium">
            {banReason || 'حسابك معطل حاليًا وفق قيود إدارة منظومة طلبات البيت. لا يمكنك الوصول إلى لوحة تحكم المطعم.'}
          </p>
          <div className="pt-2">
            <button
              onClick={logout}
              className="px-6 py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              تسجيل الخروج والعودة
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 3. Unauthenticated flow: Login or Register
  if (!isAuthenticated) {
    if (authView === 'REGISTER') {
      return (
        <RegisterPage
          onGoToLogin={() => setAuthView('LOGIN')}
          onRegisteredSuccess={() => setAuthView('LOGIN')}
        />
      );
    }
    return (
      <LoginPage
        onGoToRegister={() => setAuthView('REGISTER')}
      />
    );
  }

  // 4. Authenticated, but user chose to view registration form to submit a new restaurant
  if (authView === 'REGISTER' && !hasRestaurant) {
    return (
      <RegisterPage
        onGoToLogin={() => setAuthView('LOGIN')}
        onRegisteredSuccess={() => setAuthView('LOGIN')}
      />
    );
  }

  // 5. Authenticated, but no restaurant approved yet in Supabase (Pending, Rejected, or Unregistered)
  // "لا تعرض رسالة نجاح ولا تسمح بدخول لوحة إدارة مطعم غير موجود فعليًا أو غير مرتبط بالمستخدم الحالي."
  if (!hasRestaurant || restaurant.registrationStatus !== 'APPROVED') {
    return (
      <>
        <RegistrationStatusPage
          onEnterDashboard={() => setCurrentView('dashboard')}
          onGoToRegister={() => setAuthView('REGISTER')}
        />
        <DemoBar />
      </>
    );
  }

  // 6. Main Dashboard Layout (Only for verified approved restaurant owned by this user)
  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-['Cairo',sans-serif]">
      {/* Top Header */}
      <Header
        onToggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        onOpenNotifications={() => setIsNotificationsOpen(true)}
        onNavigate={handleNavigate}
        currentView={currentView}
      />

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <Sidebar
          currentView={currentView}
          onNavigate={handleNavigate}
          isOpenMobile={isMobileMenuOpen}
          onCloseMobile={() => setIsMobileMenuOpen(false)}
        />

        {/* Main Content Area */}
        <main className="flex-1 lg:mr-72 p-4 sm:p-6 lg:p-8 overflow-y-auto pb-24">
          <div className="max-w-7xl mx-auto">
            {currentView === 'dashboard' && (
              <DashboardView
                onNavigate={handleNavigate}
                onOpenOrderDetails={handleOpenOrderDetails}
              />
            )}

            {currentView === 'orders' && (
              <OrdersView
                onOpenOrderDetails={handleOpenOrderDetails}
                initialFilter={ordersInitialFilter}
              />
            )}

            {currentView === 'menu' && <MenuView />}

            {currentView === 'offers' && <OffersView />}

            {currentView === 'finance' && <FinanceView />}

            {currentView === 'settings' && <SettingsView />}

            {currentView === 'profile' && <ProfileView />}

            {currentView === 'help' && <HelpView />}
          </div>
        </main>
      </div>

      {/* Connection Monitor Bar */}
      <DemoBar />

      {/* Live In-App New Order Toast Banner */}
      {newOrderAlert && (
        <div className="fixed top-20 left-4 right-4 sm:right-auto sm:left-6 z-50 max-w-md bg-amber-500 text-slate-950 p-4 rounded-2xl shadow-2xl border-2 border-white flex items-start justify-between gap-3 animate-bounce">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-slate-950 text-white rounded-xl shrink-0">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-black">
                وصول طلب جديد! #{newOrderAlert.orderNumber}
              </h4>
              <p className="text-xs font-semibold mt-0.5 text-slate-900">
                قيمة الطلب: {newOrderAlert.grandTotal} ج.م ({newOrderAlert.route === 'SELF_DELIVERY' ? 'توصيل ذاتي' : 'مندوب هاتف'})
              </p>
              <button
                onClick={() => {
                  setSelectedOrderForDetails(newOrderAlert);
                  clearNewOrderAlert();
                }}
                className="mt-2 text-xs font-black bg-slate-950 text-white px-3 py-1 rounded-lg shadow-xs hover:bg-slate-800"
              >
                معاينة الطلب وقبوله &larr;
              </button>
            </div>
          </div>

          <button
            onClick={clearNewOrderAlert}
            className="p-1 text-slate-900 hover:text-white rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Notification Drawer */}
      <NotificationDrawer
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
        onNavigateToOrder={handleOpenOrderDetailsById}
      />

      {/* Order Details Modal */}
      {selectedOrderForDetails && (
        <OrderDetailsModal
          order={selectedOrderForDetails}
          onClose={() => setSelectedOrderForDetails(null)}
          onOpenInvoice={(ord) => {
            setSelectedOrderForInvoice(ord);
          }}
        />
      )}

      {/* Printable Invoice Modal */}
      {selectedOrderForInvoice && (
        <OrderInvoiceModal
          order={selectedOrderForInvoice}
          onClose={() => setSelectedOrderForInvoice(null)}
        />
      )}
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainAppContent />
    </AppProvider>
  );
}
