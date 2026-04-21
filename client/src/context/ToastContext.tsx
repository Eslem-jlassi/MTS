/**
 * ToastContext - Notifications ephemeres coherentes avec le design system
 */

import React, { createContext, useCallback, useContext, useState } from "react";
import ToastContainer, { ToastData, ToastVariant } from "../components/ui/Toast";

export type ToastType = ToastVariant;

interface ToastContextValue {
  toasts: ToastData[];
  addToast: (type: ToastType, message: string, title?: string) => void;
  removeToast: (id: string) => void;
  success: (message: string, title?: string) => void;
  error: (message: string, title?: string) => void;
  info: (message: string, title?: string) => void;
  warning: (message: string, title?: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

let toastId = 0;
function nextId() {
  return `toast-${++toastId}-${Date.now()}`;
}

const titleDefaults: Record<ToastType, string> = {
  success: "Succes",
  error: "Erreur",
  info: "Information",
  warning: "Attention",
};

const durationDefaults: Record<ToastType, number> = {
  success: 4200,
  error: 6200,
  info: 5000,
  warning: 5600,
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastData[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const addToast = useCallback((type: ToastType, message: string, title?: string) => {
    const normalizedMessage = message.trim();
    if (!normalizedMessage) return;

    setToasts((prev) => {
      const hasDuplicate = prev.some(
        (toast) => toast.variant === type && toast.description === normalizedMessage,
      );

      if (hasDuplicate) return prev;

      return [
        ...prev.slice(-4),
        {
          id: nextId(),
          variant: type,
          title: title ?? titleDefaults[type],
          description: normalizedMessage,
          duration: durationDefaults[type],
        },
      ];
    });
  }, []);

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
  const warning = useCallback(
    (message: string, title?: string) => addToast("warning", message, title),
    [addToast],
  );

  const value: ToastContextValue = {
    toasts,
    addToast,
    removeToast,
    success,
    error,
    info,
    warning,
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={removeToast} position="top-right" />
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
