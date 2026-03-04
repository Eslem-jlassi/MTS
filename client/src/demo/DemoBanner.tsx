// =============================================================================
// MTS TELECOM - Demo Mode Banner (Visual Indicator)
// =============================================================================
// Billcom Consulting - PFE 2026
// =============================================================================
//
// OBJECTIF:
// Afficher un bandeau visuel discret mais clair quand le mode démo est actif.
// Permet au jury de savoir que les données sont fictives.
//
// COMPORTEMENT:
// - Affiché en haut de page (fixe)
// - Peut être masqué (dismiss) pour ne pas gêner la présentation
// - Réapparaît après refresh
// - Style : fond ambre/orange avec animation subtile
//
// =============================================================================

import React, { useState } from "react";
import { DEMO_MODE_ACTIVE } from "./demoConfig";

/**
 * Bandeau d'indication du mode démo.
 *
 * Rendu uniquement quand DEMO_MODE_ACTIVE === true.
 * Click sur × pour masquer (session uniquement, revient au refresh).
 */
const DemoBanner: React.FC = () => {
  const [dismissed, setDismissed] = useState(false);

  // Ne rien afficher si pas en mode démo ou si masqué
  if (!DEMO_MODE_ACTIVE || dismissed) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="demo-banner"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 99999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "12px",
        padding: "6px 16px",
        background: "linear-gradient(90deg, #f59e0b, #d97706, #f59e0b)",
        backgroundSize: "200% 100%",
        animation: "demo-banner-shimmer 3s linear infinite",
        color: "#1c1917",
        fontFamily: "'Inter', 'Segoe UI', sans-serif",
        fontSize: "13px",
        fontWeight: 600,
        letterSpacing: "0.5px",
        textTransform: "uppercase",
        boxShadow: "0 2px 8px rgba(217, 119, 6, 0.3)",
        userSelect: "none",
      }}
    >
      {/* Icône démo */}
      <span style={{ fontSize: "16px" }} aria-hidden="true">
        🎭
      </span>

      {/* Texte principal */}
      <span>
        Mode Démo — Soutenance PFE 2026 — Données fictives
      </span>

      {/* Badge */}
      <span
        style={{
          background: "rgba(0,0,0,0.15)",
          padding: "2px 8px",
          borderRadius: "9999px",
          fontSize: "11px",
          fontWeight: 700,
        }}
      >
        DEMO
      </span>

      {/* Bouton fermer */}
      <button
        onClick={() => setDismissed(true)}
        aria-label="Masquer le bandeau démo"
        title="Masquer"
        style={{
          position: "absolute",
          right: "12px",
          background: "none",
          border: "none",
          color: "#1c1917",
          cursor: "pointer",
          fontSize: "18px",
          lineHeight: 1,
          padding: "4px",
          opacity: 0.7,
        }}
        onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
        onMouseLeave={(e) => (e.currentTarget.style.opacity = "0.7")}
      >
        ×
      </button>

      {/* Animation CSS injectée inline */}
      <style>{`
        @keyframes demo-banner-shimmer {
          0% { background-position: 0% 50%; }
          100% { background-position: 200% 50%; }
        }
        /* Décale le contenu de l'app pour ne pas masquer le header */
        .demo-banner ~ *, body.demo-mode #root > div:first-child {
          /* handled by spacing in App.tsx */
        }
      `}</style>
    </div>
  );
};

export default DemoBanner;
