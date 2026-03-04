// =============================================================================
// MTS TELECOM - QuickReplies — Dropdown de réponses rapides (macros)
// =============================================================================
/**
 * Composant dropdown avec recherche pour insérer des templates de réponse rapide.
 * 
 * CARACTÉRISTIQUES:
 * - Dropdown avec recherche fuzzy par nom / catégorie
 * - Groupement par catégorie
 * - Preview du contenu au hover/focus
 * - Variables substituées automatiquement ({client}, {ticketId}, etc.)
 * - Accessible au clavier (Arrow keys + Enter)
 * 
 * USAGE:
 * <QuickReplies
 *   context={{ client: "Acme", ticketId: "TK-001", service: "MPLS" }}
 *   onSelect={(content) => setCommentText(content)}
 * />
 */

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Zap, Search, ChevronRight, Tag } from "lucide-react";
import { QuickReplyTemplate, QuickReplyCategory } from "../../types";
import {
  quickReplyService,
  substituteVariables,
  QuickReplyCategoryLabels,
} from "../../api/macroService";

// =============================================================================
// TYPES
// =============================================================================

interface QuickRepliesProps {
  /** Variables de contexte pour la substitution */
  context: Record<string, string>;
  /** Callback quand un template est sélectionné (contenu substitué) */
  onSelect: (content: string) => void;
  /** Rôle de l'utilisateur pour filtrer les templates */
  userRole?: string;
  /** Classe CSS additionnelle */
  className?: string;
}

// Couleurs par catégorie
const CATEGORY_COLORS: Record<QuickReplyCategory, string> = {
  accuse: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  info: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  resolution: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  cloture: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
  escalade: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
  custom: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300",
};

// =============================================================================
// COMPOSANT
// =============================================================================

const QuickReplies: React.FC<QuickRepliesProps> = ({
  context,
  onSelect,
  userRole,
  className = "",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [templates, setTemplates] = useState<QuickReplyTemplate[]>([]);
  const [search, setSearch] = useState("");
  const [previewId, setPreviewId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // Charge les templates au premier ouverture
  useEffect(() => {
    if (isOpen && templates.length === 0) {
      setLoading(true);
      quickReplyService
        .list(userRole)
        .then(setTemplates)
        .finally(() => setLoading(false));
    }
  }, [isOpen, userRole, templates.length]);

  // Focus le champ de recherche à l'ouverture
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => searchRef.current?.focus(), 100);
    } else {
      setSearch("");
      setPreviewId(null);
    }
  }, [isOpen]);

  // Ferme le dropdown quand on clique dehors
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  // Filtrage des templates par recherche
  const filtered = templates.filter((t) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      t.name.toLowerCase().includes(q) ||
      t.category.toLowerCase().includes(q) ||
      (QuickReplyCategoryLabels[t.category] || "").toLowerCase().includes(q)
    );
  });

  // Groupement par catégorie
  const grouped = filtered.reduce<Record<string, QuickReplyTemplate[]>>((acc, t) => {
    const cat = t.category;
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(t);
    return acc;
  }, {});

  const handleSelect = useCallback(
    (template: QuickReplyTemplate) => {
      const substituted = substituteVariables(template.content, context);
      onSelect(substituted);
      setIsOpen(false);
    },
    [context, onSelect]
  );

  const previewTemplate = previewId
    ? templates.find((t) => t.id === previewId)
    : null;

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Bouton trigger */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`
          inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg
          transition-all duration-200
          ${isOpen
            ? "bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300"
            : "bg-ds-elevated text-ds-secondary hover:bg-ds-border hover:text-ds-primary"
          }
        `}
        title="Réponses rapides"
      >
        <Zap size={14} />
        Réponses rapides
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div
          className="absolute bottom-full left-0 mb-2 w-96 max-h-[420px] bg-ds-card rounded-xl border border-ds-border shadow-dropdown z-50 flex flex-col overflow-hidden"
        >
          {/* Search */}
          <div className="p-3 border-b border-ds-border flex-shrink-0">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ds-muted" />
              <input
                ref={searchRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher un template..."
                className="w-full pl-8 pr-3 py-2 text-sm border border-ds-border rounded-lg bg-ds-surface text-ds-primary placeholder:text-ds-muted focus:ring-2 focus:ring-primary/30 focus:border-primary"
              />
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="p-6 text-center text-ds-muted text-sm">Chargement...</div>
            ) : filtered.length === 0 ? (
              <div className="p-6 text-center text-ds-muted text-sm">
                Aucun template trouvé
              </div>
            ) : (
              <div className="py-1">
                {Object.entries(grouped).map(([category, items]) => (
                  <div key={category}>
                    {/* Section header */}
                    <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-ds-muted">
                      <span className="flex items-center gap-1">
                        <Tag size={10} />
                        {QuickReplyCategoryLabels[category as QuickReplyCategory] || category}
                      </span>
                    </div>
                    {items.map((template) => (
                      <button
                        key={template.id}
                        type="button"
                        onClick={() => handleSelect(template)}
                        onMouseEnter={() => setPreviewId(template.id)}
                        onMouseLeave={() => setPreviewId(null)}
                        className="w-full text-left px-3 py-2 hover:bg-ds-elevated flex items-center gap-2 group transition-colors"
                      >
                        <span
                          className={`flex-shrink-0 px-1.5 py-0.5 text-[10px] font-semibold rounded ${
                            CATEGORY_COLORS[template.category as QuickReplyCategory] || CATEGORY_COLORS.custom
                          }`}
                        >
                          {template.category.slice(0, 3).toUpperCase()}
                        </span>
                        <span className="flex-1 text-sm text-ds-primary truncate">
                          {template.name}
                        </span>
                        <ChevronRight
                          size={14}
                          className="text-ds-muted opacity-0 group-hover:opacity-100 transition-opacity"
                        />
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Preview footer */}
          {previewTemplate && (
            <div className="border-t border-ds-border p-3 bg-ds-elevated/50 flex-shrink-0 max-h-32 overflow-y-auto">
              <p className="text-[10px] font-bold uppercase text-ds-muted mb-1">Aperçu</p>
              <p className="text-xs text-ds-secondary whitespace-pre-line leading-relaxed">
                {substituteVariables(previewTemplate.content, context).slice(0, 300)}
                {previewTemplate.content.length > 300 && "..."}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default QuickReplies;
