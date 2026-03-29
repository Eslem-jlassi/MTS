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
    <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${dotColors[color]}`} />
  </span>
);

export default StatusDot;
