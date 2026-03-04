// =============================================================================
// MTS TELECOM - Onboarding Modal (post-login, role-based, one-time)
// Non-bloquant · Skippable · Persisté dans localStorage
// Billcom Consulting - PFE 2026
// =============================================================================

import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Ticket,
  Bot,
  PenTool,
  Eye,
  BarChart3,
  Server,
  ShieldCheck,
  X,
  ChevronRight,
  Sparkles,
  Rocket,
} from "lucide-react";
import { UserRole } from "../../types";

// =============================================================================
// TYPES
// =============================================================================
interface OnboardingStep {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: { label: string; path: string };
}

interface OnboardingModalProps {
  /** Rôle de l'utilisateur connecté */
  userRole: UserRole;
  /** ID unique de l'utilisateur (pour clé localStorage) */
  userId: number | string;
  /** Callback après fermeture */
  onComplete?: () => void;
}

// =============================================================================
// STEPS PAR RÔLE
// =============================================================================
const STEPS_BY_ROLE: Record<UserRole, OnboardingStep[]> = {
  [UserRole.CLIENT]: [
    {
      icon: <Ticket size={28} className="text-primary-500" />,
      title: "Créer votre premier ticket",
      description:
        "Décrivez votre problème et notre équipe vous répondra rapidement. Vous pouvez joindre des fichiers et suivre l'avancement en temps réel.",
      action: { label: "Créer un ticket", path: "/tickets?action=new" },
    },
    {
      icon: <Bot size={28} className="text-accent-500" />,
      title: "Découvrir le chatbot IA",
      description:
        "Notre assistant intelligent peut résoudre les questions fréquentes, vérifier le statut de vos services et vous guider dans les démarches.",
      action: { label: "Voir le dashboard", path: "/dashboard" },
    },
  ],
  [UserRole.AGENT]: [
    {
      icon: <PenTool size={28} className="text-primary-500" />,
      title: "Configurer votre signature",
      description:
        "Personnalisez votre signature qui apparaîtra dans les réponses aux tickets. Ajoutez vos coordonnées et votre spécialité.",
      action: { label: "Mon profil", path: "/profile" },
    },
    {
      icon: <Eye size={28} className="text-accent-500" />,
      title: "Voir vos tickets assignés",
      description:
        "Consultez les tickets qui vous sont affectés, filtrez par priorité et utilisez la vue Kanban pour organiser votre travail.",
      action: { label: "Mes tickets", path: "/tickets" },
    },
  ],
  [UserRole.MANAGER]: [
    {
      icon: <BarChart3 size={28} className="text-primary-500" />,
      title: "Configurer vos KPI favoris",
      description:
        "Choisissez les indicateurs clés à afficher sur votre tableau de bord : taux de résolution, SLA compliance, charge par agent…",
      action: { label: "Tableau de bord", path: "/dashboard" },
    },
    {
      icon: <Eye size={28} className="text-accent-500" />,
      title: "Superviser votre équipe",
      description:
        "Visualisez la charge de travail de vos agents, les escalades en cours et les rapports de performance hebdomadaires.",
      action: { label: "Rapports", path: "/reports" },
    },
  ],
  [UserRole.ADMIN]: [
    {
      icon: <Server size={28} className="text-primary-500" />,
      title: "Créer les services télécom",
      description:
        "Définissez vos services (réseau, CRM, facturation…) pour que les tickets soient automatiquement catégorisés et routés.",
      action: { label: "Gérer les services", path: "/services" },
    },
    {
      icon: <ShieldCheck size={28} className="text-accent-500" />,
      title: "Configurer les politiques SLA",
      description:
        "Définissez les temps de réponse et résolution par priorité. Les escalades automatiques se déclencheront en cas de dépassement.",
      action: { label: "SLA & Escalade", path: "/sla" },
    },
  ],
};

// =============================================================================
// STORAGE HELPERS
// =============================================================================
const STORAGE_KEY_PREFIX = "mts_onboarding_done_";

function isOnboardingDone(userId: number | string): boolean {
  return localStorage.getItem(`${STORAGE_KEY_PREFIX}${userId}`) === "true";
}

