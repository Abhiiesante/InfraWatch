import { useState, useEffect } from 'react';
import { useIncidents } from '../api/useIncidents';
import { AlertTriangle, Plus, MessageSquare, GripVertical, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { CreateIncidentModal } from '../components/CreateIncidentModal';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { apiClient } from '@/lib/api';
import { useQueryClient } from '@tanstack/react-query';

const COLUMNS = ['OPEN', 'ACKNOWLEDGED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];

function getSeverityColor(severity: string) {
  switch (severity) {
    case 'CRITICAL': return 'bg-rose-500/10 text-rose-600 border-rose-500/30';
    case 'HIGH': return 'bg-orange-500/10 text-orange-600 border-orange-500/30';
    case 'MEDIUM': return 'bg-amber-500/10 text-amber-600 border-amber-500/30';
    default: return 'bg-cyan-500/10 text-cyan-600 border-cyan-500/30';
  }
}

export const IncidentsListPage = () => {
  const queryClient = useQueryClient();
  const { data, isLoading } = useIncidents({ skip: 0, take: 100 });
  
  // Local state for optimistic UI updates during drag-and-drop
  const [boardData, setBoardData] = useState<Record<string, any[]>>({
    OPEN: [],
    ACKNOWLEDGED: [],
    IN_PROGRESS: [],
    RESOLVED: [],
    CLOSED: [],
  });

  // Sync server data to local state when loaded
  useEffect(() => {
    if (data?.incidents) {
      const newBoard: Record<string, any[]> = {
        OPEN: [],
        ACKNOWLEDGED: [],
        IN_PROGRESS: [],
        RESOLVED: [],
        CLOSED: [],
      };
      
      data.incidents.forEach((incident: any) => {
        const mappedStatus = incident.status === 'INVESTIGATING' ? 'IN_PROGRESS' : incident.status;
        if (newBoard[mappedStatus]) {
          newBoard[mappedStatus].push(incident);
        } else {
          newBoard['OPEN'].push(incident); // fallback
        }
      });
      
      setBoardData(newBoard);
    }
  }, [data]);

  const onDragEnd = async (result: DropResult) => {
    const { source, destination, draggableId } = result;

    // Dropped outside a valid column
    if (!destination) return;

    // Dropped in the same spot
    if (
      source.droppableId === destination.droppableId &&
      source.index === destination.index
    ) {
      return;
    }

    const sourceColId = source.droppableId;
    const destColId = destination.droppableId;

    const sourceCol = [...boardData[sourceColId]];
    const destCol = sourceColId === destColId ? sourceCol : [...boardData[destColId]];

    const [movedItem] = sourceCol.splice(source.index, 1);
    
    // Update local status optimistically
    movedItem.status = destColId;
    destCol.splice(destination.index, 0, movedItem);

    setBoardData(prev => ({
      ...prev,
      [sourceColId]: sourceCol,
      [destColId]: destCol,
    }));

    // Trigger API call
    try {
      await apiClient.put(`/incidents/${draggableId}`, { status: destColId });
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
    } catch (err) {
      // Revert if API fails
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
    }
  };

  return (
    <div className="max-w-[1600px] mx-auto space-y-8 w-full">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-800">
            Incident Kanban
          </h1>
          <p className="mt-2 text-lg font-medium text-slate-500">
            Drag and drop incidents across investigation stages.
          </p>
        </div>
        <CreateIncidentModal>
          <button className="px-6 py-3 rounded-xl bg-slate-900 text-white font-bold hover:bg-slate-800 transition-colors shadow-lg shadow-slate-900/20 flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Report Incident
          </button>
        </CreateIncidentModal>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center p-24">
          <Loader2 className="w-10 h-10 animate-spin text-slate-400" />
        </div>
      ) : (
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 h-[calc(100vh-220px)] min-h-[600px]">
            {COLUMNS.map((columnId) => (
              <div key={columnId} className="flex flex-col h-full bg-slate-100/50 rounded-2xl border border-slate-200/50 p-4">
                <div className="flex items-center justify-between mb-4 px-2">
                  <h3 className="font-extrabold text-slate-700 tracking-wide text-sm">{columnId}</h3>
                  <span className="bg-slate-200 text-slate-600 text-xs font-bold px-2 py-0.5 rounded-full">
                    {boardData[columnId]?.length || 0}
                  </span>
                </div>
                
                <Droppable droppableId={columnId}>
                  {(provided, snapshot) => (
                    <div
                      {...provided.droppableProps}
                      ref={provided.innerRef}
                      className={`flex-1 transition-colors rounded-xl overflow-y-auto ${
                        snapshot.isDraggingOver ? 'bg-slate-200/50' : ''
                      }`}
                    >
                      <div className="space-y-3 p-1">
                        {boardData[columnId]?.map((incident, index) => (
                          <Draggable key={String(incident.id)} draggableId={String(incident.id)} index={index}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                className={`bg-white rounded-xl p-4 shadow-sm border transition-shadow ${
                                  snapshot.isDragging ? 'shadow-xl border-indigo-300 ring-2 ring-indigo-500/20 rotate-2' : 'border-slate-200 hover:border-slate-300'
                                }`}
                                onClick={() => window.location.href = `/incidents/${incident.id}`}
                              >
                                <div className="flex justify-between items-start mb-2">
                                  <div className="flex gap-2">
                                    <div {...provided.dragHandleProps} className="mt-0.5 cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-600">
                                      <GripVertical className="w-4 h-4" />
                                    </div>
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${getSeverityColor(incident.severity)} uppercase`}>
                                      {incident.severity}
                                    </span>
                                  </div>
                                  <span className="text-xs font-bold text-slate-400">#{incident.id}</span>
                                </div>
                                
                                <h4 className="font-bold text-slate-800 text-sm leading-tight line-clamp-2 mb-2">
                                  {incident.title}
                                </h4>
                                
                                <div className="flex items-center justify-between text-xs font-medium text-slate-500 mt-4">
                                  <div className="flex items-center gap-1.5 truncate max-w-[120px]">
                                    <AlertTriangle className="w-3.5 h-3.5" />
                                    <span className="truncate">{incident.asset?.name || 'No Asset'}</span>
                                  </div>
                                  <span>{format(new Date(incident.createdAt), 'MMM d')}</span>
                                </div>
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    </div>
                  )}
                </Droppable>
              </div>
            ))}
          </div>
        </DragDropContext>
      )}
    </div>
  );
};
