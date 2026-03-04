/**
 * Breadcrumb - Fil d'Ariane dérivé de la route
 * Phase 7 – UI/UX pro
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
  "/settings": "Paramètres",
  "/profile": "Profil",
};

const Breadcrumb: React.FC = () => {
  const location = useLocation();
  const params = useParams();
  const pathnames = location.pathname.split("/").filter(Boolean);

  const segments: { path: string; label: string }[] = [];
  let acc = "";
  for (let i = 0; i < pathnames.length; i++) {
    acc = (i === 0 ? "/" : acc + "/") + pathnames[i];
    let label = ROUTE_LABELS[acc] || pathnames[i];
    if (i === pathnames.length - 1 && params.id && pathnames[0] === "tickets") {
      label = `Ticket #${params.id}`;
    }
    if (i === pathnames.length - 1 && params.id && pathnames[0] === "incidents") {
      label = `Incident #${params.id}`;
    }
    segments.push({ path: acc, label });
  }

  return (
    <nav aria-label="Fil d'Ariane" className="flex items-center gap-1 text-sm text-ds-secondary">
      <Link
        to="/dashboard"
        className="flex items-center gap-1 text-ds-secondary hover:text-ds-primary transition-colors"
      >
        <Home size={16} aria-hidden />
        <span className="hidden sm:inline">Accueil</span>
      </Link>
      {segments.length === 0 ? (
        <>
          <ChevronRight size={14} className="text-ds-muted flex-shrink-0" aria-hidden />
          <span className="font-medium text-ds-primary" aria-current="page">Accueil</span>
        </>
      ) : (
        segments.map((seg, i) => (
          <React.Fragment key={seg.path}>
            <ChevronRight size={14} className="text-ds-muted flex-shrink-0" aria-hidden />
            {i === segments.length - 1 ? (
              <span className="font-medium text-ds-primary truncate max-w-[180px] sm:max-w-none" aria-current="page">
                {seg.label}
              </span>
            ) : (
              <Link
                to={seg.path}
                className="truncate max-w-[120px] sm:max-w-none text-ds-secondary hover:text-ds-primary transition-colors"
              >
                {seg.label}
              </Link>
            )}
          </React.Fragment>
        ))
      )}
    </nav>
  );
};

export default Breadcrumb;
