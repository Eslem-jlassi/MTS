// =============================================================================
// MTS TELECOM - Design system: Empty state
// =============================================================================

import React from "react";

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  className = "",
}) => {
  return (
    <div
      className={`flex flex-col items-center justify-center py-12 px-4 text-center bg-ds-card rounded-xl border border-ds-border ${className}`}
    >
      {icon && <div className="mb-4 text-ds-muted">{icon}</div>}
      <h3 className="text-lg font-semibold text-ds-primary">{title}</h3>
      {description && (
        <p className="mt-1 text-sm text-ds-secondary max-w-sm">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
};

export default EmptyState;
