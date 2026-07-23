import { ReactNode } from 'react';
import { Navigate, Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/auth.store';
import { Building2, LayoutDashboard, AlertTriangle, ClipboardCheck, FileText, LogOut } from 'lucide-react';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: string[];
}

export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { user, accessToken, logout } = useAuthStore();
  const location = useLocation();

  if (!accessToken || !user) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && !requiredRole.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Assets', href: '/assets', icon: Building2 },
    { name: 'Incidents', href: '/incidents', icon: AlertTriangle },
    { name: 'Inspections', href: '/inspections', icon: ClipboardCheck },
    { name: 'Reports', href: '/reports', icon: FileText },
  ];

  return (
    <div className="min-h-screen flex text-foreground">
      {/* Glass Sidebar */}
      <aside className="w-64 glass flex flex-col m-4 rounded-2xl overflow-hidden border border-white/20 shadow-xl relative z-10">
        <div className="h-20 flex items-center px-6 border-b border-white/10 relative overflow-hidden">
          {/* Subtle gradient glow */}
          <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-transparent opacity-50"></div>
          <div className="w-10 h-10 bg-gradient-to-br from-primary to-blue-600 rounded-xl mr-3 flex items-center justify-center shadow-lg shadow-primary/25 relative z-10">
            <Building2 className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-xl tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-slate-800 to-slate-500 dark:from-white dark:to-slate-300 relative z-10">
            InfraWatch
          </span>
        </div>
        
        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
          {navigation.map((item) => {
            const isActive = location.pathname.startsWith(item.href);
            return (
              <Link
                key={item.name}
                to={item.href}
                className={`
                  group flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-300 relative overflow-hidden
                  ${isActive 
                    ? 'text-white shadow-md' 
                    : 'text-slate-600 dark:text-slate-300 hover:text-primary'}
                `}
              >
                {isActive && (
                  <div className="absolute inset-0 bg-gradient-to-r from-primary to-blue-500 opacity-90 transition-opacity"></div>
                )}
                {!isActive && (
                  <div className="absolute inset-0 bg-primary/0 group-hover:bg-primary/5 transition-colors"></div>
                )}
                <item.icon className={`w-5 h-5 relative z-10 transition-transform duration-300 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`} />
                <span className="relative z-10">{item.name}</span>
                {isActive && (
                  <div className="absolute right-2 w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)] animate-pulse"></div>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-white/10 bg-white/5 backdrop-blur-md">
          <div className="flex items-center gap-3 mb-4 px-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center font-bold text-white shadow-md">
              {user.name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-800 dark:text-white truncate">{user.name}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{user.role}</p>
            </div>
          </div>
          <button 
            onClick={() => logout()}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-destructive/10 hover:text-destructive transition-all duration-200 group"
          >
            <LogOut className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden p-4 pl-0">
        <div className="flex-1 overflow-y-auto rounded-2xl glass p-6 animate-in">
          {children}
        </div>
      </main>
    </div>
  );
}
