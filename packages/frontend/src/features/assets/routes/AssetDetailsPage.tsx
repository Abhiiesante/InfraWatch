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
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <Link to="/assets" className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-slate-900 transition">
        <ArrowLeft className="w-4 h-4 mr-1" />
        Back to Assets
      </Link>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex items-start gap-6">
        <div className="p-4 bg-slate-100 rounded-xl text-slate-600">
          <Building2 className="w-12 h-12" />
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-slate-900">{asset.name}</h1>
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
              {asset.status || 'ACTIVE'}
            </span>
          </div>
          <p className="text-slate-500 mt-1">{asset.description || 'No description available.'}</p>
          <div className="mt-4 flex gap-4 text-sm">
            <div className="bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100 font-medium text-slate-700">
              Type: {asset.assetType?.name || 'Unknown'}
            </div>
            <div className="bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100 font-medium text-slate-700">
              Location: {asset.address || 'Unknown'}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <nav className="flex space-x-8" aria-label="Tabs">
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
                whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2
                ${activeTab === tab.id
                  ? 'border-slate-900 text-slate-900'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                }
              `}
            >
              <tab.icon className="w-4 h-4" />
              {tab.name}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 min-h-[400px]">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <h2 className="text-lg font-bold text-slate-900 border-b pb-2">Asset Information</h2>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-6">
              <div>
                <dt className="text-sm font-medium text-slate-500">Created At</dt>
                <dd className="mt-1 text-sm text-slate-900">{format(new Date(asset.createdAt), 'PPpp')}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-slate-500">Metadata</dt>
                <dd className="mt-1 text-sm text-slate-900">
                  <pre className="bg-slate-50 p-2 rounded text-xs">{JSON.stringify(asset.metadata || {}, null, 2)}</pre>
                </dd>
              </div>
            </dl>
          </div>
        )}

        {activeTab === 'cameras' && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-slate-900 border-b pb-2">Associated Cameras</h2>
            {asset.cameras?.length === 0 ? (
              <p className="text-slate-500 py-4">No cameras installed at this asset.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {asset.cameras?.map((cam: any) => (
                  <div key={cam.id} className="border border-slate-200 rounded-lg p-4 flex gap-4 bg-slate-50 items-center">
                    <div className="w-12 h-12 bg-slate-200 rounded flex items-center justify-center">
                      <Video className="w-6 h-6 text-slate-400" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">{cam.name}</p>
                      <p className="text-xs text-slate-500">{cam.status}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'incidents' && (
          <div className="text-center py-12 text-slate-500">
            <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-slate-400" />
            <p>Incident list will be populated here.</p>
          </div>
        )}
        
        {activeTab === 'inspections' && (
          <div className="text-center py-12 text-slate-500">
            <ClipboardCheck className="w-8 h-8 mx-auto mb-2 text-slate-400" />
            <p>Inspection history will be populated here.</p>
          </div>
        )}
      </div>
    </div>
  );
};
