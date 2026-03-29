/**
 * ToastContext - Notifications éphémères (success / error / info)
 * MTS Telecom - Design system SaaS
 */

import React, { createContext, useCallback, useContext, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, XCircle, Info, AlertTriangle, X } from "lucide-react";

export type ToastType = "success" | "error" | "info" | "warning";

export interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
  title?: string;
}

interface ToastContextValue {
  toasts: ToastItem[];
  addToast: (type: ToastType, message: string, title?: string) => void;
  removeToast: (id: string) => void;
  success: (message: string, title?: string) => void;
  error: (message: string, title?: string) => void;
  info: (message: string, title?: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

let toastId = 0;
function nextId() {
  return `toast-${++toastId}-${Date.now()}`;
}

const typeConfig = {
  success: {
    icon: CheckCircle,
    bgClass: "bg-success/10 dark:bg-success/20 border-success/40",
    iconClass: "text-success",
    titleDefault: "Succès",
  },
  error: {
    icon: XCircle,
    bgClass: "bg-error/10 dark:bg-error/20 border-error/40",
    iconClass: "text-error",
    titleDefault: "Erreur",
  },
  info: {
    icon: Info,
    bgClass: "bg-primary/10 dark:bg-primary/20 border-primary/40",
    iconClass: "text-primary",
    titleDefault: "Information",
  },
  warning: {
    icon: AlertTriangle,
    bgClass: "bg-warning/10 dark:bg-warning/20 border-warning/40",
    iconClass: "text-warning",
    titleDefault: "Attention",
  },
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    (type: ToastType, message: string, title?: string) => {
      const id = nextId();
      setToasts((prev) => [...prev.slice(-4), { id, type, message, title }]);
      setTimeout(() => removeToast(id), 5000);
    },
    [removeToast],
  );

  const success = useCallback(
    (message: string, title?: string) => addToast("success", message, title),
    [addToast],
  );
  const error = useCallback(
    (message: string, title?: string) => addToast("error", message, title),
    [addToast],
  );
  const info = useCallback(
    (message: string, title?: string) => addToast("info", message, title),
    [addToast],
  );

  const value: ToastContextValue = {
    toasts,
    addToast,
    removeToast,
    success,
    error,
    info,
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="fixed bottom-4 right-4 z-[60] flex flex-col gap-2 max-w-sm w-full sm:max-w-md pointer-events-none"
        aria-live="polite"
        aria-label="Notifications"
      >
        <AnimatePresence mode="popLayout">
          {toasts.map((t) => {
            const config = typeConfig[t.type];
            const Icon = config.icon;
            return (
              <motion.div
                key={t.id}
                layout
                initial={{ opacity: 0, y: 20, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.98 }}
                transition={{ duration: 0.2 }}
                className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl border shadow-soft-lg ${config.bgClass}`}
              >
                <Icon
                  size={20}
                  className={`flex-shrink-0 mt-0.5 ${config.iconClass}`}
                  aria-hidden
                />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-ds-primary text-sm">
                    {t.title ?? config.titleDefault}
                  </p>
                  <p className="text-sm text-ds-secondary mt-0.5">{t.message}</p>
                </div>
                <button
                  type="button"
                  onClick={() => removeToast(t.id)}
                  className="p-1 rounded-lg text-ds-muted hover:text-ds-primary hover:bg-ds-elevated transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  aria-label="Fermer"
                >
                  <X size={16} />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
