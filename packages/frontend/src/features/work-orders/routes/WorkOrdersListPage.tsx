import React, { useState } from 'react';
import { useWorkOrders, useSLACountdown, useCreateWorkOrder, useUpdateWorkOrder, WorkOrder } from '../api/useWorkOrders';
import { useAssets } from '@/features/assets/api/useAssets';
import { useUsers } from '@/features/users/api/useUsers';
import { ClipboardList, Clock, AlertTriangle, Plus, CheckCircle, UserCheck } from 'lucide-react';

export const WorkOrdersListPage: React.FC = () => {
  const { data: workOrdersData } = useWorkOrders();
  const workOrders: WorkOrder[] = Array.isArray(workOrdersData) ? workOrdersData : [];
  const { data: slaItems = [] } = useSLACountdown();
  const { data: assetsData } = useAssets({ skip: 0, take: 50 });
  const { data: users = [] } = useUsers({ skip: 0, take: 50 });

  const createWorkOrderMutation = useCreateWorkOrder();
  const updateWorkOrderMutation = useUpdateWorkOrder();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showSignModal, setShowSignModal] = useState<number | null>(null);
  const [signatureText, setSignatureText] = useState('');

  const [newWO, setNewWO] = useState({
    title: '',
    description: '',
    assetId: 0,
    assignedToId: 0,
    priority: 'HIGH',
    slaHours: 4,
  });

  const assets = assetsData?.assets || [];

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    await createWorkOrderMutation.mutateAsync({
      assetId: Number(newWO.assetId) || assets[0]?.id || 1,
      assignedToId: newWO.assignedToId ? Number(newWO.assignedToId) : undefined,
      title: newWO.title,
      description: newWO.description,
      priority: newWO.priority,
      slaHours: Number(newWO.slaHours),
    });
    setShowCreateModal(false);
  };

  const handleCompleteWithSignature = async (id: number) => {
    if (!signatureText) return;
    await updateWorkOrderMutation.mutateAsync({
      id,
      data: {
        status: 'COMPLETED',
        signatureUrl: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="50"><text x="10" y="35" font-family="cursive" font-size="24" fill="white">${encodeURIComponent(signatureText)}</text></svg>`,
      },
    });
    setShowSignModal(null);
    setSignatureText('');
  };

  const slaItemsList = Array.isArray(slaItems) ? slaItems : [];
  const breachedCount = slaItemsList.filter((i) => i.isBreached).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-[rgba(255,255,255,0.55)] p-6 rounded-2xl border border-[rgba(255,255,255,0.80)] ">
        <div>
          <div className="flex items-center gap-2">
            <ClipboardList className="w-7 h-7 text-[#7FB8B0]" />
            <h1 className="text-2xl font-black text-[#3A4046]">Digital Work Orders & SLA Escalation Board</h1>
          </div>
          <p className="text-sm text-slate-800/70 mt-1 font-medium">
            Dispatch maintenance tasks, track resolution SLA countdowns, and capture inspector sign-offs.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[rgba(127,184,176,0.85)] hover:bg-[rgba(127,184,176,0.12)]0 text-slate-800 font-bold rounded-xl transition-all shadow-lg shadow-indigo-600/20"
        >
          <Plus className="w-4 h-4" /> Create Work Order
        </button>
      </div>

      {/* SLA Alert Banner */}
      {breachedCount > 0 && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-center justify-between text-rose-700">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-slate-800 animate-bounce" />
            <span className="text-sm font-bold">
              SLA Breach Warning: {breachedCount} work orders have exceeded resolution deadline!
            </span>
          </div>
          <span className="text-xs uppercase tracking-wider font-bold bg-rose-500/20 text-rose-700 px-3 py-1 rounded-full border border-rose-500/30">
            Escalation Active
          </span>
        </div>
      )}

      {/* Kanban Board Columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* PENDING Column */}
        <div className="bg-[rgba(255,255,255,0.55)] p-4 rounded-2xl border border-[rgba(255,255,255,0.80)] space-y-4 ">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <span className="text-xs font-extrabold text-slate-800/80 uppercase tracking-wider flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Pending Dispatch
            </span>
            <span className="text-xs px-2.5 py-0.5 bg-amber-100 text-amber-800 rounded-full font-extrabold border border-amber-300">
              {workOrders.filter((w) => w.status === 'PENDING').length}
            </span>
          </div>

          <div className="space-y-3">
            {workOrders
              .filter((w) => w.status === 'PENDING')
              .map((wo) => (
                <div key={wo.id} className="p-4 bg-transparent hover:bg-slate-100 rounded-xl border border-[rgba(255,255,255,0.80)] space-y-3 transition-all ">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="text-sm font-bold text-[#3A4046]">{wo.title}</h4>
                    <span className={`text-[10px] px-2 py-0.5 font-black rounded-full border uppercase flex-shrink-0 ${
                      wo.priority === 'CRITICAL'
                        ? 'bg-rose-100 text-rose-700 border-rose-300'
                        : 'bg-amber-100 text-amber-700 border-amber-300'
                    }`}>
                      {wo.priority}
                    </span>
                  </div>
                  <p className="text-xs text-slate-800/80 line-clamp-2">{wo.description || 'No description provided.'}</p>
                  <div className="flex items-center justify-between text-xs text-slate-800/70 pt-2 border-t border-[rgba(255,255,255,0.80)] font-mono">
                    <span className="flex items-center gap-1 font-semibold">
                      <Clock className="w-3.5 h-3.5 text-slate-800" /> SLA: {new Date(wo.slaDeadline).toLocaleTimeString()}
                    </span>
                    <button
                      onClick={() => updateWorkOrderMutation.mutate({ id: wo.id, data: { status: 'IN_PROGRESS' } })}
                      className="text-xs text-[#7FB8B0] hover:underline font-bold"
                    >
                      Start Task →
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </div>

        {/* IN_PROGRESS Column */}
        <div className="bg-[rgba(255,255,255,0.55)] p-4 rounded-2xl border border-[rgba(255,255,255,0.80)] space-y-4 ">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <span className="text-xs font-extrabold text-slate-800/80 uppercase tracking-wider flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[rgba(127,184,176,0.12)]0 animate-pulse" /> In Progress
            </span>
            <span className="text-xs px-2.5 py-0.5 bg-indigo-100 text-indigo-800 rounded-full font-extrabold border border-indigo-300">
              {workOrders.filter((w) => w.status === 'IN_PROGRESS').length}
            </span>
          </div>

          <div className="space-y-3">
            {workOrders
              .filter((w) => w.status === 'IN_PROGRESS')
              .map((wo) => (
                <div key={wo.id} className="p-4 bg-transparent hover:bg-slate-100 rounded-xl border border-[rgba(255,255,255,0.80)] space-y-3 transition-all ">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="text-sm font-bold text-[#3A4046]">{wo.title}</h4>
                    <span className="text-[10px] px-2 py-0.5 font-black rounded-full bg-indigo-100 text-[#7FB8B0] border border-indigo-300 uppercase flex-shrink-0">
                      IN PROGRESS
                    </span>
                  </div>
                  <p className="text-xs text-slate-800/80 font-medium">{wo.asset?.name || 'Asset ID: ' + wo.assetId}</p>
                  <div className="flex items-center justify-between text-xs pt-2 border-t border-[rgba(255,255,255,0.80)]">
                    <span className="text-slate-800/80 flex items-center gap-1 font-semibold">
                      <UserCheck className="w-3.5 h-3.5 text-slate-800" /> {wo.assignedTo?.name || 'Assigned'}
                    </span>
                    <button
                      onClick={() => setShowSignModal(wo.id)}
                      className="px-2.5 py-1 bg-emerald-600 hover:bg-slate-800 text-slate-800 font-bold text-xs rounded-lg transition-all "
                    >
                      Sign & Complete
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </div>

        {/* COMPLETED Column */}
        <div className="bg-[rgba(255,255,255,0.55)] p-4 rounded-2xl border border-[rgba(255,255,255,0.80)] space-y-4 ">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <span className="text-xs font-extrabold text-slate-800/80 uppercase tracking-wider flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-800" /> Completed
            </span>
            <span className="text-xs px-2.5 py-0.5 bg-slate-800/10 text-emerald-800 rounded-full font-extrabold border border-slate-800/20">
              {workOrders.filter((w) => w.status === 'COMPLETED').length}
            </span>
          </div>

          <div className="space-y-3">
            {workOrders
              .filter((w) => w.status === 'COMPLETED')
              .map((wo) => (
                <div key={wo.id} className="p-4 bg-transparent rounded-xl border border-[rgba(255,255,255,0.80)] space-y-2 opacity-90 ">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-sm font-semibold text-slate-800/80 line-through">{wo.title}</h4>
                    <CheckCircle className="w-4 h-4 text-slate-800 flex-shrink-0" />
                  </div>
                  <p className="text-xs text-slate-800/70">Completed at {wo.completedAt ? new Date(wo.completedAt).toLocaleTimeString() : 'Recently'}</p>
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* Signature Completion Modal */}
      {showSignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-transparent/70 backdrop-blur-sm p-4">
          <div className="bg-[rgba(255,255,255,0.55)] border border-[rgba(255,255,255,0.60)] rounded-2xl w-full max-w-md p-6 space-y-4">
            <h3 className="text-lg font-bold text-slate-100">Inspector Digital Sign-off</h3>
            <p className="text-xs text-slate-400">Type your inspector full name to digitally sign off completion of this work order.</p>
            <input
              type="text"
              placeholder="e.g. Inspector John Doe"
              value={signatureText}
              onChange={(e) => setSignatureText(e.target.value)}
              className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-100"
            />
            <div className="flex justify-end gap-3 pt-4 border-t border-[rgba(255,255,255,0.60)]">
              <button onClick={() => setShowSignModal(null)} className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold">
                Cancel
              </button>
              <button
                onClick={() => handleCompleteWithSignature(showSignModal)}
                disabled={!signatureText}
                className="px-4 py-2 bg-emerald-600 hover:bg-slate-800 text-slate-800 rounded-xl text-xs font-semibold disabled:opacity-50"
              >
                Confirm Completion
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Work Order Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-transparent/70 backdrop-blur-sm p-4">
          <div className="bg-[rgba(255,255,255,0.55)] border border-[rgba(255,255,255,0.60)] rounded-2xl w-full max-w-md p-6 space-y-4">
            <h3 className="text-lg font-bold text-slate-100">Dispatch Work Order</h3>
            <form onSubmit={handleCreate} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Title</label>
                <input
                  type="text"
                  required
                  placeholder="Task title"
                  value={newWO.title}
                  onChange={(e) => setNewWO({ ...newWO, title: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-100"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Asset Target</label>
                <select
                  value={newWO.assetId}
                  onChange={(e) => setNewWO({ ...newWO, assetId: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-100"
                >
                  {assets.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Assign Inspector</label>
                <select
                  value={newWO.assignedToId}
                  onChange={(e) => setNewWO({ ...newWO, assignedToId: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-100"
                >
                  <option value={0}>Unassigned</option>
                  {users.map((u: { id: number; name: string; role: string }) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.role})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Priority</label>
                  <select
                    value={newWO.priority}
                    onChange={(e) => setNewWO({ ...newWO, priority: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-100"
                  >
                    <option value="LOW">LOW</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="HIGH">HIGH</option>
                    <option value="CRITICAL">CRITICAL</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">SLA Hours</label>
                  <input
                    type="number"
                    value={newWO.slaHours}
                    onChange={(e) => setNewWO({ ...newWO, slaHours: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-100"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-[rgba(255,255,255,0.60)]">
                <button type="button" onClick={() => setShowCreateModal(false)} className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl">
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 bg-[rgba(127,184,176,0.85)] hover:bg-[rgba(127,184,176,0.12)]0 text-slate-800 rounded-xl font-semibold">
                  Dispatch Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
