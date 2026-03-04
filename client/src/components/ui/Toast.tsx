import React, { useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, AlertTriangle, Info, XCircle, X } from "lucide-react";

export type ToastVariant = "success" | "error" | "warning" | "info";

export interface ToastData {
  id: string;
  variant: ToastVariant;
  title: string;
  description?: string;
  duration?: number;
}

interface ToastItemProps {
  toast: ToastData;
  onDismiss: (id: string) => void;
}

const icons: Record<ToastVariant, React.ReactNode> = {
  success: <CheckCircle size={18} className="text-success-600 dark:text-success-200" />,
  error: <XCircle size={18} className="text-error-600 dark:text-error-200" />,
  warning: <AlertTriangle size={18} className="text-warning-600 dark:text-warning-200" />,
  info: <Info size={18} className="text-info-600 dark:text-info-200" />,
};

const bgClasses: Record<ToastVariant, string> = {
  success: "bg-success-50 border-success-200 dark:bg-success-500/10 dark:border-success/20",
  error: "bg-error-50 border-error-200 dark:bg-error-500/10 dark:border-error/20",
  warning: "bg-warning-50 border-warning-200 dark:bg-warning-500/10 dark:border-warning/20",
  info: "bg-info-50 border-info-200 dark:bg-info-500/10 dark:border-info/20",
};

const ToastItem: React.FC<ToastItemProps> = ({ toast, onDismiss }) => {
  const dismiss = useCallback(() => onDismiss(toast.id), [toast.id, onDismiss]);

  useEffect(() => {
    const ms = toast.duration ?? 5000;
    if (ms <= 0) return;
    const timer = setTimeout(dismiss, ms);
    return () => clearTimeout(timer);
  }, [toast.duration, dismiss]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 60, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 60, scale: 0.95 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      className={`flex items-start gap-3 w-80 p-4 rounded-2xl border shadow-dropdown ${bgClasses[toast.variant]}`}
      role="alert"
    >
      <span className="flex-shrink-0 mt-0.5">{icons[toast.variant]}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-ds-primary">{toast.title}</p>
        {toast.description && (
          <p className="text-xs text-ds-secondary mt-0.5">{toast.description}</p>
        )}
      </div>
      <button
        type="button"
        onClick={dismiss}
        className="flex-shrink-0 p-1 rounded-lg text-ds-muted hover:text-ds-primary hover:bg-ds-elevated transition-colors"
        aria-label="Fermer"
      >
        <X size={14} />
      </button>
    </motion.div>
  );
};

interface ToastContainerProps {
  toasts: ToastData[];
  onDismiss: (id: string) => void;
}

const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onDismiss }) => (
  <div className="fixed bottom-6 right-6 z-[999] flex flex-col-reverse gap-3 pointer-events-none">
    <AnimatePresence mode="popLayout">
      {toasts.map((t) => (
        <div key={t.id} className="pointer-events-auto">
          <ToastItem toast={t} onDismiss={onDismiss} />
        </div>
      ))}
    </AnimatePresence>
  </div>
);

export default ToastContainer;
