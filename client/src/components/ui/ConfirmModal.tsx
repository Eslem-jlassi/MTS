// =============================================================================
// MTS TELECOM - Design system: Confirm Modal (delete / dangerous actions)
// =============================================================================

import React, { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";
import Modal from "./Modal";
import Button from "./Button";

export interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "warning" | "primary";
  loading?: boolean;
  confirmationKeyword?: string;
  confirmationHint?: string;
}

const variantIcon: Record<string, string> = {
  danger: "bg-error-50 dark:bg-error-500/10 text-error-600 dark:text-error-400",
  warning: "bg-warning-50 dark:bg-warning-500/10 text-warning-600 dark:text-warning-400",
  primary: "bg-primary-50 dark:bg-primary-500/10 text-primary-600 dark:text-primary-400",
};

const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title = "Confirmer l'action",
  message,
  confirmLabel = "Confirmer",
  cancelLabel = "Annuler",
  variant = "danger",
  loading = false,
  confirmationKeyword,
  confirmationHint,
}) => {
  const [confirmationValue, setConfirmationValue] = useState("");
  const normalizedConfirmationKeyword = confirmationKeyword?.trim() ?? "";
  const requiresTypedConfirmation = normalizedConfirmationKeyword.length > 0;
  const isTypedConfirmationValid =
    !requiresTypedConfirmation || confirmationValue.trim() === normalizedConfirmationKeyword;

  useEffect(() => {
    if (!isOpen) {
      setConfirmationValue("");
    }
  }, [isOpen]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm">
      <div className="flex flex-col items-center text-center">
        <div className={`p-3 rounded-full mb-4 ${variantIcon[variant]}`}>
          <AlertTriangle size={28} />
        </div>
        <h3 className="text-lg font-semibold text-ds-primary mb-2">{title}</h3>
        <div className="text-sm text-ds-secondary mb-6">{message}</div>
        {requiresTypedConfirmation && (
          <div className="w-full text-left mb-6">
            <label className="block text-xs font-medium uppercase tracking-wide text-ds-muted mb-2">
              Confirmation forte
            </label>
            <p className="text-sm text-ds-secondary mb-3">
              {confirmationHint ??
                `Tapez ${normalizedConfirmationKeyword} pour confirmer la suppression definitive.`}
            </p>
            <input
              type="text"
              value={confirmationValue}
              onChange={(event) => setConfirmationValue(event.target.value)}
              className="w-full px-3 py-2 border border-ds-border rounded-xl bg-ds-card text-ds-primary focus:ring-2 focus:ring-primary-400/30 focus:border-primary-500 transition-all"
              autoComplete="off"
            />
          </div>
        )}
        <div className="flex items-center gap-3 w-full">
          <Button variant="secondary" fullWidth onClick={onClose} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button
            variant={variant === "danger" ? "danger" : "primary"}
            fullWidth
            onClick={onConfirm}
            loading={loading}
            disabled={loading || !isTypedConfirmationValid}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default ConfirmModal;
