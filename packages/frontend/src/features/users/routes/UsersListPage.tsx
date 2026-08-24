import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useUsers, useCreateUser, useDeleteUser } from '../api/useUsers';
import { useAuthStore } from '@/store/auth.store';
import { Users, Search, Plus, Shield, Loader2, X, Trash2, Eye } from 'lucide-react';
import * as Dialog from '@radix-ui/react-dialog';
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

export const UsersListPage = () => {
  const { user: currentUser } = useAuthStore();
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const take = 10;
  const skip = (page - 1) * take;

  const { data, isLoading } = useUsers({ skip, take });
  const { mutateAsync: createUser, isPending: isCreating } = useCreateUser();
  const { mutateAsync: deleteUser } = useDeleteUser();

  const isAdmin = currentUser?.role === 'ADMIN';

  const handleCreateUser = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    try {
      await createUser({
        name: formData.get('name') as string,
        email: formData.get('email') as string,
        password: formData.get('password') as string,
        role: formData.get('role') as string,
      });
      setShowCreate(false);
    } catch (error) {
      console.error('Failed to create user:', error);
    }
  };

  const handleDeactivateUser = async (userId: number) => {
    if (window.confirm('Are you sure you want to deactivate this user?')) {
      try {
        await deleteUser(userId);
      } catch (error) {
        console.error('Failed to deactivate user:', error);
      }
    }
  };

  const usersList = (data?.users || []).filter((u: any) =>
    !searchQuery || u.name?.toLowerCase().includes(searchQuery.toLowerCase()) || u.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-8 w-full animate-in fade-in pb-12">
      {/* Header */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <Users className="w-8 h-8 text-indigo-600" />
            Engineering Team & Personnel
          </h1>
          <p className="text-slate-600 mt-1.5 text-base font-medium">Manage organization accounts, certified inspectors, and RBAC permission tiers.</p>
        </div>
        {isAdmin && (
          <Dialog.Root open={showCreate} onOpenChange={setShowCreate}>
            <Dialog.Trigger asChild>
              <button className="bg-slate-900 hover:bg-slate-800 text-white px-6 py-2.5 rounded-xl font-bold text-xs shadow-md shadow-slate-900/20 transition-all flex items-center gap-2 cursor-pointer">
                <Plus className="w-4 h-4" />
                Add User
              </button>
            </Dialog.Trigger>
            <Dialog.Portal>
              <Dialog.Overlay className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 z-50" />
              <Dialog.Content className="bg-white fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 p-8 duration-200 border border-slate-200 shadow-2xl rounded-3xl animate-in fade-in">
                <div className="flex flex-col space-y-1.5 text-left">
                  <Dialog.Title className="text-xl font-extrabold text-slate-900">Add New Team Member</Dialog.Title>
                  <Dialog.Description className="text-xs text-slate-500 mt-0.5 font-medium">
                    Create a new personnel account with role-based access rights.
                  </Dialog.Description>
                </div>
                <form onSubmit={handleCreateUser} className="space-y-4 py-2">
                  <div className="space-y-1">
                    <label htmlFor="user-name" className="text-xs font-bold text-slate-700">Full Name</label>
                    <input required id="user-name" name="name" className="flex h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:border-indigo-500 transition-all" placeholder="e.g. Inspector Jane Doe" />
                  </div>
                  <div className="space-y-1">
                    <label htmlFor="user-email" className="text-xs font-bold text-slate-700">Email Address</label>
                    <input required id="user-email" name="email" type="email" className="flex h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:border-indigo-500 transition-all" placeholder="e.g. jane@infrawatch.corp" />
                  </div>
                  <div className="space-y-1">
                    <label htmlFor="user-password" className="text-xs font-bold text-slate-700">Password</label>
                    <input required id="user-password" name="password" type="password" minLength={8} className="flex h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:border-indigo-500 transition-all" placeholder="Minimum 8 characters" />
                  </div>
                  <div className="space-y-1">
                    <label htmlFor="user-role" className="text-xs font-bold text-slate-700">Role</label>
                    <select required id="user-role" name="role" className="flex h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:border-indigo-500 transition-all">
                      <option value="INSPECTOR">Inspector</option>
                      <option value="MANAGER">Manager</option>
                      <option value="ADMIN">Admin</option>
                    </select>
                  </div>
                  <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                    <Dialog.Close asChild>
                      <button type="button" className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-200 transition-colors">Cancel</button>
                    </Dialog.Close>
                    <button disabled={isCreating} type="submit" className="bg-slate-900 hover:bg-slate-800 text-white px-6 py-2 rounded-xl text-xs font-bold shadow-sm transition-colors flex items-center gap-2 disabled:opacity-50">
                      {isCreating && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                      Create User
                    </button>
                  </div>
                </form>
                <Dialog.Close className="absolute right-6 top-6 rounded-full p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all">
                  <X className="h-5 w-5" />
                  <span className="sr-only">Close</span>
                </Dialog.Close>
              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>
        )}
      </div>

      {/* Main Content Card */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Search Toolbar */}
        <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row items-center gap-4">
          <div className="relative flex-1 max-w-md w-full">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
              <Search className="w-4 h-4 text-slate-400" />
            </div>
            <input
              type="text"
              placeholder="Search team members by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 transition-all"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead className="bg-slate-50 text-slate-700 font-extrabold uppercase tracking-wider text-[11px] border-b border-slate-100">
              <tr>
                <th className="px-6 py-4">Member</th>
                <th className="px-6 py-4">Role</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Last Login</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-8 h-8 border-3 border-indigo-600/30 border-t-indigo-600 rounded-full animate-spin mb-3"></div>
                      <p className="text-slate-500 font-medium">Loading team members...</p>
                    </div>
                  </td>
                </tr>
              ) : usersList.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center mb-3">
                        <Users className="w-6 h-6 text-slate-400" />
                      </div>
                      <p className="text-slate-700 font-bold text-sm">No team members found</p>
                    </div>
                  </td>
                </tr>
              ) : (
                usersList.map((user: any) => (
                  <tr key={user.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3.5">
                        <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-xs">
                          {user.name?.charAt(0)?.toUpperCase()}
                        </div>
                        <div>
                          <p className="font-extrabold text-slate-900 text-xs">{user.name}</p>
                          <p className="text-[11px] font-medium text-slate-500 mt-0.5">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black border ${getRoleBadge(user.role)}`}>
                        <Shield className="w-3 h-3 mr-1" />
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black border ${
                        user.isActive !== false
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : 'bg-slate-100 text-slate-600 border-slate-200'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${user.isActive !== false ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`}></span>
                        {user.isActive !== false ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-semibold text-slate-600 text-xs">
                      {user.lastLoginAt ? format(new Date(user.lastLoginAt), 'MMM d, yyyy') : 'Never'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          to={`/users/${user.id}`}
                          className="inline-flex items-center justify-center p-2 rounded-lg text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
                          title="View details"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </Link>
                        {isAdmin && user.id !== currentUser?.id && (
                          <button
                            onClick={() => handleDeactivateUser(user.id)}
                            className="inline-flex items-center justify-center p-2 rounded-lg text-rose-600 bg-rose-50 hover:bg-rose-100 transition-colors"
                            title="Deactivate user"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="p-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-semibold text-slate-600 bg-slate-50/50">
          <p>Showing <span className="font-extrabold text-slate-900">{usersList.length}</span> of <span className="font-extrabold text-slate-900">{data?.total || 0}</span> results</p>
          <div className="flex gap-2">
            <button
              disabled={page === 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
              className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 font-bold disabled:opacity-40 transition-all cursor-pointer"
            >
              Previous
            </button>
            <button
              disabled={(data?.users?.length || 0) < take}
              onClick={() => setPage(p => p + 1)}
              className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 font-bold disabled:opacity-40 transition-all cursor-pointer"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

