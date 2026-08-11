import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAssets } from '../api/useAssets';
import { Building2, Search, Plus } from 'lucide-react';
import { AddAssetModal } from '../components/AddAssetModal';
import { getAssetThumbnail } from '@/lib/infraImages';

export const AssetsListPage = () => {
  const [page, setPage] = useState(1);
  const take = 10;
  const skip = (page - 1) * take;

  const { data, isLoading } = useAssets({ skip, take });

  return (
    <div className="max-w-7xl mx-auto space-y-8 w-full">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight" style={{ color: '#3A4046' }}>
            Assets Directory
          </h1>
          <p className="mt-2 text-lg font-medium" style={{ color: '#6B7280' }}>Manage your organization's physical infrastructure.</p>
        </div>
        <AddAssetModal>
          <button className="glass-btn-primary flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Add Asset
          </button>
        </AddAssetModal>
      </div>

      {/* Main Content Area */}
      <div className="glass-panel overflow-hidden glass-sheen">
        {/* Toolbar */}
        <div
          className="p-5 flex flex-col md:flex-row items-center gap-4 relative z-10"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.40)', background: 'rgba(255,255,255,0.20)' }}
        >
          <div className="relative flex-1 max-w-md w-full group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search className="w-5 h-5" style={{ color: '#9CA3AF' }} />
            </div>
            <input 
              type="text" 
              placeholder="Search assets by name or address..." 
              className="glass-input w-full pl-11"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto relative z-10">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.30)' }}>
                <th className="px-8 py-5 text-xs font-bold uppercase tracking-wider" style={{ color: '#9CA3AF' }}>Asset Information</th>
                <th className="px-8 py-5 text-xs font-bold uppercase tracking-wider" style={{ color: '#9CA3AF' }}>Type</th>
                <th className="px-8 py-5 text-xs font-bold uppercase tracking-wider" style={{ color: '#9CA3AF' }}>Status</th>
                <th className="px-8 py-5 text-xs font-bold uppercase tracking-wider text-right" style={{ color: '#9CA3AF' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={4} className="px-8 py-20 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-10 h-10 border-4 rounded-full animate-spin mb-4" style={{ borderColor: 'rgba(127,184,176,0.20)', borderTopColor: '#7FB8B0' }}></div>
                      <p className="font-medium" style={{ color: '#9CA3AF' }}>Loading assets...</p>
                    </div>
                  </td>
                </tr>
              ) : data?.assets?.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-8 py-20 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <div
                        className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
                        style={{ background: 'rgba(255,255,255,0.40)' }}
                      >
                        <Building2 className="w-8 h-8" style={{ color: '#9CA3AF' }} />
                      </div>
                      <p className="font-medium text-lg" style={{ color: '#6B7280' }}>No assets found</p>
                      <p className="text-sm mt-1" style={{ color: '#9CA3AF' }}>Try adjusting your search or add a new asset.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                data?.assets?.map((asset: any, i: number) => (
                  <tr
                    key={asset.id}
                    className="group transition-colors duration-200 animate-stagger-up"
                    style={{ animationDelay: `${i * 60}ms`, borderBottom: '1px solid rgba(255,255,255,0.30)' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.30)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-4">
                        <img
                          src={getAssetThumbnail(asset.assetType?.name)}
                          alt={asset.name}
                          className="w-12 h-12 rounded-xl object-cover flex-shrink-0 "
                          style={{ border: '1px solid rgba(255,255,255,0.60)' }}
                        />
                        <div>
                          <p className="font-bold text-base" style={{ color: '#3A4046' }}>{asset.name}</p>
                          <p className="text-sm font-medium mt-0.5" style={{ color: '#9CA3AF' }}>{asset.address || 'No address provided'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <span
                        className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold"
                        style={{ background: 'rgba(255,255,255,0.40)', color: '#6B7280', border: '1px solid rgba(255,255,255,0.50)' }}
                      >
                        {asset.assetType?.name || 'Unknown Type'}
                      </span>
                    </td>
                    <td className="px-8 py-5">
                      <span className="status-chip status-chip--active">
                        <span className="w-1.5 h-1.5 rounded-full animate-pulse-glow" style={{ background: '#8FC0A0', color: '#8FC0A0' }}></span>
                        {asset.status || 'ACTIVE'}
                      </span>
                    </td>
                    <td className="px-8 py-5 text-right">
                      <Link 
                        to={`/assets/${asset.id}`}
                        className="glass-btn-secondary inline-flex items-center text-xs py-2 px-4"
                      >
                        View Details
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination controls */}
        <div
          className="p-5 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm font-medium relative z-10"
          style={{ borderTop: '1px solid rgba(255,255,255,0.40)', background: 'rgba(255,255,255,0.15)', color: '#6B7280' }}
        >
          <p>Showing <span className="font-bold" style={{ color: '#3A4046' }}>{data?.assets?.length || 0}</span> of <span className="font-bold" style={{ color: '#3A4046' }}>{data?.total || 0}</span> results</p>
          <div className="flex gap-2">
            <button 
              disabled={page === 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
              className="glass-btn-secondary px-4 py-2 text-xs disabled:opacity-50"
            >
              Previous
            </button>
            <button 
              disabled={(data?.assets?.length ?? 0) < take}
              onClick={() => setPage(p => p + 1)}
              className="glass-btn-secondary px-4 py-2 text-xs disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
