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

const skinClasses: Record<ToastVariant, string> = {
  success:
    "border-success-200/90 bg-success-50/94 dark:border-success-500/20 dark:bg-success-500/10",
  error: "border-error-200/90 bg-error-50/94 dark:border-error-500/20 dark:bg-error-500/10",
  warning:
    "border-warning-200/90 bg-warning-50/94 dark:border-warning-500/20 dark:bg-warning-500/10",
  info: "border-primary-200/90 bg-primary-50/94 dark:border-primary-500/20 dark:bg-primary-500/10",
};

const progressClasses: Record<ToastVariant, string> = {
  success: "bg-success-500/70 dark:bg-success-400/60",
  error: "bg-error-500/70 dark:bg-error-400/60",
  warning: "bg-warning-500/70 dark:bg-warning-400/60",
  info: "bg-info-500/70 dark:bg-info-400/60",
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
      initial={{ opacity: 0, x: 48, scale: 0.97 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 48, scale: 0.97 }}
      transition={{ type: "spring", stiffness: 360, damping: 30 }}
      className={`ds-toast-surface relative flex w-full max-w-[22rem] items-start gap-3 overflow-hidden border p-4 ${skinClasses[toast.variant]}`}
      role={toast.variant === "error" ? "alert" : "status"}
    >
      <div className={`absolute inset-x-0 top-0 h-1 ${progressClasses[toast.variant]}`} />
      <span className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-2xl border border-white/35 bg-white/55 text-current shadow-[inset_0_1px_0_rgb(255_255_255_/_0.28)] dark:border-white/10 dark:bg-white/5">
        {icons[toast.variant]}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-ds-primary">{toast.title}</p>
        {toast.description && (
          <p className="mt-1 text-sm leading-5 text-ds-secondary">{toast.description}</p>
        )}
      </div>
      <button
        type="button"
        onClick={dismiss}
        className="flex-shrink-0 rounded-xl p-1.5 text-ds-muted transition-colors hover:bg-white/60 hover:text-ds-primary dark:hover:bg-white/5"
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
  position?: "bottom-right" | "top-right";
}

const containerPositionClasses = {
  "bottom-right": [
    "inset-x-3",
    "bottom-4",
    "items-end",
    "flex-col-reverse",
    "md:inset-x-auto",
    "md:bottom-6",
    "md:right-6",
  ].join(" "),
  "top-right": [
    "inset-x-3",
    "top-3",
    "items-end",
    "flex-col",
    "md:inset-x-auto",
    "md:top-4",
    "md:right-4",
  ].join(" "),
};

const ToastContainer: React.FC<ToastContainerProps> = ({
  toasts,
  onDismiss,
  position = "bottom-right",
}) => (
  <div
    className={`pointer-events-none fixed z-[999] flex gap-3 ${containerPositionClasses[position]}`}
    aria-live="polite"
    aria-atomic="false"
  >
    <AnimatePresence mode="popLayout">
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto w-full md:w-auto">
          <ToastItem toast={toast} onDismiss={onDismiss} />
        </div>
      ))}
    </AnimatePresence>
  </div>
);

export default ToastContainer;
