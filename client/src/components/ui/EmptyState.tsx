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
      className={`ds-empty-state flex flex-col items-center justify-center px-5 py-12 text-center ${className}`}
    >
      {icon && (
        <div className="ds-icon-shell mb-4 flex h-14 w-14 items-center justify-center rounded-2xl text-ds-muted">
          {icon}
        </div>
      )}
      <p className="ds-kicker mb-2">Etat vide</p>
      <h3 className="text-lg font-semibold tracking-tight text-ds-primary">{title}</h3>
      {description && (
        <p className="mt-2 max-w-xl text-sm leading-6 text-ds-secondary">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
};

export default EmptyState;
