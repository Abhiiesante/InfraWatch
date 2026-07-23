import { useParams, Link } from 'react-router-dom';
import { useAssetDetails } from '../api/useAssets';
import { Building2, Loader2, Video, AlertTriangle, ClipboardCheck, ArrowLeft } from 'lucide-react';
import { useState } from 'react';
import { format } from 'date-fns';

export const AssetDetailsPage = () => {
  const { id } = useParams();
  const { data: asset, isLoading } = useAssetDetails(Number(id));
  const [activeTab, setActiveTab] = useState('overview');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!asset) {
    return <div className="p-8 text-center text-slate-500">Asset not found</div>;
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 w-full animate-in fade-in">
      <Link to="/assets" className="inline-flex items-center text-sm font-bold text-slate-500 hover:text-primary transition-colors bg-white/50 dark:bg-slate-800/50 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 shadow-sm backdrop-blur-sm w-fit">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Assets
      </Link>

      <div className="glass rounded-2xl border border-white/20 p-8 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
        
        <div className="flex flex-col md:flex-row items-start gap-8 relative z-10">
          <div className="p-6 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 rounded-2xl text-slate-700 dark:text-slate-300 shadow-inner">
            <Building2 className="w-16 h-16" />
          </div>
          <div className="flex-1 w-full">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-300">{asset.name}</h1>
              <span className="inline-flex items-center justify-center px-4 py-1.5 rounded-full text-sm font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30 shadow-sm whitespace-nowrap w-fit">
                <span className="w-2 h-2 rounded-full bg-emerald-500 mr-2 animate-pulse"></span>
                {asset.status || 'ACTIVE'}
              </span>
            </div>
            <p className="text-slate-500 dark:text-slate-400 mt-2 text-lg">{asset.description || 'No description available.'}</p>
            
            <div className="mt-6 flex flex-wrap gap-4 text-sm">
              <div className="bg-white/60 dark:bg-slate-800/60 px-4 py-2.5 rounded-xl border border-slate-200/50 dark:border-slate-700/50 font-bold text-slate-700 dark:text-slate-300 shadow-sm backdrop-blur-sm flex items-center gap-2">
                <span className="text-slate-400">Type:</span> 
                {asset.assetType?.name || 'Unknown'}
              </div>
              <div className="bg-white/60 dark:bg-slate-800/60 px-4 py-2.5 rounded-xl border border-slate-200/50 dark:border-slate-700/50 font-bold text-slate-700 dark:text-slate-300 shadow-sm backdrop-blur-sm flex items-center gap-2">
                <span className="text-slate-400">Location:</span> 
                {asset.address || 'Unknown'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200 dark:border-slate-800 relative z-10">
        <nav className="flex space-x-2 md:space-x-8 overflow-x-auto no-scrollbar" aria-label="Tabs">
          {[
            { id: 'overview', name: 'Overview', icon: Building2 },
            { id: 'cameras', name: `Cameras (${asset.cameras?.length || 0})`, icon: Video },
            { id: 'incidents', name: 'Incidents', icon: AlertTriangle },
            { id: 'inspections', name: 'Inspections', icon: ClipboardCheck },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                whitespace-nowrap py-4 px-4 font-bold text-sm flex items-center gap-2 transition-all border-b-2 relative
                ${activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600'
                }
              `}
            >
              <tab.icon className={`w-5 h-5 ${activeTab === tab.id ? 'text-primary' : ''}`} />
              {tab.name}
              {activeTab === tab.id && (
                <span className="absolute bottom-0 left-0 w-full h-0.5 bg-primary shadow-[0_-2px_10px_rgba(var(--color-primary),0.5)]"></span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="glass rounded-2xl border border-white/20 p-8 shadow-xl min-h-[400px] relative overflow-hidden slide-in-bottom">
        
        {activeTab === 'overview' && (
          <div className="space-y-8 animate-in fade-in">
            <h2 className="text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <div className="w-1.5 h-6 bg-primary rounded-full"></div>
              Asset Information
            </h2>
            <dl className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-white/40 dark:bg-slate-800/40 p-6 rounded-2xl border border-white/20 shadow-sm backdrop-blur-sm">
                <dt className="text-sm font-bold text-slate-500 dark:text-slate-400 mb-1">Created At</dt>
                <dd className="text-lg font-medium text-slate-900 dark:text-white">{format(new Date(asset.createdAt), 'PPpp')}</dd>
              </div>
              <div className="bg-white/40 dark:bg-slate-800/40 p-6 rounded-2xl border border-white/20 shadow-sm backdrop-blur-sm">
                <dt className="text-sm font-bold text-slate-500 dark:text-slate-400 mb-2">Metadata</dt>
                <dd className="text-sm text-slate-900 dark:text-slate-300">
                  <pre className="bg-slate-900 text-slate-300 p-4 rounded-xl text-xs overflow-x-auto shadow-inner font-mono">
                    {JSON.stringify(asset.metadata || {}, null, 2)}
                  </pre>
                </dd>
              </div>
            </dl>
          </div>
        )}

        {activeTab === 'cameras' && (
          <div className="space-y-6 animate-in fade-in">
            <h2 className="text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2 mb-6">
              <div className="w-1.5 h-6 bg-primary rounded-full"></div>
              Associated Cameras
            </h2>
            {asset.cameras?.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                  <Video className="w-8 h-8 text-slate-400" />
                </div>
                <p className="text-slate-500 font-medium text-lg">No cameras installed</p>
                <p className="text-slate-400 text-sm mt-1">There are currently no cameras associated with this asset.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {asset.cameras?.map((cam: any) => (
                  <div key={cam.id} className="group bg-white/60 dark:bg-slate-800/60 border border-slate-200/50 dark:border-slate-700/50 rounded-2xl p-5 flex gap-5 items-center shadow-sm hover:shadow-md transition-all backdrop-blur-sm cursor-pointer">
                    <div className="w-14 h-14 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-600 rounded-xl flex items-center justify-center shadow-inner group-hover:scale-105 transition-transform">
                      <Video className="w-7 h-7 text-slate-500 dark:text-slate-300" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 dark:text-white text-lg group-hover:text-primary transition-colors">{cam.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`w-2 h-2 rounded-full ${cam.status === 'ONLINE' ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                        <p className="text-sm font-medium text-slate-500">{cam.status}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'incidents' && (
          <div className="flex flex-col items-center justify-center py-20 text-center animate-in fade-in">
            <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-6">
              <AlertTriangle className="w-10 h-10 text-slate-400" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">No Incidents</h3>
            <p className="text-slate-500 max-w-sm">Incident history will be populated here when issues are reported for this asset.</p>
          </div>
        )}
        
        {activeTab === 'inspections' && (
          <div className="flex flex-col items-center justify-center py-20 text-center animate-in fade-in">
            <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-6">
              <ClipboardCheck className="w-10 h-10 text-slate-400" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">No Inspections</h3>
            <p className="text-slate-500 max-w-sm">Inspection records will appear here once routine checks are performed on this asset.</p>
          </div>
        )}
      </div>
    </div>
  );
};
