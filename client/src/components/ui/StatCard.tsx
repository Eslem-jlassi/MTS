// =============================================================================
// MTS TELECOM - Design system: StatCard
// =============================================================================

import React from "react";
import Card from "./Card";

interface StatCardProps {
  title: string;
  value: string | number;
  icon?: React.ReactNode;
  trend?: { value: number; label?: string };
  className?: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, trend, className = "" }) => {
  return (
    <Card className={`ds-panel-hover flex items-start gap-4 ${className}`}>
      {icon && (
        <div className="ds-icon-shell flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl text-primary-600 dark:text-primary-300">
          {icon}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="ds-kicker truncate">{title}</p>
        <p className="mt-2 text-2xl font-semibold text-ds-primary tabular-nums tracking-tight">
          {value}
        </p>
        {trend && (
          <span
            className={`mt-1 text-xs font-medium ${
              trend.value >= 0
                ? "inline-flex items-center rounded-full bg-success-50 px-2.5 py-1 text-success-700 dark:bg-success-500/15 dark:text-success-200"
                : "inline-flex items-center rounded-full bg-error-50 px-2.5 py-1 text-error-700 dark:bg-error-500/15 dark:text-error-200"
            }`}
          >
            {trend.value >= 0 ? "+" : ""}
            {trend.value}%{trend.label ? ` ${trend.label}` : ""}
          </span>
        )}
      </div>
    </Card>
  );
};

export default StatCard;
