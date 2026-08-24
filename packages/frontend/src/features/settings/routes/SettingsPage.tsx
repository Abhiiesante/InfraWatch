import { useState } from 'react';
import { useAuthStore } from '@/store/auth.store';
import { User, Building2, Bell, Loader2, Save, CheckCircle2, Sliders } from 'lucide-react';

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
    <div className="space-y-8 w-full animate-in fade-in pb-12">
      {/* Header */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <Sliders className="w-8 h-8 text-indigo-600" />
            System & Account Settings
          </h1>
          <p className="text-slate-600 mt-1.5 text-base font-medium">Manage your account profile, organization parameters, and notification alerts.</p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Settings Sidebar */}
        <div className="lg:w-64 flex-shrink-0">
          <nav className="bg-white rounded-3xl border border-slate-200 p-3 shadow-sm space-y-1.5">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold transition-all duration-150 cursor-pointer ${
                    isActive
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <tab.icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                  <span>{tab.name}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Settings Content */}
        <div className="flex-1 bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
          {activeTab === 'profile' && (
            <div className="space-y-8 animate-in fade-in">
              <div>
                <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
                  Profile Settings
                </h2>
                <p className="text-slate-500 mt-1 text-xs font-medium">Update your personal account credentials.</p>
              </div>

              <div className="flex items-center gap-5 p-6 bg-slate-50 rounded-2xl border border-slate-200">
                <div className="w-16 h-16 rounded-2xl bg-indigo-600 flex items-center justify-center text-white font-black text-2xl shadow-md shadow-indigo-600/20">
                  {user?.name?.charAt(0)?.toUpperCase()}
                </div>
                <div>
                  <p className="font-extrabold text-lg text-slate-900">{user?.name}</p>
                  <p className="text-slate-600 text-xs font-medium mt-0.5">{user?.email}</p>
                  <span className="inline-flex items-center mt-2 px-3 py-0.5 rounded-full text-[10px] font-black bg-indigo-50 text-indigo-700 border border-indigo-200">
                    {user?.role}
                  </span>
                </div>
              </div>

              <div className="space-y-5">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Full Name</label>
                  <input defaultValue={user?.name} className="flex h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:border-indigo-500 transition-all" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Email Address</label>
                  <input defaultValue={user?.email} type="email" className="flex h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:border-indigo-500 transition-all" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Phone Number</label>
                  <input placeholder="+1 (555) 000-0000" className="flex h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:border-indigo-500 transition-all" />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'organization' && (
            <div className="space-y-8 animate-in fade-in">
              <div>
                <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
                  Organization Settings
                </h2>
                <p className="text-slate-500 mt-1 text-xs font-medium">Manage your organization profile and tenant subscription parameters.</p>
              </div>

              <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-white border border-slate-200 flex items-center justify-center shadow-xs">
                    <Building2 className="w-7 h-7 text-indigo-600" />
                  </div>
                  <div>
                    <p className="font-extrabold text-lg text-slate-900">{organization?.name}</p>
                    <span className="inline-flex items-center mt-1 px-3 py-0.5 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-800 border border-emerald-200">
                      {organization?.plan || 'ENTERPRISE TIER'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-5">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Organization Name</label>
                  <input defaultValue={organization?.name} className="flex h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:border-indigo-500 transition-all" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Domain / Tenant Identifier</label>
                  <input defaultValue={organization?.domain || ''} placeholder="e.g. infrawatch.corp" className="flex h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:border-indigo-500 transition-all" />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="space-y-8 animate-in fade-in">
              <div>
                <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
                  Notification Preferences
                </h2>
                <p className="text-slate-500 mt-1 text-xs font-medium">Control automated dispatch and threshold alerts.</p>
              </div>

              <div className="space-y-3">
                {[
                  { title: 'New Incidents & Anomalies', desc: 'Get real-time alerts when computer vision or acoustic anomalies are detected', defaultOn: true },
                  { title: 'Inspection Reminders', desc: 'Receive automated calendar notifications for scheduled asset surveys', defaultOn: true },
                  { title: 'SLA Escalations', desc: 'Alert supervisors when work order resolution times approach SLA limits', defaultOn: true },
                  { title: 'SCADA Actuator Trips', desc: 'Instant dispatch alert whenever an actuator safety trip is triggered', defaultOn: true },
                  { title: 'Daily Intelligence Briefing', desc: 'Receive summary report of all infrastructure health updates', defaultOn: false },
                ].map((pref, idx) => (
                  <div key={idx} className="flex items-center justify-between p-5 bg-slate-50 rounded-2xl border border-slate-200 hover:border-slate-300 transition-all">
                    <div>
                      <p className="font-extrabold text-slate-900 text-sm">{pref.title}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{pref.desc}</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" defaultChecked={pref.defaultOn} className="sr-only peer" />
                      <div className="w-11 h-6 bg-slate-200 rounded-full peer peer-checked:bg-slate-900 transition-all duration-300 after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all after:duration-300 peer-checked:after:translate-x-full after:shadow-xs"></div>
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Save Button */}
          <div className="mt-8 pt-6 border-t border-slate-100 flex justify-end">
            <button
              onClick={handleSave}
              disabled={saving}
              className="bg-slate-900 hover:bg-slate-800 text-white px-8 py-2.5 rounded-xl font-bold text-xs shadow-md shadow-slate-900/20 transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : saved ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
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

