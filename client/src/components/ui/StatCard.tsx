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

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon,
  trend,
  className = "",
}) => {
  return (
    <Card className={`flex items-start gap-4 ${className}`}>
      {icon && (
        <div className="flex-shrink-0 p-3 rounded-xl bg-primary-50 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400">
          {icon}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-ds-secondary truncate">{title}</p>
        <p className="mt-1 text-2xl font-semibold text-ds-primary">{value}</p>
        {trend && (
          <p
            className={`mt-1 text-xs font-medium ${
              trend.value >= 0
                ? "text-success-600 dark:text-success-200"
                : "text-error-600 dark:text-error-200"
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

export default StatCard;
