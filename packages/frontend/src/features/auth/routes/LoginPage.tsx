import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { INFRA_IMAGES } from '@/lib/infraImages';
import { Building2 } from 'lucide-react';

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
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>

      {/* Full-bleed cinematic hero background with Ken Burns */}
      <div className="absolute inset-0 z-0">
        <div
          className="absolute inset-0 animate-ken-burns"
          style={{
            backgroundImage: `url(${INFRA_IMAGES.loginHero})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            filter: 'brightness(0.65)',
          }}
        />
        {/* Soft atmospheric overlay */}
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(170deg, rgba(238,242,243,0.35) 0%, rgba(228,236,240,0.25) 100%)',
          }}
        />
      </div>

      {/* Glass login panel */}
      <div
        className="max-w-md w-full space-y-8 rounded-2xl p-10 relative z-10 animate-page-enter glass-sheen"
        style={{
          background: 'rgba(255,255,255,0.70)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          border: '1px solid rgba(255,255,255,0.85)',
          boxShadow: '0 16px 64px rgba(0,0,0,0.12)',
        }}
      >
        <div>
          <div
            className="mx-auto w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg mb-6"
            style={{ background: 'rgba(127,184,176,0.85)', boxShadow: '0 8px 24px rgba(127,184,176,0.25)' }}
          >
            <Building2 className="w-8 h-8 text-slate-800" />
          </div>
          <h2 className="mt-2 text-center text-4xl font-extrabold tracking-tight" style={{ color: '#3A4046' }}>
            InfraWatch
          </h2>
          <p className="mt-3 text-center font-medium" style={{ color: '#6B7280' }}>
            Welcome back. Please sign in to continue.
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div
              className="rounded-xl p-4 animate-page-enter"
              style={{
                background: 'rgba(224,133,133,0.10)',
                border: '1px solid rgba(224,133,133,0.25)',
              }}
            >
              <p className="text-sm font-medium" style={{ color: '#B85C5C' }}>{error}</p>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-bold mb-1.5" style={{ color: '#3A4046' }}>
                Email Address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="glass-input block w-full"
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-bold mb-1.5" style={{ color: '#3A4046' }}>
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="glass-input block w-full"
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
              className="glass-btn-primary w-full flex justify-center py-3 text-sm disabled:opacity-50"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-slate-800" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Signing in...
                </span>
              ) : 'Sign in'}
            </button>
          </div>

          <div className="text-center pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.50)' }}>
            <p className="text-sm font-medium" style={{ color: '#6B7280' }}>
              Don't have an account?{' '}
              <Link to="/register" className="font-bold transition-colors" style={{ color: '#7FB8B0' }}>
                Create one now
              </Link>
            </p>
          </div>
        </form>

        {/* Demo credentials */}
        <div
          className="mt-8 p-4 rounded-xl"
          style={{
            background: 'rgba(255,255,255,0.40)',
            border: '1px solid rgba(255,255,255,0.60)',
          }}
        >
          <p className="text-sm font-medium text-center mb-2" style={{ color: '#3A4046' }}>
            Demo Credentials
          </p>
          <div
            className="flex flex-col gap-1 text-xs p-3 rounded-lg font-mono"
            style={{
              background: 'rgba(255,255,255,0.40)',
              border: '1px solid rgba(255,255,255,0.50)',
              color: '#6B7280',
            }}
          >
            <div className="flex justify-between"><span>Email:</span> <span className="font-bold" style={{ color: '#3A4046' }}>admin@demo.local</span></div>
            <div className="flex justify-between"><span>Password:</span> <span className="font-bold" style={{ color: '#3A4046' }}>Demo@Password123</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}
