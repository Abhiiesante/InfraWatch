# Incident Pages

> **IEKB Section:** 05 — Frontend  
> **Document:** 09-incident-pages.md  
> **Last Updated:** 2026-07-16  
> **Owner:** Frontend Lead  
> **Status:** Approved

---

## Table of Contents

1. [Overview](#overview)
2. [Incident Kanban Board (Drag and Drop)](#incident-kanban-board-drag-and-drop)
3. [Incident Details & Comment Thread](#incident-details--comment-thread)
4. [Related Documents](#related-documents)

---

## Overview

The Incident Management feature allows teams to track and resolve problems. While there is a standard paginated list view available, the primary interface for managing incidents is a **Kanban Board** that allows users to drag and drop incidents between statuses.

---

## Incident Kanban Board (Drag and Drop)

We use `@hello-pangea/dnd` (a modern fork of `react-beautiful-dnd`) to implement the Kanban board. 

The columns represent the valid states: `OPEN` ➔ `ACKNOWLEDGED` ➔ `IN_PROGRESS` ➔ `RESOLVED`. (Closed incidents are removed from the board).

```tsx
// src/features/incidents/components/IncidentKanbanBoard.tsx
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { useIncidents } from '../api/useIncidents';
import { useUpdateIncidentStatus } from '../api/useUpdateStatus';
import { IncidentCard } from './IncidentCard';
import { Skeleton } from '@/components/ui/skeleton';

const COLUMNS = ['OPEN', 'ACKNOWLEDGED', 'IN_PROGRESS', 'RESOLVED'];

export const IncidentKanbanBoard = () => {
  // Fetch all active incidents (pagination disabled or set to high limit for board view)
  const { data, isLoading } = useIncidents({ status: COLUMNS.join(',') });
  const updateStatusMutation = useUpdateIncidentStatus();

  if (isLoading) return <BoardSkeleton />;

  // Group incidents by status
  const columnsData = COLUMNS.reduce((acc, status) => {
    acc[status] = data?.items.filter(i => i.status === status) || [];
    return acc;
  }, {} as Record<string, any[]>);

  const onDragEnd = (result: DropResult) => {
    const { destination, source, draggableId } = result;

    // Dropped outside a column or didn't move
    if (!destination) return;
    if (destination.droppableId === source.droppableId) return;

    // Trigger optimistic mutation
    // The backend API enforces the valid state machine transitions.
    // If a user drags OPEN -> RESOLVED (invalid), the backend returns 400,
    // and React Query's `onError` rolls back the UI.
    updateStatusMutation.mutate({
      id: Number(draggableId),
      status: destination.droppableId
    });
  };

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="flex h-full gap-4 overflow-x-auto pb-4">
        {COLUMNS.map(columnId => (
          <div key={columnId} className="flex flex-col flex-shrink-0 w-80 bg-muted/30 rounded-xl">
            <div className="p-4 flex justify-between items-center border-b">
              <h3 className="font-semibold">{columnId.replace('_', ' ')}</h3>
              <span className="bg-muted text-xs px-2 py-1 rounded-full">
                {columnsData[columnId].length}
              </span>
            </div>
            
            <Droppable droppableId={columnId}>
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={`flex-1 p-2 space-y-2 min-h-[500px] transition-colors ${
                    snapshot.isDraggingOver ? 'bg-primary/5' : ''
                  }`}
                >
                  {columnsData[columnId].map((incident, index) => (
                    <Draggable key={incident.id} draggableId={String(incident.id)} index={index}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          className={snapshot.isDragging ? 'opacity-80 shadow-xl' : ''}
                        >
                          <IncidentCard incident={incident} />
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </div>
        ))}
      </div>
    </DragDropContext>
  );
};
```

---

## Incident Details & Comment Thread

When a user clicks on an incident card, they are taken to the `IncidentDetailsPage`. The right-hand column of this page is a real-time comment thread.

### Comment Polling
While V1.1 will introduce WebSockets, V0 relies on React Query's built-in polling (`refetchInterval`) to create a "live" feel for the comment thread.

```typescript
// src/features/incidents/api/useComments.ts
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

export const useIncidentComments = (incidentId: number) => {
  return useQuery({
    queryKey: ['incident-comments', incidentId],
    queryFn: async () => {
      const { data } = await api.get(`/v1/incidents/${incidentId}/comments`);
      return data;
    },
    // Poll every 10 seconds while the window is focused
    refetchInterval: 10000, 
    refetchIntervalInBackground: false,
  });
};
```

### Thread UI
The thread UI maps over the comments and renders them like a chat interface. It uses a `useRef` to automatically scroll to the bottom when a new comment is added.

```tsx
// src/features/incidents/components/CommentThread.tsx
import { useEffect, useRef } from 'react';
import { useIncidentComments } from '../api/useComments';
import { CommentInput } from './CommentInput';

export const CommentThread = ({ incidentId }) => {
  const { data: comments = [], isLoading } = useIncidentComments(incidentId);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new comments
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [comments.length]);

  if (isLoading) return <LoadingThread />;

  return (
    <div className="flex flex-col h-[600px] border rounded-lg bg-card">
      <div className="p-4 border-b font-medium">Activity & Comments</div>
      
      <div className="flex-1 p-4 overflow-y-auto space-y-4">
        {comments.map((c) => (
          <div key={c.id} className="flex gap-3">
            <Avatar src={c.user.avatarUrl} initials={c.user.name[0]} />
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">{c.user.name}</span>
                <span className="text-xs text-muted-foreground">
                  {new Date(c.createdAt).toLocaleTimeString()}
                </span>
              </div>
              <div className="mt-1 p-3 bg-muted rounded-lg text-sm">
                {c.content}
              </div>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="p-4 border-t">
        <CommentInput incidentId={incidentId} />
      </div>
    </div>
  );
};
```

---

## Related Documents

- **API Contracts:** [Incident Endpoints](../04-api/06-incident-endpoints.md)
- **Backend Service:** [Incident Service](../03-backend/09-incident-service.md)
- **Index:** [IEKB Master Index](../00-foundation/00-IEKB-index.md)
