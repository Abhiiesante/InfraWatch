import { useParams, Link } from 'react-router-dom';
import { useUserDetails, useUpdateUser } from '../api/useUsers';
import { useAuthStore } from '@/store/auth.store';
import { ArrowLeft, Loader2, Shield, Mail, Phone, Calendar, Clock, UserCog } from 'lucide-react';
import { format } from 'date-fns';

const getRoleBadge = (role: string) => {
  switch (role) {
    case 'ADMIN':
      return 'bg-purple-50 text-purple-800 border-purple-200';
    case 'MANAGER':
      return 'bg-blue-50 text-blue-800 border-blue-200';
    case 'INSPECTOR':
      return 'bg-emerald-50 text-emerald-800 border-emerald-200';
    default:
      return 'bg-slate-50 text-slate-700 border-slate-200';
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
    return <div className="p-8 text-center text-slate-600 font-bold">User not found</div>;
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
    <div className="space-y-6 w-full animate-in fade-in pb-12">
      <Link to="/users" className="inline-flex items-center text-xs font-bold text-slate-700 hover:text-slate-900 bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-xs transition-colors w-fit">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Team
      </Link>

      {/* Profile Card */}
      <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
        <div className="flex flex-col md:flex-row items-start gap-8">
          <div className="w-24 h-24 rounded-3xl bg-indigo-600 flex items-center justify-center text-white font-black text-4xl shadow-md shadow-indigo-600/20">
            {user.name?.charAt(0)?.toUpperCase()}
          </div>
          <div className="flex-1 w-full">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-3xl font-black text-slate-900 tracking-tight">{user.name}</h1>
                <p className="text-slate-600 mt-1 flex items-center gap-2 text-sm font-medium">
                  <Mail className="w-4 h-4 text-slate-400" />
                  {user.email}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className={`inline-flex items-center px-3.5 py-1.5 rounded-full text-xs font-black border ${getRoleBadge(user.role)}`}>
                  <Shield className="w-3.5 h-3.5 mr-1.5" />
                  {user.role}
                </span>
                <span className={`inline-flex items-center px-3.5 py-1.5 rounded-full text-xs font-black border ${
                  user.isActive !== false
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : 'bg-slate-100 text-slate-600 border-slate-200'
                }`}>
                  <span className={`w-2 h-2 rounded-full mr-2 ${user.isActive !== false ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`}></span>
                  {user.isActive !== false ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50">
                <div className="flex items-center gap-2 text-slate-400 mb-1">
                  <Phone className="w-4 h-4" />
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Phone</span>
                </div>
                <p className="font-extrabold text-slate-900 text-sm">{user.phone || 'Not provided'}</p>
              </div>
              <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50">
                <div className="flex items-center gap-2 text-slate-400 mb-1">
                  <Calendar className="w-4 h-4" />
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Joined</span>
                </div>
                <p className="font-extrabold text-slate-900 text-sm">{format(new Date(user.createdAt), 'MMM d, yyyy')}</p>
              </div>
              <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50">
                <div className="flex items-center gap-2 text-slate-400 mb-1">
                  <Clock className="w-4 h-4" />
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Last Login</span>
                </div>
                <p className="font-extrabold text-slate-900 text-sm">{user.lastLoginAt ? format(new Date(user.lastLoginAt), 'MMM d, h:mm a') : 'Never'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Admin Actions */}
        {isAdmin && user.id !== currentUser?.id && (
          <div className="mt-8 pt-6 border-t border-slate-100 flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <UserCog className="w-4 h-4 text-slate-500" />
              <span className="text-xs font-bold text-slate-700">Change Role:</span>
            </div>
            {['INSPECTOR', 'MANAGER', 'ADMIN'].map((role) => (
              <button
                key={role}
                onClick={() => handleRoleChange(role)}
                disabled={isUpdating || user.role === role}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-all disabled:opacity-50 cursor-pointer ${
                  user.role === role
                    ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {isUpdating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : role}
              </button>
            ))}

            <div className="ml-auto">
              <button
                onClick={handleToggleActive}
                disabled={isUpdating}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all disabled:opacity-50 cursor-pointer ${
                  user.isActive !== false
                    ? 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                    : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
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

