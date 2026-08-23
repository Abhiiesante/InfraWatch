import { ReactNode, useState } from 'react';
import { Navigate, Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/auth.store';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building2, LayoutDashboard, AlertTriangle, LogOut, Settings, Bell, ChevronDown,
  Cpu, ShieldCheck, Box, Video, FileText, ClipboardCheck, Users, Plane
} from 'lucide-react';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: string[];
}

export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { user, accessToken, logout } = useAuthStore();
  const location = useLocation();
  
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [scrollY, setScrollY] = useState(0);

  if (!accessToken || !user) return <Navigate to="/login" replace />;
  if (requiredRole && !requiredRole.includes(user.role)) return <Navigate to="/dashboard" replace />;

  const isScrolled = scrollY > 30;

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setScrollY(e.currentTarget.scrollTop);
  };

  const navItems = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Assets', href: '/assets', icon: Building2 },
    { name: 'Warehouse', href: '/warehouse', icon: Box },
    { 
      name: 'Operations', 
      icon: ShieldCheck, 
      dropdown: [
        { name: 'Incidents', href: '/incidents', icon: AlertTriangle },
        { name: 'Inspections', href: '/inspections', icon: ClipboardCheck },
        { name: 'Work Orders', href: '/work-orders', icon: FileText },
        { name: 'Video Intelligence', href: '/cameras', icon: Video },
      ]
    },
    { 
      name: 'Intelligence', 
      icon: Cpu, 
      dropdown: [
        { name: 'Telemetry', href: '/telemetry', icon: Video },
        { name: 'AI Vision', href: '/anomalies', icon: Video },
        { name: 'Predictions', href: '/predictions', icon: FileText },
        { name: 'Analytics', href: '/analytics', icon: LayoutDashboard },
      ]
    },
    { 
      name: 'Digital Twin', 
      icon: Box, 
      dropdown: [
        { name: 'GIS Map', href: '/map', icon: Building2 },
        { name: '3D BIM', href: '/bim-twin', icon: Box },
        { name: 'SCADA', href: '/scada', icon: Cpu },
        { name: 'Drone Fleet', href: '/drone-fleet', icon: Plane },
      ]
    }
  ];

  return (
    <div className="h-screen w-screen overflow-hidden relative bg-[#F1F5F9] text-slate-900" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>

      {/* ─── Floating Solid Nav Dock (Top Nav) ─── */}
      <div className="fixed top-0 left-0 right-0 z-50 flex justify-center pt-4 pointer-events-none">
        <motion.nav
          initial={{ y: -60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          className="pointer-events-auto flex items-center px-5 py-2.5 rounded-full gap-2 transition-all duration-200 bg-white border border-slate-200 shadow-md"
          style={{
            transform: isScrolled ? 'scale(0.96)' : 'scale(1)',
          }}
          onMouseLeave={() => setActiveDropdown(null)}
        >
          <Link
            to="/dashboard"
            className="w-10 h-10 rounded-full flex items-center justify-center mr-2 shadow-xs bg-[#7FB8B0] text-white hover:bg-[#6DA9A0] transition-colors"
          >
            <Building2 className="w-5 h-5" />
          </Link>

          {navItems.map((item) => {
            const isActive = location.pathname === item.href || (item.dropdown && item.dropdown.some(d => location.pathname === d.href));
            return (
              <div key={item.name} className="relative" onMouseEnter={() => setActiveDropdown(item.name)}>
                {item.href ? (
                  <Link to={item.href}>
                    <motion.div
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      className={`px-4 py-2 rounded-full text-sm font-bold flex items-center gap-1.5 cursor-pointer transition-colors ${
                        isActive
                          ? 'bg-slate-100 text-slate-900 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                      }`}
                    >
                      {item.name}
                    </motion.div>
                  </Link>
                ) : (
                  <motion.div
                    whileHover={{ scale: 1.03 }}
                    className={`px-4 py-2 rounded-full text-sm font-bold flex items-center gap-1 cursor-pointer transition-colors ${
                      isActive
                        ? 'bg-slate-100 text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    {item.name} <ChevronDown className="w-3.5 h-3.5" />
                  </motion.div>
                )}

                {/* Dropdown Menu */}
                <AnimatePresence>
                  {activeDropdown === item.name && item.dropdown && (
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.98 }}
                      transition={{ duration: 0.15 }}
                      className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-48 p-2 rounded-2xl bg-white border border-slate-200 shadow-xl"
                    >
                      {item.dropdown.map(d => (
                        <Link key={d.name} to={d.href} onClick={() => setActiveDropdown(null)}>
                          <div className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 hover:text-slate-900 hover:bg-slate-50 flex items-center gap-2 transition-colors">
                            <d.icon className="w-4 h-4 text-[#7FB8B0]" />
                            {d.name}
                          </div>
                        </Link>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}

          <div className="w-px h-5 mx-1 bg-slate-200" />

          <button
            onClick={() => { setShowNotifications(!showNotifications); setShowUserMenu(false); }}
            className="w-9 h-9 rounded-full flex items-center justify-center relative text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#E08585]" />
          </button>

          <button
            onClick={() => { setShowUserMenu(!showUserMenu); setShowNotifications(false); }}
            className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-white ml-1 bg-slate-800 hover:bg-slate-700 transition-all text-xs"
          >
            {user.name.charAt(0)}
          </button>
          
          {/* User Menu Dropdown */}
          <AnimatePresence>
            {showUserMenu && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.98 }}
                transition={{ duration: 0.15 }}
                className="absolute top-full right-0 mt-2 w-56 p-2 rounded-2xl bg-white border border-slate-200 shadow-xl"
              >
                <div className="px-4 py-2.5 mb-1.5 border-b border-slate-100">
                  <p className="font-bold text-slate-900 text-sm">{user.name}</p>
                  <p className="text-[10px] font-bold text-[#7FB8B0]">{user.role}</p>
                </div>
                {user.role === 'ADMIN' && (
                  <Link to="/users" onClick={() => setShowUserMenu(false)}>
                    <div className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition-colors">
                      <Users className="w-4 h-4 text-[#7FB8B0]" /> Team
                    </div>
                  </Link>
                )}
                <Link to="/settings" onClick={() => setShowUserMenu(false)}>
                  <div className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition-colors">
                    <Settings className="w-4 h-4 text-[#7FB8B0]" /> Settings
                  </div>
                </Link>
                <button
                  onClick={() => { logout(); setShowUserMenu(false); }}
                  className="w-full text-left px-3.5 py-2 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 flex items-center gap-2 transition-colors"
                >
                  <LogOut className="w-4 h-4" /> Sign Out
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.nav>
      </div>

      {/* ─── Main Content Canvas ─── */}
      <div 
        className="absolute inset-0 z-10 overflow-y-auto overflow-x-hidden pt-24 pb-12 px-4 sm:px-8 max-w-[1600px] mx-auto w-full"
        onScroll={handleScroll}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="w-full h-full"
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
