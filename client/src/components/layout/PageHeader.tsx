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
    <div className="ds-page-header mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        {icon && (
          <div className="ds-page-header-icon p-2.5">
            <span className="text-primary">{icon}</span>
          </div>
        )}
        <div className="ds-page-header-copy min-w-0">
          <h1 className="ds-page-header-title text-xl font-semibold tracking-tight text-ds-primary sm:text-2xl">
            {title}
          </h1>
          {description && (
            <p className="ds-page-header-description mt-1 text-sm text-ds-secondary">
              {description}
            </p>
          )}
        </div>
      </div>
      {actions && <div className="ds-page-header-actions flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
};

export default PageHeader;
