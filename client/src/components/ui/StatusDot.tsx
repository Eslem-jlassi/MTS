// =============================================================================
// MTS TELECOM - Design system: StatusDot (tiny colored circle for UP/DOWN/etc.)
// =============================================================================

import React from "react";

export type DotColor = "green" | "red" | "yellow" | "blue" | "gray";

interface StatusDotProps {
  color: DotColor;
  pulse?: boolean;
  className?: string;
}

const dotColors: Record<DotColor, string> = {
  green: "bg-success-500",
  red: "bg-error-500",
  yellow: "bg-warning-500",
  blue: "bg-primary-500",
  gray: "bg-ds-muted",
};

const StatusDot: React.FC<StatusDotProps> = ({ color, pulse, className = "" }) => (
  <span className={`relative inline-flex h-2.5 w-2.5 ${className}`}>
    {pulse && (
      <span
        className={`absolute inline-flex h-full w-full rounded-full opacity-40 animate-ping ${dotColors[color]}`}
      />
    )}
    <span
      className={`relative inline-flex h-2.5 w-2.5 rounded-full ring-2 ring-white/70 shadow-[0_0_0_1px_rgb(15_23_42_/_0.04)] dark:ring-slate-900/70 ${dotColors[color]}`}
    />
  </span>
);

export default StatusDot;
