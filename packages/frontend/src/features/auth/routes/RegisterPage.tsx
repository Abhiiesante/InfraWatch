import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { INFRA_IMAGES } from '@/lib/infraImages';
import { Building2 } from 'lucide-react';

export function RegisterPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [organizationName, setOrganizationName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name || !email || !password || !organizationName) {
      setError('All fields are required');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setLoading(true);

    try {
      const data = await authApi.register(email, password, name, organizationName);
      setAuth(data.user, data.organization, data.tokens.accessToken, data.tokens.refreshToken);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Registration failed. Please try again.');
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
            backgroundImage: `url(${INFRA_IMAGES.registerHero})`,
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

      {/* Glass registration panel */}
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
            Create Account
          </h2>
          <p className="mt-3 text-center font-medium" style={{ color: '#6B7280' }}>
            Set up your organization and get started
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
              <label htmlFor="organizationName" className="block text-sm font-bold mb-1.5" style={{ color: '#3A4046' }}>
                Organization Name
              </label>
              <input
                id="organizationName"
                name="organizationName"
                type="text"
                required
                className="glass-input block w-full"
                placeholder="Acme Infrastructure"
                value={organizationName}
                onChange={(e) => setOrganizationName(e.target.value)}
              />
            </div>
            
            <div>
              <label htmlFor="name" className="block text-sm font-bold mb-1.5" style={{ color: '#3A4046' }}>
                Full Name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                className="glass-input block w-full"
                placeholder="Jane Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

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
                  Creating account...
                </span>
              ) : 'Register'}
            </button>
          </div>

          <div className="text-center pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.50)' }}>
            <p className="text-sm font-medium" style={{ color: '#6B7280' }}>
              Already have an account?{' '}
              <Link to="/login" className="font-bold transition-colors" style={{ color: '#7FB8B0' }}>
                Sign in
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
