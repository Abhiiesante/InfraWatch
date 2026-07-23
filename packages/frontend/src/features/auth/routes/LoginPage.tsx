import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';

export function LoginPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);
  const [email, setEmail] = useState('admin@demo.local');
  const [password, setPassword] = useState('Demo@Password123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = await authApi.login(email, password);
      setAuth(data.user, data.organization, data.tokens.accessToken, data.tokens.refreshToken);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background Decorators */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/20 rounded-full blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/20 rounded-full blur-[100px] pointer-events-none"></div>
      
      <div className="max-w-md w-full space-y-8 glass rounded-3xl p-10 border border-white/20 dark:border-white/10 shadow-2xl relative z-10 animate-in fade-in slide-in-bottom">
        <div>
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-primary to-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-primary/30 mb-6">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <h2 className="mt-2 text-center text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-500 dark:from-white dark:to-slate-400">
            InfraWatch
          </h2>
          <p className="mt-3 text-center text-slate-500 dark:text-slate-400 font-medium">
            Welcome back. Please sign in to continue.
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 p-4 animate-in slide-in-top fade-in duration-300">
              <p className="text-sm font-medium text-rose-800 dark:text-rose-300">{error}</p>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Email Address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="block w-full px-4 py-3 rounded-xl bg-white/60 dark:bg-black/40 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 shadow-sm transition-all backdrop-blur-sm font-medium"
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="block w-full px-4 py-3 rounded-xl bg-white/60 dark:bg-black/40 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 shadow-sm transition-all backdrop-blur-sm font-medium"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-lg shadow-primary/30 text-sm font-bold text-white bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 hover:-translate-y-0.5 transition-all duration-300"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Signing in...
                </span>
              ) : 'Sign in'}
            </button>
          </div>

          <div className="text-center pt-2 border-t border-slate-200 dark:border-slate-700/50">
            <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">
              Don't have an account?{' '}
              <Link to="/register" className="font-bold text-primary hover:text-blue-500 transition-colors">
                Create one now
              </Link>
            </p>
          </div>
        </form>

        <div className="mt-8 p-4 bg-slate-100/80 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 backdrop-blur-sm">
          <p className="text-sm text-slate-700 dark:text-slate-300 font-medium text-center mb-2">
            Demo Credentials
          </p>
          <div className="flex flex-col gap-1 text-xs text-slate-500 dark:text-slate-400 bg-white/50 dark:bg-black/20 p-3 rounded-lg border border-slate-200/50 dark:border-white/5 font-mono">
            <div className="flex justify-between"><span>Email:</span> <span className="font-bold text-slate-700 dark:text-slate-300">admin@demo.local</span></div>
            <div className="flex justify-between"><span>Password:</span> <span className="font-bold text-slate-700 dark:text-slate-300">Demo@Password123</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}
