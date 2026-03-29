/**
 * Breadcrumb - Fil d'Ariane derive de la route
 * Phase 7 - UI/UX pro
 */

import React from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { ChevronRight, Home } from "lucide-react";

const ROUTE_LABELS: Record<string, string> = {
  "/dashboard": "Tableau de bord",
  "/tickets": "Tickets",
  "/tickets/new": "Nouveau ticket",
  "/tickets/kanban": "Vue Kanban",
  "/incidents": "Incidents",
  "/incidents/new": "Nouvel incident",
  "/clients": "Clients",
  "/services": "Services",
  "/reports": "Rapports",
  "/sla": "SLA & Escalade",
  "/audit": "Journal d'audit",
  "/health": "Health Monitoring",
  "/users": "Utilisateurs",
  "/settings": "Parametres",
  "/profile": "Profil",
};

const Breadcrumb: React.FC = () => {
  const location = useLocation();
  const params = useParams();
  const pathnames = location.pathname.split("/").filter(Boolean);

  const segments: { path: string; label: string }[] = [];
  let accumulatedPath = "";

  for (let index = 0; index < pathnames.length; index += 1) {
    accumulatedPath = (index === 0 ? "/" : `${accumulatedPath}/`) + pathnames[index];
    let label = ROUTE_LABELS[accumulatedPath] || pathnames[index];

    if (index === pathnames.length - 1 && params.id && pathnames[0] === "tickets") {
      label = `Ticket #${params.id}`;
    }

    if (index === pathnames.length - 1 && params.id && pathnames[0] === "incidents") {
      label = `Incident #${params.id}`;
    }

    segments.push({ path: accumulatedPath, label });
  }

  return (
    <nav
      aria-label="Fil d'Ariane"
      className="hidden md:flex items-center gap-1 rounded-xl border border-ds-border bg-ds-card/60 px-2.5 py-1.5 text-sm text-ds-secondary shadow-soft"
    >
      <Link
        to="/dashboard"
        className="flex items-center gap-1 rounded-lg px-1.5 py-1 text-ds-secondary hover:bg-ds-elevated hover:text-ds-primary transition-colors"
      >
        <Home size={15} aria-hidden />
        <span className="hidden lg:inline">Accueil</span>
      </Link>

      {segments.length === 0 ? (
        <>
          <ChevronRight size={14} className="text-ds-muted flex-shrink-0" aria-hidden />
          <span className="font-medium text-ds-primary" aria-current="page">
            Accueil
          </span>
        </>
      ) : (
        segments.map((segment, index) => (
          <React.Fragment key={segment.path}>
            <ChevronRight size={14} className="text-ds-muted flex-shrink-0" aria-hidden />
            {index === segments.length - 1 ? (
              <span
                className="font-medium text-ds-primary truncate max-w-[180px] sm:max-w-none"
                aria-current="page"
              >
                {segment.label}
              </span>
            ) : (
              <Link
                to={segment.path}
                className="truncate max-w-[120px] sm:max-w-none rounded-lg px-1.5 py-1 text-ds-secondary hover:bg-ds-elevated hover:text-ds-primary transition-colors"
              >
                {segment.label}
              </Link>
            )}
          </React.Fragment>
        ))
      )}
    </nav>
  );
};

export default Breadcrumb;
