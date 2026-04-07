// =============================================================================
// MTS TELECOM - Design system: Badge (Premium SaaS)
// =============================================================================

import React from "react";

export type BadgeVariant = "default" | "neutral" | "success" | "warning" | "danger" | "info";

interface BadgeProps {
  variant?: BadgeVariant;
  size?: "sm" | "md";
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

const variantClasses: Record<BadgeVariant, string> = {
  default:
    "border border-primary-200/80 bg-primary-50/90 text-primary-700 dark:border-primary-500/20 dark:bg-primary-500/12 dark:text-primary-200",
  neutral:
    "border border-ds-border bg-ds-elevated/80 text-ds-secondary dark:bg-ds-elevated/60 dark:text-ds-secondary",
  success:
    "border border-success-200/80 bg-success-50/90 text-success-700 dark:border-success-500/20 dark:bg-success-500/12 dark:text-success-200",
  warning:
    "border border-warning-200/80 bg-warning-50/90 text-warning-700 dark:border-warning-500/20 dark:bg-warning-500/12 dark:text-warning-200",
  danger:
    "border border-error-200/80 bg-error-50/90 text-error-700 dark:border-error-500/20 dark:bg-error-500/12 dark:text-error-200",
  info:
    "border border-info-200/80 bg-info-50/90 text-info-700 dark:border-info-500/20 dark:bg-info-500/12 dark:text-info-200",
};

const sizeClasses = {
  sm: "px-2 py-0.5 text-[11px]",
  md: "px-2.5 py-1 text-xs",
};

const Badge: React.FC<BadgeProps> = ({
  variant = "default",
  size = "md",
  icon,
  children,
  className = "",
}) => {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-semibold tracking-[0.01em] ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
    >
      {icon && <span className="flex-shrink-0 opacity-80">{icon}</span>}
      <span className="truncate">{children}</span>
    </span>
  );
};

export default Badge;
