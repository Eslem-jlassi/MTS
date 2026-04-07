// =============================================================================
// MTS TELECOM - Toast adapter for legacy ticket pages
// =============================================================================

import React from "react";
import ToastContainer, { ToastVariant } from "../ui/Toast";

export type ToastType = ToastVariant;

export interface ToastMessage {
  message: string;
  type: ToastType;
}

interface ToastProps {
  message: string;
  type: ToastType;
  onClose: () => void;
  duration?: number;
}

const Toast: React.FC<ToastProps> = ({ message, type, onClose, duration = 4000 }) => {
  return (
    <ToastContainer
      position="top-right"
      onDismiss={() => onClose()}
      toasts={[
        {
          id: "legacy-ticket-toast",
          variant: type,
          title:
            type === "success"
              ? "Succes"
              : type === "error"
                ? "Erreur"
                : type === "warning"
                  ? "Attention"
                  : "Information",
          description: message,
          duration,
        },
      ]}
    />
  );
};

export default Toast;
