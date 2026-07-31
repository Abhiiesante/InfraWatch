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
      return 'bg-purple-100 text-purple-800 dark:bg-purple-500/20 dark:text-purple-300 border-purple-200 dark:border-purple-500/30';
    case 'MANAGER':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-300 border-blue-200 dark:border-blue-500/30';
    case 'INSPECTOR':
      return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/30';
    default:
      return 'bg-slate-100 text-slate-800 dark:bg-slate-500/20 dark:text-slate-300 border-slate-200 dark:border-slate-500/30';
  }
};

export const UsersListPage = () => {
  const { user: currentUser } = useAuthStore();
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
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

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 w-full animate-in fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-500 dark:from-white dark:to-slate-400 drop-shadow-sm">
            Team Members
          </h1>
          <p className="text-slate-500 mt-2 text-lg font-medium">Manage users and role assignments.</p>
        </div>
        {isAdmin && (
          <Dialog.Root open={showCreate} onOpenChange={setShowCreate}>
            <Dialog.Trigger asChild>
              <button className="bg-gradient-to-r from-primary to-blue-600 text-white px-6 py-2.5 rounded-xl font-bold hover:shadow-lg hover:shadow-primary/30 hover:-translate-y-0.5 transition-all duration-300 flex items-center gap-2">
                <Plus className="w-5 h-5" />
                Add User
              </button>
            </Dialog.Trigger>
            <Dialog.Portal>
              <Dialog.Overlay className="fixed inset-0 bg-black/30 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
              <Dialog.Content className="glass fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 p-8 duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-2xl">
                <div className="flex flex-col space-y-1.5 text-center sm:text-left">
                  <Dialog.Title className="text-2xl font-bold leading-none tracking-tight text-foreground">Add New User</Dialog.Title>
                  <Dialog.Description className="text-sm text-muted-foreground mt-1">
                    Create a new team member with role-based access.
                  </Dialog.Description>
                </div>
                <form onSubmit={handleCreateUser} className="space-y-5 py-4">
                  <div className="space-y-2">
                    <label htmlFor="user-name" className="text-sm font-medium leading-none text-foreground">Full Name</label>
                    <input required id="user-name" name="name" className="flex h-11 w-full rounded-xl border border-white/20 bg-white/50 px-4 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 transition-all shadow-sm hover:shadow-md" placeholder="e.g. Jane Smith" />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="user-email" className="text-sm font-medium leading-none text-foreground">Email Address</label>
                    <input required id="user-email" name="email" type="email" className="flex h-11 w-full rounded-xl border border-white/20 bg-white/50 px-4 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 transition-all shadow-sm hover:shadow-md" placeholder="e.g. jane@company.com" />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="user-password" className="text-sm font-medium leading-none text-foreground">Password</label>
                    <input required id="user-password" name="password" type="password" minLength={8} className="flex h-11 w-full rounded-xl border border-white/20 bg-white/50 px-4 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 transition-all shadow-sm hover:shadow-md" placeholder="Minimum 8 characters" />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="user-role" className="text-sm font-medium leading-none text-foreground">Role</label>
                    <select required id="user-role" name="role" className="flex h-11 w-full rounded-xl border border-white/20 bg-white/50 px-4 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary transition-all shadow-sm hover:shadow-md">
                      <option value="INSPECTOR">Inspector</option>
                      <option value="MANAGER">Manager</option>
                      <option value="ADMIN">Admin</option>
                    </select>
                  </div>
                  <div className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-3 pt-6">
                    <Dialog.Close asChild>
                      <button type="button" className="mt-2 sm:mt-0 inline-flex items-center justify-center rounded-xl text-sm font-semibold transition-all hover:bg-secondary hover:text-secondary-foreground h-11 px-6 py-2 shadow-sm">Cancel</button>
                    </Dialog.Close>
                    <button disabled={isCreating} type="submit" className="inline-flex items-center justify-center rounded-xl text-sm font-semibold transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 hover:shadow-[0_4px_20px_hsla(242,84%,58%,0.4)] h-11 px-8 py-2">
                      {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Create User
                    </button>
                  </div>
                </form>
                <Dialog.Close className="absolute right-6 top-6 rounded-full p-1 opacity-70 transition-all hover:opacity-100 hover:bg-black/5 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2">
                  <X className="h-5 w-5 text-foreground" />
                  <span className="sr-only">Close</span>
                </Dialog.Close>
              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>
        )}
      </div>

      {/* Main Content */}
      <div className="glass rounded-2xl border border-white/20 overflow-hidden shadow-xl slide-in-bottom relative">
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl -ml-32 -mb-32 pointer-events-none"></div>

        {/* Toolbar */}
        <div className="p-5 border-b border-white/10 bg-white/40 dark:bg-black/20 backdrop-blur-md flex flex-col md:flex-row items-center gap-4 relative z-10">
          <div className="relative flex-1 max-w-md w-full group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search className="w-5 h-5 text-slate-400 group-focus-within:text-primary transition-colors" />
            </div>
            <input
              type="text"
              placeholder="Search team members..."
              className="w-full pl-11 pr-4 py-3 rounded-xl bg-white/60 dark:bg-black/40 border border-white/30 dark:border-white/10 text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 shadow-sm transition-all backdrop-blur-sm font-medium"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto relative z-10">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-100/50 dark:bg-slate-800/50 text-slate-700 dark:text-slate-300 font-bold uppercase tracking-wider text-xs backdrop-blur-md">
              <tr>
                <th className="px-8 py-5">Member</th>
                <th className="px-8 py-5">Role</th>
                <th className="px-8 py-5">Status</th>
                <th className="px-8 py-5">Last Login</th>
                <th className="px-8 py-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/50 dark:divide-slate-700/50">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-8 py-20 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin mb-4"></div>
                      <p className="text-slate-500 font-medium">Loading team members...</p>
                    </div>
                  </td>
                </tr>
              ) : data?.users?.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-8 py-20 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                        <Users className="w-8 h-8 text-slate-400" />
                      </div>
                      <p className="text-slate-500 font-medium text-lg">No team members found</p>
                    </div>
                  </td>
                </tr>
              ) : (
                data?.users?.map((user: any) => (
                  <tr key={user.id} className="group hover:bg-white/60 dark:hover:bg-white/5 transition-colors duration-200">
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-4">
                        <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary/80 to-blue-600 flex items-center justify-center text-white font-bold text-lg shadow-md group-hover:shadow-lg transition-all">
                          {user.name?.charAt(0)?.toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 dark:text-white text-base group-hover:text-primary transition-colors">{user.name}</p>
                          <p className="text-sm font-medium text-slate-500 mt-0.5">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border shadow-sm ${getRoleBadge(user.role)}`}>
                        <Shield className="w-3 h-3 mr-1.5" />
                        {user.role}
                      </span>
                    </td>
                    <td className="px-8 py-5">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border shadow-sm ${
                        user.isActive !== false
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/30'
                          : 'bg-slate-100 text-slate-600 dark:bg-slate-700/50 dark:text-slate-400 border-slate-200 dark:border-slate-600/30'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full mr-2 ${user.isActive !== false ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`}></span>
                        {user.isActive !== false ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-8 py-5 font-medium text-slate-500 dark:text-slate-400">
                      {user.lastLoginAt ? format(new Date(user.lastLoginAt), 'MMM d, yyyy') : 'Never'}
                    </td>
                    <td className="px-8 py-5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          to={`/users/${user.id}`}
                          className="inline-flex items-center justify-center p-2 rounded-lg text-sm font-bold text-slate-700 dark:text-slate-200 bg-white/50 dark:bg-slate-800/50 hover:bg-white dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-600 shadow-sm hover:shadow transition-all"
                          title="View details"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                        {isAdmin && user.id !== currentUser?.id && (
                          <button
                            onClick={() => handleDeactivateUser(user.id)}
                            className="inline-flex items-center justify-center p-2 rounded-lg text-sm font-bold text-rose-600 dark:text-rose-400 bg-rose-50/50 dark:bg-rose-500/10 hover:bg-rose-100 dark:hover:bg-rose-500/20 border border-rose-200 dark:border-rose-500/30 shadow-sm hover:shadow transition-all"
                            title="Deactivate user"
                          >
                            <Trash2 className="w-4 h-4" />
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
        <div className="p-5 border-t border-white/10 bg-white/20 dark:bg-black/10 backdrop-blur-md flex flex-col sm:flex-row items-center justify-between gap-4 text-sm font-medium text-slate-600 dark:text-slate-400 relative z-10">
          <p>Showing <span className="font-bold text-slate-900 dark:text-white">{data?.users?.length || 0}</span> of <span className="font-bold text-slate-900 dark:text-white">{data?.total || 0}</span> results</p>
          <div className="flex gap-2">
            <button
              disabled={page === 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
              className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 hover:bg-white dark:hover:bg-slate-800 disabled:opacity-50 disabled:hover:bg-transparent shadow-sm transition-all"
            >
              Previous
            </button>
            <button
              disabled={data?.users?.length < take}
              onClick={() => setPage(p => p + 1)}
              className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 hover:bg-white dark:hover:bg-slate-800 disabled:opacity-50 disabled:hover:bg-transparent shadow-sm transition-all"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
