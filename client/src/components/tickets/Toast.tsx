// =============================================================================
// MTS TELECOM - Toast Notification Component
// =============================================================================
/**
 * ============================================================================
 * Toast.tsx - Système de notifications toast
 * ============================================================================
 * 
 * RÔLE:
 * Affiche des messages de succès, erreur ou information en haut à droite
 * de l'écran. Remplace les alert() natifs du navigateur.
 * 
 * UTILISATION:
 * <Toast message="Ticket créé" type="success" onClose={() => setToast(null)} />
 * 
 * TYPES:
 * - success: Fond vert (opération réussie)
 * - error: Fond rouge (erreur)
 * - info: Fond bleu (information)
 * - warning: Fond jaune (avertissement)
 * 
 * AUTO-DISMISS:
 * Le toast disparaît automatiquement après 4 secondes.
 * L'utilisateur peut aussi cliquer sur la croix pour le fermer.
 * 
 * ============================================================================
 */

import React, { useEffect, useState } from "react";
import { CheckCircle, XCircle, AlertTriangle, Info, X } from "lucide-react";

// Types pour le toast
export type ToastType = "success" | "error" | "warning" | "info";

export interface ToastMessage {
  message: string;
  type: ToastType;
}

interface ToastProps {
  message: string;
  type: ToastType;
  onClose: () => void;
  duration?: number; // en ms, défaut 4000
}

// Configuration visuelle par type
const toastConfig: Record<
  ToastType,
  { bg: string; border: string; text: string; icon: React.ReactNode }
> = {
  success: {
    bg: "bg-green-50 dark:bg-green-900/30",
    border: "border-green-400 dark:border-green-600",
    text: "text-green-800 dark:text-green-200",
    icon: <CheckCircle size={20} className="text-green-500" />,
  },
  error: {
    bg: "bg-red-50 dark:bg-red-900/30",
    border: "border-red-400 dark:border-red-600",
    text: "text-red-800 dark:text-red-200",
    icon: <XCircle size={20} className="text-red-500" />,
  },
  warning: {
    bg: "bg-yellow-50 dark:bg-yellow-900/30",
    border: "border-yellow-400 dark:border-yellow-600",
    text: "text-yellow-800 dark:text-yellow-200",
    icon: <AlertTriangle size={20} className="text-yellow-500" />,
  },
  info: {
    bg: "bg-primary-50 dark:bg-primary-900/30",
    border: "border-primary-400 dark:border-primary-600",
    text: "text-primary-800 dark:text-primary-200",
    icon: <Info size={20} className="text-primary-500" />,
  },
};

const Toast: React.FC<ToastProps> = ({ message, type, onClose, duration = 4000 }) => {
  const [isVisible, setIsVisible] = useState(false);
  const config = toastConfig[type];

  useEffect(() => {
    // Animation d'entrée (slide in)
    requestAnimationFrame(() => setIsVisible(true));

    // Auto-dismiss après la durée configurée
    const timer = setTimeout(() => {
      setIsVisible(false);
      // Attend la fin de l'animation avant de fermer
      setTimeout(onClose, 300);
    }, duration);

    return () => clearTimeout(timer);
  }, [onClose, duration]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 300);
  };

  return (
    <div
      className={`fixed top-4 right-4 z-[100] transition-all duration-300 ${
        isVisible ? "translate-x-0 opacity-100" : "translate-x-full opacity-0"
      }`}
    >
      <div
        className={`flex items-center gap-3 px-4 py-3 rounded-lg border shadow-lg max-w-md ${config.bg} ${config.border}`}
      >
        {config.icon}
        <p className={`text-sm font-medium flex-1 ${config.text}`}>{message}</p>
        <button
          onClick={handleClose}
          className={`p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 ${config.text}`}
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
};

export default Toast;
