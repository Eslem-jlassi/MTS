// =============================================================================
// MTS TELECOM - Auth Layout (Enterprise split view)
// =============================================================================

import React, { useMemo } from "react";
import { motion } from "framer-motion";
import { Bot, MessageCircle, Moon, ShieldCheck, Sparkles, Sun, Zap } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";

const CHAT_BUBBLES = [
  {
    text: "ALLIE prépare votre support prioritaire.",
    top: "10%",
    left: "6%",
    delay: 0.6,
    rotate: -2,
  },
  {
    text: "Analyse d'incident finalisée.",
    top: "28%",
    right: "5%",
    delay: 1.0,
    rotate: 1,
  },
  {
    text: "SLA critiques traités en 4 min.",
    bottom: "30%",
    left: "5%",
    delay: 1.4,
    rotate: -2,
  },
  {
    text: "Disponibilité réseau : 99,95 %",
    bottom: "12%",
    right: "8%",
    delay: 1.8,
    rotate: 1,
  },
];

const LEFT_BADGES = [
  { icon: ShieldCheck, value: "Conformité SLA", label: "98,7 %" },
  { icon: Zap, value: "Escalades critiques", label: "Réponse en 4 min" },
  { icon: Sparkles, value: "Assistants IA", label: "Pilotage temps réel" },
];

const ChatBubble: React.FC<{
  text: string;
  delay: number;
  rotate: number;
  style: React.CSSProperties;
}> = React.memo(({ text, delay, rotate, style }) => (
  <motion.div
    className="absolute z-20 rounded-2xl border border-white/15 bg-white/[0.08] px-4 py-2.5 text-xs font-medium text-white/95 shadow-sm select-none pointer-events-none"
    style={style}
    initial={{ opacity: 0, y: 20, rotate: 0 }}
    animate={{ opacity: 1, y: 0, rotate }}
    transition={{ delay, duration: 0.7, type: "spring", stiffness: 80 }}
  >
    <div className="flex items-center gap-2">
      <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-white/10">
        <MessageCircle size={11} className="text-slate-200" />
      </span>
      <span>{text}</span>
    </div>
  </motion.div>
));
ChatBubble.displayName = "ChatBubble";

const RobotIllustration: React.FC = React.memo(() => (
  <motion.div
    className="relative flex items-center justify-center"
    initial={{ scale: 0.7, opacity: 0 }}
    animate={{ scale: 1, opacity: 1 }}
    transition={{ delay: 0.3, type: "spring", stiffness: 100, damping: 14 }}
  >
    <div className="pointer-events-none absolute h-48 w-48 rounded-full border border-orange-300/20" />

    <motion.div
      className="relative z-10 flex h-40 w-40 items-center justify-center rounded-full border border-white/15 bg-white/[0.08] shadow-md"
      whileHover={{ scale: 1.06, rotate: 3 }}
      transition={{ type: "spring", stiffness: 260, damping: 20 }}
    >
      <Bot size={64} className="text-slate-100" />
      <motion.div
        className="absolute -right-1 -top-1"
        animate={{ scale: [1, 1.3, 1], opacity: [0.5, 1, 0.5] }}
        transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
      >
        <Sparkles size={20} className="text-slate-200" />
      </motion.div>
      <motion.div
        className="absolute -left-2 bottom-2"
        animate={{ scale: [1, 1.2, 1], opacity: [0.4, 0.8, 0.4] }}
        transition={{ repeat: Infinity, duration: 3.2, ease: "easeInOut", delay: 0.8 }}
      >
        <Sparkles size={14} className="text-slate-300" />
      </motion.div>
    </motion.div>
  </motion.div>
));
RobotIllustration.displayName = "RobotIllustration";

interface AuthLayoutProps {
  children: React.ReactNode;
  rightHeader?: React.ReactNode;
}

