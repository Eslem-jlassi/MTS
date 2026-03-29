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
    <Card className={`flex items-start gap-4 ${className}`}>
      {icon && <div className={`flex-shrink-0 p-2.5 rounded-lg ${color}`}>{icon}</div>}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-ds-secondary truncate">{title}</p>
        <p className="mt-1 text-2xl font-semibold text-ds-primary">{value}</p>
        {trend && (
          <p
            className={`mt-1 text-xs font-medium ${
              trend.value >= 0
                ? "text-success-600 dark:text-success-400"
                : "text-error-600 dark:text-error-400"
            }`}
          >
            {trend.value >= 0 ? "+" : ""}
            {trend.value}% {trend.label}
          </p>
        )}
      </div>
    </Card>
  );
};

export default KpiCard;
