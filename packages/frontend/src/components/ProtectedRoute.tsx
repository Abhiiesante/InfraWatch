import { ReactNode, useState } from 'react';
import { Navigate, Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/auth.store';
import { useBackgroundRotation } from '@/lib/useBackgroundRotation';
import { INFRA_IMAGES } from '@/lib/infraImages';
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

  const { currentIndex } = useBackgroundRotation(INFRA_IMAGES.general, 8000);
  const [scrollY, setScrollY] = useState(0);

  if (!accessToken || !user) return <Navigate to="/login" replace />;
  if (requiredRole && !requiredRole.includes(user.role)) return <Navigate to="/dashboard" replace />;

  const isScrolled = scrollY > 50;

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
        { name: 'Cameras', href: '/cameras', icon: Video },
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
    <div className="h-screen w-screen overflow-hidden relative" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>

      {/* Image Preloader (Forces browser to download images immediately) */}
      <div className="hidden">
        {INFRA_IMAGES.general.map(img => (
          <img key={`preload-${img}`} src={img} alt="preload" loading="eager" />
        ))}
      </div>

      {/* Cinematic Background Images */}
      <div className="absolute inset-0 z-0 overflow-hidden bg-[#1A1D20]">
        {INFRA_IMAGES.general.map((img, index) => (
          <div
            key={img}
            className="absolute inset-0 transition-all ease-in-out"
            style={{
              backgroundImage: `url('${img}')`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              opacity: index === currentIndex ? 1 : 0,
              filter: 'brightness(0.9) saturate(1.1)',
              transform: `scale(${index === currentIndex ? 1.05 : 1.0}) translateY(${scrollY * 0.1}px)`,
              transitionDuration: '1000ms',
              transitionProperty: 'all',
            }}
          />
        ))}

        {/* Global wash to neutralize harsh background colors and ensure text legibility */}
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.1), rgba(0,0,0,0.4))' }}
        />
      </div>

      {/* ─── Floating Magnetic Dock (Top Nav) ─── */}
      <div className="fixed top-0 left-0 right-0 z-50 flex justify-center pt-6 pointer-events-none">
        <motion.nav
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          className="pointer-events-auto flex items-center px-6 py-3 rounded-full gap-3 transition-all duration-300"
          style={{
            background: 'rgba(245, 247, 250, 0.75)',
            backdropFilter: 'blur(40px) saturate(120%)',
            border: '1px solid rgba(255,255,255,0.8)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.06), inset 0 0 0 1px rgba(255,255,255,0.5)',
            transform: isScrolled ? 'scale(0.95)' : 'scale(1)',
          }}
          onMouseLeave={() => setActiveDropdown(null)}
        >
          <Link to="/dashboard" className="w-12 h-12 rounded-full flex items-center justify-center mr-4 shadow-sm" style={{ background: '#7FB8B0', color: 'white' }}>
            <Building2 className="w-6 h-6" />
          </Link>

          {navItems.map((item) => {
            const isActive = location.pathname === item.href || (item.dropdown && item.dropdown.some(d => location.pathname === d.href));
            return (
              <div key={item.name} className="relative" onMouseEnter={() => setActiveDropdown(item.name)}>
                {item.href ? (
                  <Link to={item.href}>
                    <motion.div
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="px-5 py-2.5 rounded-full text-base font-bold flex items-center gap-2 cursor-pointer transition-colors"
                      style={isActive ? { background: 'rgba(255,255,255,0.9)', color: '#3A4046' } : { color: '#6B7280' }}
                    >
                      {item.name}
                    </motion.div>
                  </Link>
                ) : (
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    className="px-5 py-2.5 rounded-full text-base font-bold flex items-center gap-2 cursor-pointer transition-colors"
                    style={isActive ? { background: 'rgba(255,255,255,0.9)', color: '#3A4046' } : { color: '#6B7280' }}
                  >
                    {item.name} <ChevronDown className="w-4 h-4" />
                  </motion.div>
                )}

                {/* Dropdown Menu */}
                <AnimatePresence>
                  {activeDropdown === item.name && item.dropdown && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      transition={{ type: "spring", stiffness: 400, damping: 25 }}
                      className="absolute top-full left-1/2 -translate-x-1/2 mt-4 w-48 p-2 rounded-2xl"
                      style={{
                        background: 'rgba(255,255,255,0.85)',
                        backdropFilter: 'blur(30px)',
                        border: '1px solid rgba(255,255,255,0.8)',
                        boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
                      }}
                    >
                      {item.dropdown.map(d => (
                        <Link key={d.name} to={d.href} onClick={() => setActiveDropdown(null)}>
                          <motion.div
                            whileHover={{ x: 5, background: 'rgba(255,255,255,0.5)' }}
                            className="px-4 py-2.5 rounded-xl text-xs font-bold text-[#3A4046] flex items-center gap-2"
                          >
                            <d.icon className="w-4 h-4 text-[#7FB8B0]" />
                            {d.name}
                          </motion.div>
                        </Link>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}

          <div className="w-px h-6 mx-2" style={{ background: 'rgba(255,255,255,0.5)' }} />

          <button
            onClick={() => { setShowNotifications(!showNotifications); setShowUserMenu(false); }}
            className="w-10 h-10 rounded-full flex items-center justify-center relative hover:bg-white/50 transition-colors"
            style={{ color: '#6B7280' }}
          >
            <Bell className="w-5 h-5" />
            <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#E08585] animate-ping" />
          </button>

          <button
            onClick={() => { setShowUserMenu(!showUserMenu); setShowNotifications(false); }}
            className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white ml-2 transition-transform hover:scale-105"
            style={{ background: '#3A4046' }}
          >
            {user.name.charAt(0)}
          </button>
          
          {/* User Menu Dropdown */}
          <AnimatePresence>
            {showUserMenu && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className="absolute top-full right-0 mt-4 w-56 p-2 rounded-2xl"
                style={{
                  background: 'rgba(255,255,255,0.85)',
                  backdropFilter: 'blur(30px)',
                  border: '1px solid rgba(255,255,255,0.8)',
                  boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
                }}
              >
                <div className="px-4 py-3 mb-2 border-b border-white/50">
                  <p className="font-bold text-[#3A4046]">{user.name}</p>
                  <p className="text-[10px] font-bold text-[#7FB8B0]">{user.role}</p>
                </div>
                {user.role === 'ADMIN' && (
                  <Link to="/users" onClick={() => setShowUserMenu(false)}>
                    <div className="px-4 py-2.5 rounded-xl text-xs font-bold text-[#3A4046] hover:bg-white/50 flex items-center gap-2">
                      <Users className="w-4 h-4 text-[#7FB8B0]" /> Team
                    </div>
                  </Link>
                )}
                <Link to="/settings" onClick={() => setShowUserMenu(false)}>
                  <div className="px-4 py-2.5 rounded-xl text-xs font-bold text-[#3A4046] hover:bg-white/50 flex items-center gap-2">
                    <Settings className="w-4 h-4 text-[#7FB8B0]" /> Settings
                  </div>
                </Link>
                <button onClick={() => { logout(); setShowUserMenu(false); }} className="w-full text-left px-4 py-2.5 rounded-xl text-xs font-bold text-[#E08585] hover:bg-[#E08585]/10 flex items-center gap-2">
                  <LogOut className="w-4 h-4" /> Sign Out
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.nav>
      </div>

      {/* ─── Main Content ─── */}
      <div 
        className="absolute inset-0 z-10 overflow-y-auto overflow-x-hidden pt-28 pb-12 px-4 sm:px-8 max-w-[1600px] mx-auto w-full"
        onScroll={handleScroll}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4 }}
            className="w-full h-full"
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