const AuthLayout: React.FC<AuthLayoutProps> = ({ children, rightHeader }) => {
  const { theme, toggleTheme } = useTheme();

  const bubbleStyles = useMemo(
    () =>
      CHAT_BUBBLES.map(({ text, delay, rotate, ...pos }) => ({
        text,
        delay,
        rotate,
        style: pos as React.CSSProperties,
      })),
    [],
  );

  return (
    <div className="auth-shell min-h-screen flex flex-col lg:flex-row">
      <motion.div
        className="relative hidden min-h-screen overflow-hidden lg:flex lg:w-[47%] xl:w-[44%]"
        style={{ background: "#0f172a" }}
        initial={{ opacity: 0, x: -40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.065]"
          style={{
            backgroundImage: "none",
            backgroundSize: "28px 28px",
          }}
        />

        {bubbleStyles.map((bubble) => (
          <ChatBubble key={bubble.text} {...bubble} />
        ))}

        <div className="relative z-10 flex w-full flex-col items-center justify-center px-10 xl:px-14">
          <RobotIllustration />

          <motion.h1
            className="mt-10 text-center text-3xl font-black tracking-tight text-white xl:text-[2.6rem] xl:leading-tight"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.45 }}
          >
            MTS Telecom
          </motion.h1>

          <motion.div
            className="mt-3.5 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.08] px-4 py-1.5 shadow-sm"
            initial={{ y: 15, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.55 }}
          >
            <Zap size={14} className="text-slate-200" />
            <span className="text-xs font-semibold uppercase tracking-widest text-amber-100">
              Plateforme pilotée par l'IA
            </span>
          </motion.div>

          <motion.p
            className="mt-5 max-w-md text-center text-[0.9rem] leading-relaxed text-slate-300/90"
            initial={{ y: 15, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.65 }}
          >
            Supervision intelligente et support automatisé pour la continuité des opérations télécom
            B2B.
          </motion.p>

          <motion.div
            className="mt-9 grid w-full max-w-xl grid-cols-1 gap-3 sm:grid-cols-3"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
          >
            {LEFT_BADGES.map((badge) => (
              <div
                key={badge.value}
                className="rounded-2xl border border-white/[0.12] bg-white/[0.07] px-3.5 py-3.5 transition-colors duration-300 hover:bg-white/[0.1]"
              >
                <div className="mb-1.5 inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/15 bg-white/[0.08] text-slate-200">
                  <badge.icon size={15} />
                </div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-200/90">
                  {badge.value}
                </p>
                <p className="mt-1 text-xs text-slate-400">{badge.label}</p>
              </div>
            ))}
          </motion.div>

          <motion.p
            className="absolute bottom-8 text-xs text-slate-400/75"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2 }}
          >
            © 2026 Billcom Consulting
          </motion.p>
        </div>
      </motion.div>

      <motion.div
        className="relative flex min-h-screen flex-1 flex-col bg-white/95 transition-colors duration-300 dark:bg-slate-900"
        initial={{ opacity: 0, x: 30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, delay: 0.15 }}
      >
        <div className="pointer-events-none absolute inset-0 bg-transparent" />

        <div className="relative z-10 flex items-center justify-end gap-3 p-4 min-[900px]:p-6">
          <button
            onClick={toggleTheme}
            className="rounded-xl border border-slate-200 bg-slate-100 p-2.5 text-slate-500 transition-all duration-200 hover:bg-slate-200 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-white"
            aria-label="Changer de thème"
          >
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          {rightHeader}
        </div>

        <div className="relative z-10 flex flex-1 items-center justify-center px-6 pb-8 pt-1 min-[900px]:px-12 min-[900px]:pb-10">
          <div className="w-full max-w-[42rem]">{children}</div>
        </div>

        <div className="flex items-center justify-center gap-2 pb-5 text-xs text-slate-400 lg:hidden">
          <Bot size={14} className="text-accent-500" />
          <span>MTS Telecom · Billcom Consulting · Auth sécurisé</span>
        </div>
      </motion.div>
    </div>
  );
};

export default AuthLayout;
