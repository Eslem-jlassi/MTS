import React, { useState } from "react";
import { DEMO_MODE_ACTIVE, DEMO_MODE_SOURCE } from "./demoConfig";

/**
 * Bandeau d'indication du mode demo.
 *
 * Le message reste volontairement explicite :
 * l'utilisateur sait que le dataset est demonstratif et que seules les routes
 * explicitement simulees sont mockees.
 */
const DemoBanner: React.FC = () => {
  const [dismissed, setDismissed] = useState(false);

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
        letterSpacing: "0.3px",
        boxShadow: "0 2px 8px rgba(217, 119, 6, 0.3)",
        userSelect: "none",
      }}
    >
      <span style={{ fontSize: "16px" }} aria-hidden="true">
        Presentation
      </span>

      <span>
        Mode demonstration explicite active. Dataset telecom de presentation charge et routes
        simulees controlees.
      </span>

      <span
        style={{
          background: "rgba(0,0,0,0.15)",
          padding: "2px 8px",
          borderRadius: "9999px",
          fontSize: "11px",
          fontWeight: 700,
          textTransform: "uppercase",
        }}
      >
        {DEMO_MODE_SOURCE}
      </span>

      <button
        onClick={() => setDismissed(true)}
        aria-label="Masquer le bandeau demo"
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
        x
      </button>

      <style>{`
        @keyframes demo-banner-shimmer {
          0% { background-position: 0% 50%; }
          100% { background-position: 200% 50%; }
        }
      `}</style>
    </div>
  );
};

export default DemoBanner;
