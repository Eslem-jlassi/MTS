// =============================================================================
// MTS TELECOM - Command Palette (Ctrl+K)
// Quick search & actions — enterprise navigation pattern
// =============================================================================

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  LayoutDashboard,
  Ticket,
  Users,
  Building2,
  Server,
  Settings,
  FileText,
  Clock,
  ScrollText,
  LayoutGrid,
  Activity,
  AlertTriangle,
  Plus,
  ArrowRight,
} from "lucide-react";
import { UserRole } from "../../types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export interface PaletteItem {
  id: string;
  label: string;
  description?: string;
  icon: React.ReactNode;
  action: () => void;
  section: string;
  keywords?: string[];
  roles?: UserRole[];
}

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  userRole?: UserRole;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
const CommandPalette: React.FC<CommandPaletteProps> = ({ open, onClose, userRole }) => {
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // ---- Items catalogue ----
  const allItems = useMemo<PaletteItem[]>(() => {
    const go = (path: string) => () => {
      navigate(path);
      onClose();
    };

    return [
      // Navigation
      { id: "nav-dashboard", label: "Tableau de bord", description: "Voir les KPI et statistiques", icon: <LayoutDashboard size={18} />, action: go("/dashboard"), section: "Navigation", keywords: ["dashboard", "kpi", "accueil"] },
      { id: "nav-tickets", label: "Tickets", description: "Liste des tickets de support", icon: <Ticket size={18} />, action: go("/tickets"), section: "Navigation", keywords: ["ticket", "support", "demande"] },
      { id: "nav-kanban", label: "Vue Kanban", description: "Tickets en vue tableau", icon: <LayoutGrid size={18} />, action: go("/tickets/kanban"), section: "Navigation", keywords: ["kanban", "board", "tableau"], roles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.AGENT] },
      { id: "nav-incidents", label: "Incidents", description: "Gestion des incidents", icon: <AlertTriangle size={18} />, action: go("/incidents"), section: "Navigation", keywords: ["incident", "panne", "alerte"], roles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.AGENT] },
      { id: "nav-sla", label: "SLA & Escalade", description: "Suivi des SLA et escalades", icon: <Clock size={18} />, action: go("/sla"), section: "Navigation", keywords: ["sla", "escalade", "contrat"], roles: [UserRole.ADMIN, UserRole.MANAGER] },
      { id: "nav-health", label: "Health Monitoring", description: "État de santé des services", icon: <Activity size={18} />, action: go("/health"), section: "Navigation", keywords: ["monitoring", "santé", "uptime"], roles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.AGENT] },
      { id: "nav-clients", label: "Clients", description: "Gestion des clients", icon: <Building2 size={18} />, action: go("/clients"), section: "Navigation", keywords: ["client", "entreprise", "compte"], roles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.AGENT] },
      { id: "nav-services", label: "Services", description: "Services télécom", icon: <Server size={18} />, action: go("/services"), section: "Navigation", keywords: ["service", "infra", "réseau"], roles: [UserRole.ADMIN, UserRole.MANAGER] },
      { id: "nav-reports", label: "Rapports", description: "Rapports et exports", icon: <FileText size={18} />, action: go("/reports"), section: "Navigation", keywords: ["rapport", "export", "pdf", "csv"], roles: [UserRole.ADMIN, UserRole.MANAGER] },
      { id: "nav-audit", label: "Journal d'audit", description: "Historique des actions", icon: <ScrollText size={18} />, action: go("/audit"), section: "Navigation", keywords: ["audit", "log", "historique"], roles: [UserRole.ADMIN] },
      { id: "nav-users", label: "Utilisateurs", description: "Gestion des utilisateurs", icon: <Users size={18} />, action: go("/users"), section: "Navigation", keywords: ["utilisateur", "user", "compte"], roles: [UserRole.ADMIN] },
      { id: "nav-settings", label: "Paramètres", description: "Configuration du compte", icon: <Settings size={18} />, action: go("/settings"), section: "Navigation", keywords: ["paramètre", "configuration", "préférence"] },
      // Quick actions
      { id: "act-new-ticket", label: "Créer un ticket", description: "Ouvrir un nouveau ticket de support", icon: <Plus size={18} />, action: go("/tickets?action=new"), section: "Actions rapides", keywords: ["nouveau", "créer", "ouvrir", "ticket"] },
      { id: "act-new-incident", label: "Déclarer un incident", description: "Créer un incident critique", icon: <AlertTriangle size={18} />, action: go("/incidents/new"), section: "Actions rapides", keywords: ["incident", "déclarer", "panne"], roles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.AGENT] },
    ];
  }, [navigate, onClose]);

  // ---- RBAC filter + search ----
  const filtered = useMemo(() => {
    const rbacFiltered = allItems.filter((item) => {
      if (!item.roles) return true;
      return userRole && item.roles.includes(userRole);
    });

    if (!query.trim()) return rbacFiltered;

    const q = query.toLowerCase().trim();
    return rbacFiltered.filter((item) => {
      const haystack = [item.label, item.description ?? "", ...(item.keywords ?? [])].join(" ").toLowerCase();
      return haystack.includes(q);
    });
  }, [allItems, query, userRole]);

  // ---- Group by section ----
  const grouped = useMemo(() => {
    const map = new Map<string, PaletteItem[]>();
    for (const item of filtered) {
      const list = map.get(item.section) ?? [];
      list.push(item);
      map.set(item.section, list);
    }
    return map;
  }, [filtered]);

  const flatFiltered = useMemo(() => filtered, [filtered]);

  // ---- Keyboard navigation ----
  const runItem = useCallback(
    (idx: number) => {
      flatFiltered[idx]?.action();
    },
    [flatFiltered],
  );

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  useEffect(() => {
    if (open) {
      setQuery("");
      setActiveIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // ---- Global Ctrl+K listener ----
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (open) {
        if (e.key === "Escape") {
          e.preventDefault();
          onClose();
        } else if (e.key === "ArrowDown") {
          e.preventDefault();
          setActiveIndex((i) => Math.min(i + 1, flatFiltered.length - 1));
        } else if (e.key === "ArrowUp") {
          e.preventDefault();
          setActiveIndex((i) => Math.max(i - 1, 0));
        } else if (e.key === "Enter") {
          e.preventDefault();
          runItem(activeIndex);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose, flatFiltered.length, activeIndex, runItem]);

  // ---- Scroll active item into view ----
  useEffect(() => {
    if (!listRef.current) return;
    const el = listRef.current.querySelector(`[data-index="${activeIndex}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm"
            onClick={onClose}
          />
          {/* Dialog */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -10 }}
            transition={{ type: "spring", stiffness: 500, damping: 35 }}
            className="fixed inset-x-4 top-[15%] z-[101] mx-auto max-w-lg bg-ds-card border border-ds-border rounded-2xl shadow-dropdown overflow-hidden"
          >
            {/* Search input */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-ds-border">
              <Search size={18} className="text-ds-muted flex-shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Rechercher une page ou une action…"
                className="flex-1 bg-transparent text-sm text-ds-primary placeholder:text-ds-muted outline-none"
                autoComplete="off"
              />
              <kbd className="hidden sm:inline-flex items-center gap-0.5 px-2 py-0.5 text-[10px] font-medium text-ds-muted bg-ds-elevated border border-ds-border rounded-md">
                Échap
              </kbd>
            </div>

            {/* Results */}
            <div ref={listRef} className="max-h-[360px] overflow-y-auto py-2">
              {flatFiltered.length === 0 ? (
                <div className="px-4 py-8 text-center">
                  <p className="text-sm text-ds-muted">Aucun résultat pour « {query} »</p>
                </div>
              ) : (
                Array.from(grouped.entries()).map(([section, items]) => (
                  <div key={section}>
                    <p className="px-4 pt-3 pb-1.5 text-xs font-semibold text-ds-muted uppercase tracking-wider">
                      {section}
                    </p>
                    {items.map((item) => {
                      const globalIdx = flatFiltered.indexOf(item);
                      const active = globalIdx === activeIndex;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          data-index={globalIdx}
                          onMouseEnter={() => setActiveIndex(globalIdx)}
                          onClick={() => item.action()}
                          className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors duration-100 ${
                            active
                              ? "bg-primary-50 dark:bg-primary-500/10 text-primary-700 dark:text-primary-300"
                              : "text-ds-secondary hover:bg-ds-elevated"
                          }`}
                        >
                          <span className={`flex-shrink-0 ${active ? "text-primary-600 dark:text-primary-400" : "text-ds-muted"}`}>
                            {item.icon}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{item.label}</p>
                            {item.description && (
                              <p className="text-xs text-ds-muted truncate">{item.description}</p>
                            )}
                          </div>
                          {active && <ArrowRight size={14} className="flex-shrink-0 text-primary-400" />}
                        </button>
                      );
                    })}
                  </div>
                ))
              )}
            </div>

            {/* Footer hint */}
            <div className="px-4 py-2.5 border-t border-ds-border flex items-center gap-4 text-[11px] text-ds-muted">
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-ds-elevated border border-ds-border rounded text-[10px]">↑↓</kbd>
                naviguer
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-ds-elevated border border-ds-border rounded text-[10px]">↵</kbd>
                ouvrir
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-ds-elevated border border-ds-border rounded text-[10px]">Échap</kbd>
                fermer
              </span>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default CommandPalette;
