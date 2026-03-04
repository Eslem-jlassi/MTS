// =============================================================================
// MTS TELECOM - Design system: Error state with retry
// =============================================================================

import React from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
}

/**
 * Composant d'état d'erreur réutilisable avec action de retry.
 * À utiliser partout où un fetch échoue pour donner du feedback utilisateur.
 */
const ErrorState: React.FC<ErrorStateProps> = ({
  title = "Erreur de chargement",
  message = "Impossible de récupérer les données. Vérifiez votre connexion et réessayez.",
  onRetry,
  retryLabel = "Réessayer",
  className = "",
}) => {
  return (
    <div
      className={`flex flex-col items-center justify-center py-12 px-4 text-center bg-ds-card rounded-xl border border-red-200 dark:border-red-500/20 ${className}`}
    >
      <div className="mb-4 p-3 rounded-full bg-red-50 dark:bg-red-500/10">
        <AlertTriangle size={32} className="text-red-500" />
      </div>
      <h3 className="text-lg font-semibold text-ds-primary">{title}</h3>
      <p className="mt-1 text-sm text-ds-secondary max-w-sm">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg
                     bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400
                     hover:bg-red-100 dark:hover:bg-red-500/20
                     font-medium text-sm transition-colors"
        >
          <RefreshCw size={16} />
          {retryLabel}
        </button>
      )}
    </div>
  );
};

export default ErrorState;
