/**
 * Vue Kanban pour agents - Colonnes par statut, cartes tickets
 */
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { LayoutGrid, List, Ticket, AlertTriangle, Loader2 } from "lucide-react";
import { ticketService } from "../api/ticketService";
import { RootState, AppDispatch } from "../redux/store";
import { fetchTickets } from "../redux/slices/ticketsSlice";
import PageHeader from "../components/layout/PageHeader";
import { Card, Button, Badge, EmptyState, ErrorState } from "../components/ui";
import {
  TicketStatus,
  StatusLabels,
  StatusColors,
  PriorityLabels,
  PriorityColors,
  type Ticket as TicketType,
} from "../types";

const KANBAN_COLUMN_ORDER: TicketStatus[] = [
  TicketStatus.NEW,
  TicketStatus.ASSIGNED,
  TicketStatus.IN_PROGRESS,
  TicketStatus.PENDING,
  TicketStatus.PENDING_THIRD_PARTY,
  TicketStatus.ESCALATED,
  TicketStatus.RESOLVED,
  TicketStatus.CLOSED,
];

const COLUMN_COLORS: Record<TicketStatus, string> = {
  [TicketStatus.NEW]: "border-l-primary-500 bg-primary-500/5",
  [TicketStatus.ASSIGNED]: "border-l-accent-500 bg-accent-500/5",
  [TicketStatus.IN_PROGRESS]: "border-l-primary-500 bg-primary-500/5",
  [TicketStatus.PENDING]: "border-l-warning-500 bg-warning-500/5",
  [TicketStatus.PENDING_THIRD_PARTY]: "border-l-warning-600 bg-warning-600/5",
  [TicketStatus.ESCALATED]: "border-l-error-500 bg-error-500/5",
  [TicketStatus.RESOLVED]: "border-l-success-500 bg-success-500/5",
  [TicketStatus.CLOSED]: "border-l-neutral-400 bg-neutral-500/5",
  [TicketStatus.CANCELLED]: "border-l-neutral-400 bg-neutral-500/5",
};

const TicketsKanbanPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { tickets, isLoading, error } = useSelector((state: RootState) => state.tickets);
  const [grouped, setGrouped] = useState<Record<string, TicketType[]>>({});

  useEffect(() => {
    dispatch(
      fetchTickets({
        filters: {},
        page: { page: 0, size: 500, sort: "createdAt", direction: "DESC" },
      })
    );
  }, [dispatch]);

  useEffect(() => {
    const map: Record<string, TicketType[]> = {};
    KANBAN_COLUMN_ORDER.forEach((s) => {
      map[s] = [];
    });
    map[TicketStatus.CANCELLED] = [];
    tickets.forEach((t) => {
      const key = t.status;
      if (!map[key]) map[key] = [];
      map[key].push(t);
    });
    setGrouped(map);
  }, [tickets]);

  if (isLoading && tickets.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  }

  if (error && tickets.length === 0) {
    return (
      <div className="p-6">
        <ErrorState
          message="Impossible de charger les tickets."
          onRetry={() => dispatch(fetchTickets({ filters: {}, page: { page: 0, size: 500, sort: "createdAt", direction: "DESC" } }))}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Vue Kanban"
        description="Tickets par statut – glissez les colonnes pour parcourir."
        actions={
          <Link to="/tickets">
            <Button variant="ghost" size="sm" icon={<List size={18} />}>
              Vue liste
            </Button>
          </Link>
        }
      />

      <div className="overflow-x-auto pb-4">
        <div className="flex gap-4 min-w-max">
          {KANBAN_COLUMN_ORDER.map((status) => {
            const items = grouped[status] ?? [];
            return (
              <div
                key={status}
                className={`flex-shrink-0 w-72 rounded-xl border border-ds-border ${COLUMN_COLORS[status]} border-l-4`}
              >
                <div className="p-3 border-b border-ds-border flex items-center justify-between">
                  <span className="font-semibold text-ds-primary text-sm">
                    {StatusLabels[status]}
                  </span>
                  <Badge variant="default">{items.length}</Badge>
                </div>
                <div className="p-2 space-y-2 max-h-[calc(100vh-280px)] overflow-y-auto">
                  {items.map((t) => (
                    <Link
                      key={t.id}
                      to={`/tickets/${t.id}`}
                      className="block focus:outline-none focus:ring-2 focus:ring-primary/30 rounded-lg"
                    >
                      <Card
                        padding="sm"
                        className="hover:shadow-md transition-shadow cursor-pointer border border-ds-border bg-ds-card"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-xs font-mono text-ds-muted">
                            {t.ticketNumber}
                          </span>
                          {t.priority && (
                            <span
                              className="px-1.5 py-0.5 rounded text-xs font-medium shrink-0"
                              style={{
                                backgroundColor: `${PriorityColors[t.priority]}20`,
                                color: PriorityColors[t.priority],
                              }}
                            >
                              {PriorityLabels[t.priority]}
                            </span>
                          )}
                        </div>
                        <p className="text-sm font-medium text-ds-primary mt-1 line-clamp-2">
                          {t.title}
                        </p>
                        {t.assignedToName && (
                          <p className="text-xs text-ds-muted mt-1 truncate">
                            → {t.assignedToName}
                          </p>
                        )}
                      </Card>
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {(grouped[TicketStatus.CANCELLED]?.length ?? 0) > 0 && (
        <details className="rounded-xl border border-ds-border bg-ds-elevated/50">
          <summary className="p-3 cursor-pointer text-sm text-ds-muted">
            Annulés ({grouped[TicketStatus.CANCELLED].length})
          </summary>
          <div className="p-2 flex flex-wrap gap-2">
            {grouped[TicketStatus.CANCELLED].map((t) => (
              <Link
                key={t.id}
                to={`/tickets/${t.id}`}
                className="text-sm text-ds-secondary hover:text-primary"
              >
                {t.ticketNumber}
              </Link>
            ))}
          </div>
        </details>
      )}
    </div>
  );
};

export default TicketsKanbanPage;
