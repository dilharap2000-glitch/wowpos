import React from 'react';
import {
  LayoutDashboard,
  Users,
  QrCode,
  CreditCard,
  BarChart3,
  Settings,
  LogOut,
  Dumbbell,
  ShieldCheck,
  ChevronRight,
  Building2,
  ShoppingCart,
  Layers,
  Package,
  Receipt,
} from 'lucide-react';

export type NavSection =
  | 'dashboard'
  | 'members'
  | 'memberships'
  | 'payments'
  | 'attendance'
  | 'products'
  | 'pos'
  | 'sales'
  | 'reports'
  | 'settings'
  | 'superadmin';

interface SidebarProps {
  currentSection: NavSection;
  onSelectSection: (section: NavSection) => void;
  onLogout: () => void;
  gymName?: string;
  logo?: string | null;
  userRole?: string;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentSection,
  onSelectSection,
  onLogout,
  gymName = 'GYM MANAGEMENT',
  logo = null,
  userRole,
  isOpenMobile,
  onCloseMobile,
}) => {
  const navItems: Array<{ id: NavSection; label: string; icon: React.ReactNode; badge?: string }> = [];

  if (userRole === 'SUPER_ADMIN') {
    navItems.push({
      id: 'superadmin',
      label: 'SaaS Platform',
      icon: <Building2 className="w-5 h-5" />,
      badge: 'OVERSEER',
    });
  }

  navItems.push(
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: <LayoutDashboard className="w-5 h-5" />,
    },
    {
      id: 'members',
      label: 'Members',
      icon: <Users className="w-5 h-5" />,
    },
    {
      id: 'memberships',
      label: 'Memberships',
      icon: <Layers className="w-5 h-5" />,
      badge: 'PLANS',
    },
    {
      id: 'payments',
      label: 'Payments',
      icon: <CreditCard className="w-5 h-5" />,
    },
    {
      id: 'attendance',
      label: 'Attendance',
      icon: <QrCode className="w-5 h-5" />,
      badge: 'SCANNER',
    },
    {
      id: 'products',
      label: 'Products',
      icon: <Package className="w-5 h-5" />,
    },
    {
      id: 'pos',
      label: 'POS',
      icon: <ShoppingCart className="w-5 h-5" />,
      badge: 'REGISTER',
    },
    {
      id: 'sales',
      label: 'Sales',
      icon: <Receipt className="w-5 h-5" />,
    },
    {
      id: 'reports',
      label: 'Reports',
      icon: <BarChart3 className="w-5 h-5" />,
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: <Settings className="w-5 h-5" />,
    }
  );

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          id="sidebar-backdrop"
          onClick={onCloseMobile}
          className="fixed inset-0 bg-black/80 backdrop-blur-xs z-40 lg:hidden"
        />
      )}

      <aside
        id="app-sidebar"
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-[#0A0A0A] border-r border-white/10 flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="p-4 border-b border-white/10 flex flex-col bg-black/40 gap-2.5">
          {/* Software Brand */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-black italic tracking-widest text-[#FACC15] uppercase">
                WOW POS
              </span>
              <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-white/10 text-gray-400 font-bold">
                SaaS
              </span>
            </div>
            <span className="text-[9px] font-mono text-gray-500 uppercase tracking-widest">
              v2.5 Atlas
            </span>
          </div>

          {/* Customer Gym Instance */}
          <div className="flex items-center space-x-3 overflow-hidden pt-2 border-t border-white/5">
            {logo ? (
              <img
                src={logo}
                alt={gymName}
                className="w-9 h-9 rounded-xl object-contain bg-black border border-[#FACC15]/40 p-0.5 shadow-md shadow-[#FACC15]/10 shrink-0"
              />
            ) : (
              <div className="w-9 h-9 rounded-xl bg-[#FACC15] flex items-center justify-center text-black shadow-lg shadow-[#FACC15]/20 border border-yellow-400 shrink-0">
                <Dumbbell className="w-4 h-4 text-black transform -rotate-12 stroke-[2.5]" />
              </div>
            )}
            <div className="overflow-hidden min-w-0">
              <h2 className="text-white font-black text-xs tracking-wider uppercase truncate" title={gymName}>
                {gymName}
              </h2>
              <span className="text-[9px] text-[#FACC15] font-black tracking-widest uppercase truncate block">
                {userRole === 'SUPER_ADMIN' ? 'SUPER ADMIN' : 'Active Tenant'}
              </span>
            </div>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-3 py-5 space-y-1.5 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = currentSection === item.id;
            return (
              <button
                key={item.id}
                id={`nav-${item.id}`}
                onClick={() => {
                  onSelectSection(item.id);
                  onCloseMobile();
                }}
                className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl text-xs font-black uppercase tracking-wider transition-all duration-200 group ${
                  isActive
                    ? 'bg-[#FACC15] text-black shadow-lg shadow-[#FACC15]/25 border border-yellow-400'
                    : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <span
                    className={`transition-colors duration-200 ${
                      isActive ? 'text-black' : 'text-gray-400 group-hover:text-[#FACC15]'
                    }`}
                  >
                    {item.icon}
                  </span>
                  <span className="font-black">{item.label}</span>
                </div>

                <div className="flex items-center space-x-1.5">
                  {item.badge && (
                    <span
                      className={`text-[9px] font-black px-1.5 py-0.5 rounded tracking-widest uppercase ${
                        isActive
                          ? 'bg-black text-[#FACC15]'
                          : 'bg-white/10 text-gray-300 group-hover:bg-[#FACC15]/20 group-hover:text-[#FACC15]'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                  {isActive && <ChevronRight className="w-4 h-4 text-black stroke-[3]" />}
                </div>
              </button>
            );
          })}
        </nav>

        {/* User Info & Logout Button */}
        <div className="p-4 border-t border-white/10 bg-black/60 space-y-3">
          <div className="px-2 flex items-center justify-between text-xs">
            <div className="flex items-center space-x-2 text-gray-400">
              <ShieldCheck className="w-4 h-4 text-[#FACC15]" />
              <span className="font-bold capitalize text-gray-200 text-xs truncate">
                {userRole?.toLowerCase().replace('_', ' ') || 'Gym Owner'}
              </span>
            </div>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          </div>

          <button
            id="sidebar-logout-btn"
            onClick={onLogout}
            className="w-full flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider text-gray-400 hover:text-red-400 hover:bg-red-950/30 border border-transparent hover:border-red-900/40 transition-all duration-200"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
};
