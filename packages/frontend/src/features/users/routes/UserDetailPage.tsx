import { useParams, Link } from 'react-router-dom';
import { useUserDetails, useUpdateUser } from '../api/useUsers';
import { useAuthStore } from '@/store/auth.store';
import { ArrowLeft, Loader2, Shield, Mail, Phone, Calendar, Clock, UserCog } from 'lucide-react';
import { format } from 'date-fns';

const getRoleBadge = (role: string) => {
  switch (role) {
    case 'ADMIN':
      return 'bg-purple-100 text-purple-800 border-purple-200';
    case 'MANAGER':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'INSPECTOR':
      return 'bg-slate-800/10 text-emerald-800 border-emerald-200';
    default:
      return 'bg-slate-100 text-slate-800 border-[rgba(255,255,255,0.80)]';
  }
};

export const UserDetailPage = () => {
  const { id } = useParams();
  const userId = Number(id);
  const { user: currentUser } = useAuthStore();
  const { data: user, isLoading } = useUserDetails(userId);
  const { mutateAsync: updateUser, isPending: isUpdating } = useUpdateUser();

  const isAdmin = currentUser?.role === 'ADMIN';

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!user) {
    return <div className="p-8 text-center text-slate-800/70">User not found</div>;
  }

  const handleRoleChange = async (newRole: string) => {
    try {
      await updateUser({ id: userId, data: { role: newRole } });
    } catch (error) {
      console.error('Failed to update role:', error);
    }
  };

  const handleToggleActive = async () => {
    try {
      await updateUser({ id: userId, data: { isActive: !user.isActive } });
    } catch (error) {
      console.error('Failed to toggle status:', error);
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8 w-full animate-in fade-in">
      <Link to="/users" className="inline-flex items-center text-sm font-bold text-slate-800/70 hover:text-primary transition-colors glass-panel/50 px-4 py-2 rounded-lg border border-[rgba(255,255,255,0.80)]  backdrop-blur-sm w-fit">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Team
      </Link>

      {/* Profile Card */}
      <div className="glass rounded-2xl border border-white/20 p-8 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>

        <div className="flex flex-col md:flex-row items-start gap-8 relative z-10">
          <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-[#7FB8B0] to-[#6DA9A0] flex items-center justify-center text-slate-800 font-extrabold text-4xl shadow-lg shadow-primary/25">
            {user.name?.charAt(0)?.toUpperCase()}
          </div>
          <div className="flex-1 w-full">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-3xl font-extrabold text-[#3A4046]">{user.name}</h1>
                <p className="text-slate-800/70 mt-1 flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  {user.email}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className={`inline-flex items-center px-4 py-1.5 rounded-full text-sm font-bold border  ${getRoleBadge(user.role)}`}>
                  <Shield className="w-4 h-4 mr-1.5" />
                  {user.role}
                </span>
                <span className={`inline-flex items-center px-4 py-1.5 rounded-full text-sm font-bold border  ${
                  user.isActive !== false
                    ? 'bg-slate-800/10 text-emerald-800 border-emerald-200'
                    : 'bg-slate-100 text-slate-800/80 border-[rgba(255,255,255,0.80)]'
                }`}>
                  <span className={`w-2 h-2 rounded-full mr-2 ${user.isActive !== false ? 'bg-slate-800 animate-pulse' : 'bg-slate-400'}`}></span>
                  {user.isActive !== false ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="glass-panel/40 p-4 rounded-xl border border-white/20 ">
                <div className="flex items-center gap-2 text-slate-400 mb-1">
                  <Phone className="w-4 h-4" />
                  <span className="text-xs font-bold uppercase tracking-wider">Phone</span>
                </div>
                <p className="font-bold text-[#3A4046]">{user.phone || 'Not provided'}</p>
              </div>
              <div className="glass-panel/40 p-4 rounded-xl border border-white/20 ">
                <div className="flex items-center gap-2 text-slate-400 mb-1">
                  <Calendar className="w-4 h-4" />
                  <span className="text-xs font-bold uppercase tracking-wider">Joined</span>
                </div>
                <p className="font-bold text-[#3A4046]">{format(new Date(user.createdAt), 'MMM d, yyyy')}</p>
              </div>
              <div className="glass-panel/40 p-4 rounded-xl border border-white/20 ">
                <div className="flex items-center gap-2 text-slate-400 mb-1">
                  <Clock className="w-4 h-4" />
                  <span className="text-xs font-bold uppercase tracking-wider">Last Login</span>
                </div>
                <p className="font-bold text-[#3A4046]">{user.lastLoginAt ? format(new Date(user.lastLoginAt), 'MMM d, h:mm a') : 'Never'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Admin Actions */}
        {isAdmin && user.id !== currentUser?.id && (
          <div className="mt-8 pt-6 border-t border-white/10 flex flex-wrap items-center gap-4 relative z-10">
            <div className="flex items-center gap-2">
              <UserCog className="w-4 h-4 text-slate-800/70" />
              <span className="text-sm font-bold text-slate-800/70">Change Role:</span>
            </div>
            {['INSPECTOR', 'MANAGER', 'ADMIN'].map((role) => (
              <button
                key={role}
                onClick={() => handleRoleChange(role)}
                disabled={isUpdating || user.role === role}
                className={`px-4 py-2 rounded-xl text-sm font-bold border  transition-all disabled:opacity-50 ${
                  user.role === role
                    ? 'bg-primary text-slate-800 border-primary shadow-primary/25'
                    : 'glass-panel/50 text-slate-700 border-[rgba(255,255,255,0.80)] hover:border-primary hover:text-primary'
                }`}
              >
                {isUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : role}
              </button>
            ))}

            <div className="ml-auto">
              <button
                onClick={handleToggleActive}
                disabled={isUpdating}
                className={`px-5 py-2 rounded-xl text-sm font-bold transition-all disabled:opacity-50 ${
                  user.isActive !== false
                    ? 'bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200'
                    : 'bg-emerald-50 text-emerald-600 hover:bg-slate-800/10 border border-emerald-200'
                }`}
              >
                {user.isActive !== false ? 'Deactivate User' : 'Reactivate User'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
