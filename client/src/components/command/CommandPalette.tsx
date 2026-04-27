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

const CommandPalette: React.FC<CommandPaletteProps> = ({ open, onClose, userRole }) => {
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const allItems = useMemo<PaletteItem[]>(() => {
    const go = (path: string) => () => {
      navigate(path);
      onClose();
    };

    return [
      {
        id: "nav-dashboard",
        label: "Tableau de bord",
        description: "Voir les KPI et statistiques",
        icon: <LayoutDashboard size={18} />,
        action: go("/dashboard"),
        section: "Navigation",
        keywords: ["dashboard", "kpi", "accueil"],
      },
      {
        id: "nav-tickets",
        label: "Tickets",
        description: "Liste des tickets de support",
        icon: <Ticket size={18} />,
        action: go("/tickets"),
        section: "Navigation",
        keywords: ["ticket", "support", "demande"],
      },
      {
        id: "nav-kanban",
        label: "Vue Kanban",
        description: "Tickets en vue tableau",
        icon: <LayoutGrid size={18} />,
        action: go("/tickets/kanban"),
        section: "Navigation",
        keywords: ["kanban", "board", "tableau"],
        roles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.AGENT],
      },
      {
        id: "nav-incidents",
        label: "Incidents",
        description: "Gestion des incidents",
        icon: <AlertTriangle size={18} />,
        action: go("/incidents"),
        section: "Navigation",
        keywords: ["incident", "panne", "alerte"],
        roles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.AGENT],
      },
      {
        id: "nav-sla",
        label: "SLA & Escalade",
        description: "Suivi des SLA et escalades",
        icon: <Clock size={18} />,
        action: go("/sla"),
        section: "Navigation",
        keywords: ["sla", "escalade", "contrat"],
        roles: [UserRole.ADMIN, UserRole.MANAGER],
      },
      {
        id: "nav-health",
        label: "Health Monitoring",
        description: "Etat de sante des services",
        icon: <Activity size={18} />,
        action: go("/health"),
        section: "Navigation",
        keywords: ["monitoring", "sante", "uptime"],
        roles: [UserRole.ADMIN, UserRole.MANAGER],
      },
      {
        id: "nav-clients",
        label: "Clients",
        description: "Gestion des clients",
        icon: <Building2 size={18} />,
        action: go("/clients"),
        section: "Navigation",
        keywords: ["client", "entreprise", "compte"],
        roles: [UserRole.ADMIN, UserRole.MANAGER],
      },
      {
        id: "nav-services",
        label: "Services",
        description: "Services telecom",
        icon: <Server size={18} />,
        action: go("/services"),
        section: "Navigation",
        keywords: ["service", "infra", "reseau"],
        roles: [UserRole.ADMIN, UserRole.MANAGER],
      },
      {
        id: "nav-reports",
        label: "Rapports",
        description: "Rapports et exports",
        icon: <FileText size={18} />,
        action: go("/reports"),
        section: "Navigation",
        keywords: ["rapport", "export", "pdf", "csv"],
        roles: [UserRole.ADMIN, UserRole.MANAGER],
      },
      {
        id: "nav-audit",
        label: "Journal d'audit",
        description: "Historique des actions",
        icon: <ScrollText size={18} />,
        action: go("/audit"),
        section: "Navigation",
        keywords: ["audit", "log", "historique"],
        roles: [UserRole.ADMIN],
      },
      {
        id: "nav-users",
        label: "Utilisateurs",
        description: "Gestion des utilisateurs",
        icon: <Users size={18} />,
        action: go("/users"),
        section: "Navigation",
        keywords: ["utilisateur", "user", "compte"],
        roles: [UserRole.ADMIN],
      },
      {
        id: "nav-settings",
        label: "Parametres",
        description: "Configuration du compte",
        icon: <Settings size={18} />,
        action: go("/settings"),
        section: "Navigation",
        keywords: ["parametre", "configuration", "preference"],
      },
      {
        id: "act-new-ticket",
        label: "Creer un ticket",
        description: "Ouvrir un nouveau ticket de support",
        icon: <Plus size={18} />,
        action: go("/tickets?action=new"),
        section: "Actions rapides",
        keywords: ["nouveau", "creer", "ouvrir", "ticket"],
        roles: [UserRole.CLIENT],
      },
      {
        id: "act-new-incident",
        label: "Declarer un incident",
        description: "Creer un incident critique",
        icon: <AlertTriangle size={18} />,
        action: go("/incidents/new"),
        section: "Actions rapides",
        keywords: ["incident", "declarer", "panne"],
        roles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.AGENT],
      },
    ];
  }, [navigate, onClose]);

  const filtered = useMemo(() => {
    const rbacFiltered = allItems.filter((item) => {
      if (!item.roles) return true;
      return userRole && item.roles.includes(userRole);
    });

    if (!query.trim()) return rbacFiltered;

    const q = query.toLowerCase().trim();
    return rbacFiltered.filter((item) => {
      const haystack = [item.label, item.description ?? "", ...(item.keywords ?? [])]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [allItems, query, userRole]);

  const grouped = useMemo(() => {
    const map = new Map<string, PaletteItem[]>();
    for (const item of filtered) {
      const list = map.get(item.section) ?? [];
      list.push(item);
      map.set(item.section, list);
    }
    return map;
  }, [filtered]);

  const runItem = useCallback(
    (idx: number) => {
      filtered[idx]?.action();
    },
    [filtered],
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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!open) return;
      if (e.key === "Escape") return onClose();
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((v) => Math.min(v + 1, Math.max(filtered.length - 1, 0)));
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((v) => Math.max(v - 1, 0));
      }
      if (e.key === "Enter") {
        e.preventDefault();
        runItem(activeIndex);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeIndex, filtered.length, onClose, open, runItem]);

  useEffect(() => {
    if (!listRef.current) return;
    const active = listRef.current.querySelector<HTMLElement>(`[data-index="${activeIndex}"]`);
    active?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] bg-black/35 p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, y: 16, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12, scale: 0.98 }}
          transition={{ duration: 0.18 }}
          className="mx-auto mt-[10vh] max-w-2xl overflow-hidden rounded-2xl border border-ds-border bg-ds-card shadow-md"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center gap-3 border-b border-ds-border px-4 py-3">
            <Search className="h-5 w-5 text-ds-muted" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher une page ou une action..."
              className="w-full bg-transparent text-sm text-ds-primary outline-none placeholder:text-ds-muted"
            />
          </div>

          <div ref={listRef} className="max-h-[60vh] overflow-y-auto p-2">
            {filtered.length === 0 ? (
              <div className="px-4 py-10 text-center text-sm text-ds-muted">Aucun resultat.</div>
            ) : (
              Array.from(grouped.entries()).map(([section, items]) => (
                <div key={section} className="mb-3">
                  <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-ds-muted">
                    {section}
                  </div>
                  <div className="space-y-1">
                    {items.map((item) => {
                      const index = filtered.findIndex((entry) => entry.id === item.id);
                      const active = index === activeIndex;
                      return (
                        <button
                          key={item.id}
                          data-index={index}
                          onMouseEnter={() => setActiveIndex(index)}
                          onClick={item.action}
                          className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition ${
                            active
                              ? "bg-primary-50 text-primary-700 dark:bg-primary-500/15 dark:text-primary-300"
                              : "text-ds-primary hover:bg-ds-elevated"
                          }`}
                        >
                          <div className="shrink-0">{item.icon}</div>
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-medium">{item.label}</div>
                            {item.description && (
                              <div className="truncate text-xs text-ds-muted">
                                {item.description}
                              </div>
                            )}
                          </div>
                          <ArrowRight className="h-4 w-4 shrink-0 text-ds-muted" />
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default CommandPalette;
