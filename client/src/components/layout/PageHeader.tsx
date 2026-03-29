/**
 * PageHeader - En-tête de page (titre, description, actions)
 * Phase 7 – UI/UX pro
 */

import React from "react";

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  icon?: React.ReactNode;
}

const PageHeader: React.FC<PageHeaderProps> = ({ title, description, actions, icon }) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
      <div className="flex items-center gap-3">
        {icon && (
          <div className="p-2.5 bg-primary/10 dark:bg-primary/20 rounded-xl">
            <span className="text-primary">{icon}</span>
          </div>
        )}
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-ds-primary tracking-tight">
            {title}
          </h1>
          {description && <p className="mt-0.5 text-sm text-ds-secondary">{description}</p>}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>}
    </div>
  );
};

export default PageHeader;
