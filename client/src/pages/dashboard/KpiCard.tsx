// =============================================================================
// MTS TELECOM - KPI Card (dashboard)
// =============================================================================

import React from "react";
import Card from "../../components/ui/Card";

interface KpiCardProps {
  title: string;
  value: string | number;
  icon?: React.ReactNode;
  color?: string;
  trend?: { value: number; label?: string };
  className?: string;
}

const KpiCard: React.FC<KpiCardProps> = ({
  title,
  value,
  icon,
  color = "text-primary-600 bg-primary-50 dark:text-primary-400 dark:bg-primary-900/30",
  trend,
  className = "",
}) => {
  return (
    <Card className={`ds-panel-hover flex items-start gap-4 ${className}`}>
      {icon && (
        <div
          className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl border border-slate-200 shadow-sm ${color}`}
        >
          {icon}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="ds-kicker truncate">{title}</p>
        <p className="mt-2 text-2xl font-semibold text-ds-primary tracking-tight tabular-nums">
          {value}
        </p>
        {trend && (
          <span
            className={`mt-1 text-xs font-medium ${
              trend.value >= 0
                ? "inline-flex items-center rounded-full bg-success-50 px-2.5 py-1 text-success-700 dark:bg-success-500/15 dark:text-success-300"
                : "inline-flex items-center rounded-full bg-error-50 px-2.5 py-1 text-error-700 dark:bg-error-500/15 dark:text-error-300"
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

export default KpiCard;
