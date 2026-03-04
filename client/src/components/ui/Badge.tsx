// =============================================================================
// MTS TELECOM - Design system: Badge (Premium SaaS)
// =============================================================================

import React from "react";

export type BadgeVariant =
  | "default"
  | "neutral"
  | "success"
  | "warning"
  | "danger"
  | "info";

interface BadgeProps {
  variant?: BadgeVariant;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

const variantClasses: Record<BadgeVariant, string> = {
  default:
    "bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300",
  neutral:
    "bg-ds-elevated text-ds-secondary",
  success:
    "bg-success-50 text-success-700 dark:bg-success-500/15 dark:text-success-200",
  warning:
    "bg-warning-50 text-warning-700 dark:bg-warning-500/15 dark:text-warning-200",
  danger:
    "bg-error-50 text-error-700 dark:bg-error-500/15 dark:text-error-200",
  info:
    "bg-info-50 text-info-700 dark:bg-info-500/15 dark:text-info-200",
};

const Badge: React.FC<BadgeProps> = ({
  variant = "default",
  icon,
  children,
  className = "",
}) => {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium tracking-wide ${variantClasses[variant]} ${className}`}
    >
      {icon && <span className="flex-shrink-0">{icon}</span>}
      {children}
    </span>
  );
};

export default Badge;
