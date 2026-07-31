import { ReactNode, useState, useEffect } from 'react';
import { Navigate, Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/auth.store';
import { useThemeStore } from '@/store/theme.store';
import {
  Building2, LayoutDashboard, AlertTriangle, ClipboardCheck, FileText, LogOut, Video,
  Users, Settings, Bell, ChevronDown, Cpu, Box, Plane, ShieldCheck, PanelLeftClose, PanelLeftOpen,
  ChevronRight, Sun, Moon
} from 'lucide-react';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: string[];
}

export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { user, accessToken, logout } = useAuthStore();
  const { theme, toggleTheme, initTheme } = useThemeStore();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(3);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    'CORE PLATFORM': true,
    'V4.0 AUTONOMOUS PLATFORM': true,
    'AI & TELEMETRY': true,
    'OPERATIONS': true,
    'MANAGEMENT': false,
  });

  useEffect(() => {
    initTheme();
  }, [initTheme]);

  const [notifications] = useState([
    {
      id: 1,
      title: 'Bandra Sea Link Corrosion Flag',
      message: 'AI Computer Vision detected surface oxide corrosion on cable stay anchor #14',
      time: '10m ago',
      type: 'HIGH',
      link: '/anomalies',
    },
    {
      id: 2,
      title: 'Muppandal Turbine Overheat',
      message: 'Yaw motor temperature elevated 14% above thermal baseline',
      time: '45m ago',
      type: 'MEDIUM',
      link: '/telemetry',
    },
    {
      id: 3,
      title: 'SLA Dispatch Countdown',
      message: 'High priority work order inspection deadline expires in 4 hours',
      time: '2h ago',
      type: 'INFO',
      link: '/work-orders',
    },
  ]);

  if (!accessToken || !user) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && !requiredRole.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  const isAdmin = user.role === 'ADMIN';

  const toggleSection = (title: string) => {
    setOpenSections(prev => ({ ...prev, [title]: !prev[title] }));
  };

  const navSections = [
    {
      title: 'CORE PLATFORM',
      items: [
        { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
        { name: 'Assets', href: '/assets', icon: Building2 },
        { name: 'GIS Twin Map', href: '/map', icon: Building2, badge: 'GIS' },
      ],
    },
    {
      title: 'V4.0 AUTONOMOUS PLATFORM',
      items: [
        { name: 'SCADA Control', href: '/scada', icon: Cpu, badge: 'SCADA' },
        { name: '3D BIM Twin', href: '/bim-twin', icon: Box, badge: '3D' },
        { name: 'Drone Fleet', href: '/drone-fleet', icon: Plane, badge: 'UAV' },
        { name: 'ESG Compliance', href: '/compliance', icon: ShieldCheck, badge: 'ISO' },
      ],
    },
    {
      title: 'AI & TELEMETRY',
      items: [
        { name: 'IoT Telemetry', href: '/telemetry', icon: Video, badge: 'LIVE' },
        { name: 'AI CV Review', href: '/anomalies', icon: Video, badge: 'AI' },
        { name: 'Predictions', href: '/predictions', icon: FileText },
        { name: 'Analytics BI', href: '/analytics', icon: LayoutDashboard, badge: 'BI' },
      ],
    },
    {
      title: 'OPERATIONS',
      items: [
        { name: 'Work Orders', href: '/work-orders', icon: ClipboardCheck, badge: 'SLA' },
        { name: 'Inspections', href: '/inspections', icon: ClipboardCheck },
        { name: 'Incidents', href: '/incidents', icon: AlertTriangle },
        { name: 'Cameras', href: '/cameras', icon: Video },
        { name: 'Reports', href: '/reports', icon: FileText },
      ],
    },
    {
      title: 'MANAGEMENT',
      items: [
        ...(isAdmin ? [{ name: 'Team', href: '/users', icon: Users }] : []),
        { name: 'Settings', href: '/settings', icon: Settings },
      ],
    },
  ];

  return (
    <div className="h-screen w-screen overflow-hidden flex bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans transition-colors duration-300">

      {/* ─── Sidebar ─── */}
      <aside
        style={{ width: collapsed ? 68 : 240 }}
        className="flex flex-col h-full border-r border-slate-200 dark:border-slate-800/80 bg-white dark:bg-slate-900 transition-[width] duration-300 flex-shrink-0 overflow-hidden"
      >
        {/* Brand */}
        <div className="h-14 flex items-center gap-2 px-3 border-b border-slate-200 dark:border-slate-800 flex-shrink-0">
          <Link to="/dashboard" className="flex items-center gap-2.5 overflow-hidden flex-1 min-w-0">
            <div className="w-9 h-9 bg-gradient-to-tr from-indigo-600 to-cyan-500 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20 flex-shrink-0">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            {!collapsed && (
              <div className="flex flex-col truncate">
                <span className="font-extrabold text-base tracking-tight text-slate-900 dark:text-white leading-tight">InfraWatch</span>
                <span className="text-[9px] font-black text-indigo-600 dark:text-cyan-400 tracking-widest uppercase leading-none">Enterprise v4.0</span>
              </div>
            )}
          </Link>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors flex-shrink-0"
            title={collapsed ? 'Expand' : 'Collapse'}
          >
            {collapsed ? <PanelLeftOpen className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
          </button>
        </div>

        {/* Nav Links */}
        <nav className="flex-1 px-2 py-3 space-y-3 overflow-y-auto overflow-x-hidden custom-scrollbar">
          {navSections.map((section) => {
            const isOpen = openSections[section.title] ?? true;
            return (
              <div key={section.title} className="space-y-0.5">
                {!collapsed ? (
                  <button
                    onClick={() => toggleSection(section.title)}
                    className="w-full px-2 py-1 flex items-center justify-between text-[10px] font-extrabold tracking-wider text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 uppercase transition-colors"
                  >
                    <span className="truncate">{section.title}</span>
                    <ChevronRight className={`w-3 h-3 flex-shrink-0 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
                  </button>
                ) : (
                  <div className="h-px bg-slate-200 dark:bg-slate-800 mx-1 my-1.5" />
                )}

                {(isOpen || collapsed) &&
                  section.items.map((item) => {
                    const isActive =
                      location.pathname === item.href ||
                      (item.href !== '/dashboard' && location.pathname.startsWith(item.href));

                    return (
                      <Link
                        key={item.name}
                        to={item.href}
                        title={collapsed ? item.name : undefined}
                        className={`
                          group flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-bold transition-all duration-200
                          ${collapsed ? 'justify-center' : 'justify-between'}
                          ${isActive
                            ? 'text-indigo-600 dark:text-white bg-indigo-50 dark:bg-indigo-600/90 shadow-sm border border-indigo-200 dark:border-indigo-500/50'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60 border border-transparent'
                          }
                        `}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <item.icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-indigo-600 dark:text-white' : 'text-slate-400 group-hover:text-indigo-500 dark:group-hover:text-cyan-400'}`} />
                          {!collapsed && <span className="truncate font-semibold">{item.name}</span>}
                        </div>
                        {!collapsed && item.badge && (
                          <span className={`px-1.5 py-0.5 text-[9px] font-extrabold rounded uppercase tracking-wider flex-shrink-0 ${isActive ? 'bg-indigo-600 dark:bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-cyan-400 border border-slate-200 dark:border-cyan-500/30'}`}>
                            {item.badge}
                          </span>
                        )}
                      </Link>
                    );
                  })}
              </div>
            );
          })}
        </nav>
      </aside>

      {/* ─── Main ─── */}
      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden">

        {/* Top Header — z-50 to always be above page content */}
        <header className="h-14 border-b border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md px-6 flex items-center justify-between flex-shrink-0 relative z-50">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-xs font-mono text-slate-500 dark:text-slate-400">
            <span className="text-indigo-600 dark:text-cyan-400 font-bold">InfraWatch Grid</span>
            <span>/</span>
            <span className="capitalize font-bold text-slate-900 dark:text-white">{location.pathname.replace('/', '').replace('-', ' ') || 'Dashboard'}</span>
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-2.5">
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              title={theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
              className="p-2 rounded-xl bg-white hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 shadow-sm transition-all cursor-pointer"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-600" />}
            </button>

            {/* Notifications */}
            <div className="relative">
              <button
                onClick={() => { setShowNotifications(!showNotifications); setShowUserMenu(false); }}
                className="p-2 rounded-xl bg-white hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 shadow-sm transition-all relative"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white rounded-full text-[9px] font-extrabold flex items-center justify-center animate-pulse">{unreadCount}</span>
                )}
              </button>

              {showNotifications && (
                <>
                  <div className="fixed inset-0 z-[60]" onClick={() => setShowNotifications(false)} />
                  <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl z-[70] overflow-hidden text-xs">
                    <div className="p-3.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 flex items-center justify-between font-bold text-slate-900 dark:text-white">
                      <span className="flex items-center gap-1.5">
                        <Bell className="w-4 h-4 text-indigo-500 dark:text-cyan-400" /> System Alerts
                      </span>
                      {unreadCount > 0 && (
                        <button onClick={() => setUnreadCount(0)} className="text-indigo-600 dark:text-cyan-400 hover:underline text-[10px]">Mark read</button>
                      )}
                    </div>
                    <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                      {notifications.map((n) => (
                        <Link key={n.id} to={n.link} onClick={() => setShowNotifications(false)} className="p-3 flex flex-col space-y-1 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors block">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-rose-600 dark:text-rose-400">{n.title}</span>
                            <span className="text-[10px] text-slate-400 dark:text-slate-500">{n.time}</span>
                          </div>
                          <p className="text-slate-600 dark:text-slate-300 font-sans leading-relaxed">{n.message}</p>
                        </Link>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* User Profile */}
            <div className="relative">
              <button
                onClick={() => { setShowUserMenu(!showUserMenu); setShowNotifications(false); }}
                className="flex items-center gap-2 p-1.5 pr-3 rounded-xl bg-white hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white shadow-sm transition-all text-xs font-bold"
              >
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-extrabold shadow text-xs">
                  {user.name.charAt(0)}
                </div>
                <span className="hidden sm:inline">{user.name}</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {showUserMenu && (
                <>
                  <div className="fixed inset-0 z-[60]" onClick={() => setShowUserMenu(false)} />
                  <div className="absolute right-0 mt-2 w-52 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl z-[70] py-1 text-xs font-bold overflow-hidden">
                    <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800">
                      <p className="text-sm font-extrabold text-slate-900 dark:text-white">{user.name}</p>
                      <p className="text-[10px] text-indigo-600 dark:text-cyan-400 font-extrabold uppercase">{user.role}</p>
                    </div>
                    <Link to="/settings" onClick={() => setShowUserMenu(false)} className="flex items-center gap-2 px-4 py-2.5 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800">
                      <Settings className="w-3.5 h-3.5" /> Settings
                    </Link>
                    <div className="border-t border-slate-100 dark:border-slate-800" />
                    <button onClick={() => { logout(); setShowUserMenu(false); }} className="flex items-center gap-2 px-4 py-2.5 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 w-full text-left">
                      <LogOut className="w-3.5 h-3.5" /> Sign Out
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Page Content — isolated stacking context with z-0, never overlaps header */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 w-full custom-scrollbar transition-colors duration-300 relative z-0 isolate">
          {children}
        </div>
      </div>
    </div>
  );
}
