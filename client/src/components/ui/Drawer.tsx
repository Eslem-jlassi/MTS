/**
 * Drawer - Panneau latéral (preview, filtres)
 * MTS Telecom - Design system SaaS
 */

import React, { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  /** "left" | "right" */
  side?: "left" | "right";
  width?: "sm" | "md" | "lg" | "xl" | "2xl" | "3xl";
}

const widthClasses = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
  "2xl": "max-w-2xl",
  "3xl": "max-w-3xl",
};

const Drawer: React.FC<DrawerProps> = ({
  isOpen,
  onClose,
  title,
  children,
  side = "right",
  width = "md",
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

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={onClose}
            aria-hidden
          />
          <motion.aside
            initial={{ x: side === "right" ? "100%" : "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: side === "right" ? "100%" : "-100%" }}
            transition={{ type: "tween", duration: 0.25, ease: "easeOut" }}
            className={`relative flex flex-col w-full ${widthClasses[width]} max-h-full bg-ds-card border-ds-border shadow-dropdown ${
              side === "right" ? "border-l ml-auto" : "border-r"
            }`}
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? "drawer-title" : undefined}
          >
            {title && (
              <div className="flex items-center justify-between px-4 py-3 border-b border-ds-border flex-shrink-0">
                <h2 id="drawer-title" className="text-lg font-semibold text-ds-primary">
                  {title}
                </h2>
                <button
                  type="button"
                  onClick={onClose}
                  className="p-2 rounded-xl text-ds-muted hover:text-ds-primary hover:bg-ds-elevated transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  aria-label="Fermer"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            )}
            <div className="flex-1 overflow-y-auto p-4">{children}</div>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
};

export default Drawer;
