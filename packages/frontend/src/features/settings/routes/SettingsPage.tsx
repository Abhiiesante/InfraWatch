import { useState } from 'react';
import { useAuthStore } from '@/store/auth.store';
import { User, Building2, Bell, Loader2, Save, CheckCircle2 } from 'lucide-react';

type SettingsTab = 'profile' | 'organization' | 'notifications';

export const SettingsPage = () => {
  const { user, organization } = useAuthStore();
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    // Simulate save
    await new Promise(r => setTimeout(r, 800));
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const tabs: { id: SettingsTab; name: string; icon: typeof User }[] = [
    { id: 'profile', name: 'Profile', icon: User },
    { id: 'organization', name: 'Organization', icon: Building2 },
    { id: 'notifications', name: 'Notifications', icon: Bell },
  ];

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8 w-full animate-in fade-in">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-500 drop-">
          Settings
        </h1>
        <p className="text-slate-800/70 mt-2 text-lg font-medium">Manage your account and organization preferences.</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Settings Sidebar */}
        <div className="lg:w-56 flex-shrink-0">
          <nav className="glass rounded-2xl border border-white/20 p-3 shadow-xl space-y-1">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all duration-200 relative overflow-hidden ${
                    isActive
                      ? 'text-slate-800 '
                      : 'text-slate-800/80 hover:bg-primary/5 hover:text-primary'
                  }`}
                >
                  {isActive && <div className="absolute inset-0 bg-gradient-to-r from-[#7FB8B0] to-blue-500 opacity-90"></div>}
                  <tab.icon className={`w-5 h-5 relative z-10 ${isActive ? 'text-slate-800' : ''}`} />
                  <span className="relative z-10">{tab.name}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Settings Content */}
        <div className="flex-1 glass rounded-2xl border border-white/20 p-8 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>

          {activeTab === 'profile' && (
            <div className="space-y-8 animate-in fade-in relative z-10">
              <div>
                <h2 className="text-2xl font-extrabold text-[#3A4046] flex items-center gap-2">
                  <div className="w-1.5 h-6 bg-primary rounded-full"></div>
                  Profile Settings
                </h2>
                <p className="text-slate-800/70 mt-1 text-sm">Update your personal information.</p>
              </div>

              <div className="flex items-center gap-6 p-6 glass-panel/40 rounded-2xl border border-white/20 ">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#7FB8B0] to-[#6DA9A0] flex items-center justify-center text-slate-800 font-extrabold text-3xl shadow-lg shadow-primary/25">
                  {user?.name?.charAt(0)?.toUpperCase()}
                </div>
                <div>
                  <p className="font-bold text-xl text-[#3A4046]">{user?.name}</p>
                  <p className="text-slate-800/70 mt-1">{user?.email}</p>
                  <span className="inline-flex items-center mt-2 px-3 py-1 rounded-full text-xs font-bold bg-primary/10 text-primary border border-primary/20">
                    {user?.role}
                  </span>
                </div>
              </div>

              <div className="space-y-5">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Full Name</label>
                  <input defaultValue={user?.name} className="flex h-11 w-full rounded-xl border border-white/20 glass-panel/50 px-4 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary transition-all  hover:" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Email Address</label>
                  <input defaultValue={user?.email} type="email" className="flex h-11 w-full rounded-xl border border-white/20 glass-panel/50 px-4 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary transition-all  hover:" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Phone Number</label>
                  <input placeholder="+1 (555) 000-0000" className="flex h-11 w-full rounded-xl border border-white/20 glass-panel/50 px-4 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary transition-all  hover:" />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'organization' && (
            <div className="space-y-8 animate-in fade-in relative z-10">
              <div>
                <h2 className="text-2xl font-extrabold text-[#3A4046] flex items-center gap-2">
                  <div className="w-1.5 h-6 bg-primary rounded-full"></div>
                  Organization Settings
                </h2>
                <p className="text-slate-800/70 mt-1 text-sm">Manage your organization profile and preferences.</p>
              </div>

              <div className="p-6 glass-panel/40 rounded-2xl border border-white/20 ">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center shadow-inner">
                    <Building2 className="w-7 h-7 text-slate-800/70" />
                  </div>
                  <div>
                    <p className="font-bold text-lg text-[#3A4046]">{organization?.name}</p>
                    <span className="inline-flex items-center mt-1 px-3 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-blue-500 to-primary text-slate-800 ">
                      {organization?.plan || 'STARTER'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-5">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Organization Name</label>
                  <input defaultValue={organization?.name} className="flex h-11 w-full rounded-xl border border-white/20 glass-panel/50 px-4 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary transition-all  hover:" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Domain</label>
                  <input defaultValue={organization?.domain || ''} placeholder="e.g. acme.infrawatch.io" className="flex h-11 w-full rounded-xl border border-white/20 glass-panel/50 px-4 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary transition-all  hover:" />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="space-y-8 animate-in fade-in relative z-10">
              <div>
                <h2 className="text-2xl font-extrabold text-[#3A4046] flex items-center gap-2">
                  <div className="w-1.5 h-6 bg-primary rounded-full"></div>
                  Notification Preferences
                </h2>
                <p className="text-slate-800/70 mt-1 text-sm">Control how and when you receive notifications.</p>
              </div>

              <div className="space-y-4">
                {[
                  { title: 'New Incidents', desc: 'Get notified when new incidents are reported', defaultOn: true },
                  { title: 'Inspection Reminders', desc: 'Receive reminders for upcoming inspections', defaultOn: true },
                  { title: 'Assignment Updates', desc: 'Get notified when you are assigned to an incident', defaultOn: true },
                  { title: 'Comment Mentions', desc: 'Get notified when someone mentions you in a comment', defaultOn: true },
                  { title: 'Report Generation', desc: 'Get notified when reports are ready', defaultOn: false },
                  { title: 'Weekly Digest', desc: 'Receive a weekly summary email of all activity', defaultOn: false },
                ].map((pref, idx) => (
                  <div key={idx} className="flex items-center justify-between p-5 glass-panel/40 rounded-xl border border-white/20  hover: transition-all group">
                    <div>
                      <p className="font-bold text-[#3A4046] group-hover:text-primary transition-colors">{pref.title}</p>
                      <p className="text-sm text-slate-800/70 mt-0.5">{pref.desc}</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" defaultChecked={pref.defaultOn} className="sr-only peer" />
                      <div className="w-11 h-6 bg-slate-200 rounded-full peer peer-checked:bg-primary peer-checked:shadow-[0_0_12px_rgba(var(--color-primary),0.3)] transition-all duration-300 after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-[rgba(255,255,255,0.55)] after:rounded-full after:h-5 after:w-5 after:transition-all after:duration-300 peer-checked:after:translate-x-full after:"></div>
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Save Button */}
          <div className="mt-8 pt-6 border-t border-white/10 flex justify-end relative z-10">
            <button
              onClick={handleSave}
              disabled={saving}
              className="bg-gradient-to-r from-[#7FB8B0] to-[#6DA9A0] text-slate-800 px-8 py-2.5 rounded-xl font-bold hover:shadow-lg hover:shadow-primary/30 transition-all duration-300 flex items-center gap-2 disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : saved ? (
                <CheckCircle2 className="w-4 h-4" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {saved ? 'Saved!' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