function markOnboardingDone(userId: number | string): void {
  localStorage.setItem(`${STORAGE_KEY_PREFIX}${userId}`, "true");
}

// =============================================================================
// COMPOSANT PRINCIPAL
// =============================================================================
const OnboardingModal: React.FC<OnboardingModalProps> = ({
  userRole,
  userId,
  onComplete,
}) => {
  const navigate = useNavigate();
  const [visible, setVisible] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  const steps = STEPS_BY_ROLE[userRole] || [];

  // Show modal only once, after a small delay for smoother UX
  useEffect(() => {
    if (isOnboardingDone(userId) || steps.length === 0) return;
    const timer = setTimeout(() => setVisible(true), 800);
    return () => clearTimeout(timer);
  }, [userId, steps.length]);

  const handleClose = useCallback(() => {
    markOnboardingDone(userId);
    setVisible(false);
    onComplete?.();
  }, [userId, onComplete]);

  const handleAction = useCallback(
    (path: string) => {
      markOnboardingDone(userId);
      setVisible(false);
      onComplete?.();
      navigate(path);
    },
    [userId, onComplete, navigate],
  );

  const handleNext = useCallback(() => {
    if (currentStep < steps.length - 1) {
      setCurrentStep((s) => s + 1);
    } else {
      handleClose();
    }
  }, [currentStep, steps.length, handleClose]);

  if (!visible || steps.length === 0) return null;

  const step = steps[currentStep];
  const isLast = currentStep === steps.length - 1;

  return (
    <AnimatePresence>
      {visible && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] bg-black/40 backdrop-blur-sm"
            onClick={handleClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 20 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="fixed inset-x-4 top-[15%] z-[81] mx-auto max-w-md bg-ds-card border border-ds-border rounded-2xl shadow-dropdown overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-5 pb-3">
              <div className="flex items-center gap-2">
                <Rocket size={18} className="text-accent-500" />
                <span className="text-xs font-semibold uppercase tracking-wider text-ds-muted">
                  Bienvenue — Étape {currentStep + 1}/{steps.length}
                </span>
              </div>
              <button
                type="button"
                onClick={handleClose}
                className="p-1.5 rounded-lg text-ds-muted hover:text-ds-primary hover:bg-ds-elevated transition-colors"
                aria-label="Passer l'onboarding"
                title="Passer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Step content */}
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
                transition={{ duration: 0.2 }}
                className="px-6 pb-2"
              >
                {/* Icon */}
                <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-ds-elevated mb-4 mx-auto">
                  {step.icon}
                </div>

                <h3 className="text-lg font-bold text-ds-primary text-center">
                  {step.title}
                </h3>
                <p className="text-sm text-ds-secondary text-center mt-2 leading-relaxed">
                  {step.description}
                </p>

                {/* CTA */}
                {step.action && (
                  <button
                    type="button"
                    onClick={() => handleAction(step.action!.path)}
                    className="mt-5 w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium transition-colors"
                  >
                    {step.action.label}
                    <ChevronRight size={16} />
                  </button>
                )}
              </motion.div>
            </AnimatePresence>

            {/* Footer — step dots + skip/next */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-ds-border mt-3">
              {/* Step dots */}
              <div className="flex items-center gap-1.5">
                {steps.map((_, idx) => (
                  <div
                    key={idx}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      idx === currentStep
                        ? "w-6 bg-primary-500"
                        : idx < currentStep
                        ? "w-1.5 bg-primary-300 dark:bg-primary-700"
                        : "w-1.5 bg-ds-border"
                    }`}
                  />
                ))}
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleClose}
                  className="text-xs font-medium text-ds-muted hover:text-ds-primary transition-colors"
                >
                  Passer
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-ds-elevated hover:bg-primary-50 dark:hover:bg-primary-900/20 text-sm font-medium text-ds-primary transition-colors"
                >
                  {isLast ? (
                    <>
                      <Sparkles size={14} className="text-accent-500" />
                      C'est parti !
                    </>
                  ) : (
                    <>
                      Suivant
                      <ChevronRight size={14} />
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default OnboardingModal;
