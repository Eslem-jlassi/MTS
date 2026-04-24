// =============================================================================
// MTS TELECOM - Modal (Premium SaaS: overlay + panel, focus trap, animation)
// =============================================================================

import React, { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
  contentClassName?: string;
}

const sizeClasses = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
};

const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  size = "md",
  contentClassName,
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEscape);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  const bodyClassName = contentClassName ?? `${title ? "p-5 pt-4" : "p-5"} overflow-y-auto`;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-slate-950/45 backdrop-blur-sm"
            onClick={onClose}
            aria-hidden
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? "modal-title" : undefined}
            className={`ds-modal-surface relative flex max-h-[calc(100vh-2rem)] w-full flex-col ${sizeClasses[size]} overflow-hidden`}
            onClick={(e) => e.stopPropagation()}
          >
            {title && (
              <div className="border-b border-ds-border/80 bg-ds-card/85 px-5 py-4 backdrop-blur-sm">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h2
                      id="modal-title"
                      className="text-lg font-semibold tracking-tight text-ds-primary"
                    >
                      {title}
                    </h2>
                    {description && (
                      <p className="mt-1.5 max-w-xl text-sm leading-6 text-ds-secondary">
                        {description}
                      </p>
                    )}
                  </div>
                  <div className="flex items-start">
                    <button
                      type="button"
                      onClick={onClose}
                      className="rounded-xl border border-ds-border bg-ds-card/75 p-2 text-ds-muted transition-all duration-200 hover:border-primary-300/35 hover:bg-ds-elevated hover:text-ds-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      aria-label="Fermer"
                    >
                      <svg
                        className="h-5 w-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            )}
            <div className={bodyClassName}>{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default Modal;
