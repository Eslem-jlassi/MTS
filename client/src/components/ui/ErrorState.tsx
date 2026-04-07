// =============================================================================
// MTS TELECOM - Design system: Error state with retry
// =============================================================================

import React from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import Button from "./Button";

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
}

const ErrorState: React.FC<ErrorStateProps> = ({
  title = "Erreur de chargement",
  message = "Impossible de recuperer les donnees. Verifiez votre connexion puis reessayez.",
  onRetry,
  retryLabel = "Reessayer",
  className = "",
}) => {
  return (
    <div className={`ds-empty-state flex flex-col items-center justify-center px-5 py-12 text-center ${className}`}>
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-error-200 bg-error-50 text-error-600 dark:border-error-500/20 dark:bg-error-500/12 dark:text-error-300">
        <AlertTriangle size={30} />
      </div>
      <p className="ds-kicker mb-2 text-error-600 dark:text-error-300">Etat d'erreur</p>
      <h3 className="text-lg font-semibold tracking-tight text-ds-primary">{title}</h3>
      <p className="mt-2 max-w-md text-sm leading-6 text-ds-secondary">{message}</p>
      {onRetry && (
        <div className="mt-5">
          <Button variant="outline" icon={<RefreshCw size={16} />} onClick={onRetry}>
            {retryLabel}
          </Button>
        </div>
      )}
    </div>
  );
};

export default ErrorState;
