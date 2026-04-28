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
    className="absolute z-20 select-none rounded-2xl border border-amber-200/20 bg-white/[0.09] px-4 py-2.5 text-xs font-medium text-white/95 shadow-[0_18px_42px_-28px_rgba(251,146,60,0.75)] backdrop-blur-md pointer-events-none"
    style={style}
    initial={{ opacity: 0, y: 20, rotate: 0 }}
    animate={{ opacity: 1, y: [0, -7, 0], rotate }}
    transition={{
      opacity: { delay, duration: 0.45 },
      rotate: { delay, duration: 0.7, type: "spring", stiffness: 80 },
      y: { delay: delay + 0.45, duration: 4.8, repeat: Infinity, ease: "easeInOut" },
    }}
  >
    <div className="flex items-center gap-2">
      <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border border-amber-200/25 bg-amber-300/15">
        <MessageCircle size={11} className="text-amber-100" />
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
    <motion.div
      className="pointer-events-none absolute h-64 w-64 rounded-full"
      style={{
        background:
          "radial-gradient(circle, rgba(251, 146, 60, 0.26) 0%, rgba(59, 130, 246, 0.14) 46%, rgba(15, 23, 42, 0) 72%)",
      }}
      animate={{ scale: [0.96, 1.08, 0.96], opacity: [0.55, 0.9, 0.55] }}
      transition={{ repeat: Infinity, duration: 4.8, ease: "easeInOut" }}
    />
    <motion.div
      className="pointer-events-none absolute h-52 w-52 rounded-full border border-amber-200/25"
      animate={{ rotate: 360 }}
      transition={{ repeat: Infinity, duration: 18, ease: "linear" }}
    >
      <span className="absolute left-1/2 top-0 h-2 w-2 -translate-x-1/2 rounded-full bg-amber-300 shadow-[0_0_18px_rgba(251,191,36,0.9)]" />
    </motion.div>
    <div className="pointer-events-none absolute h-44 w-44 rounded-full border border-white/10" />

    <motion.div
      className="relative z-10 flex h-40 w-40 items-center justify-center rounded-full border border-amber-100/20 bg-[linear-gradient(145deg,rgba(255,255,255,0.16),rgba(255,255,255,0.06))] shadow-[0_30px_80px_-38px_rgba(251,146,60,0.8)] backdrop-blur-md"
      whileHover={{ scale: 1.06, rotate: 3 }}
      transition={{ type: "spring", stiffness: 260, damping: 20 }}
    >
      <Bot size={64} className="text-amber-50 drop-shadow-[0_0_18px_rgba(251,191,36,0.35)]" />
      <motion.div
        className="absolute -right-1 -top-1"
        animate={{ scale: [1, 1.3, 1], opacity: [0.5, 1, 0.5] }}
        transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
      >
        <Sparkles size={20} className="text-amber-200" />
      </motion.div>
      <motion.div
        className="absolute -left-2 bottom-2"
        animate={{ scale: [1, 1.2, 1], opacity: [0.4, 0.8, 0.4] }}
        transition={{ repeat: Infinity, duration: 3.2, ease: "easeInOut", delay: 0.8 }}
      >
        <Sparkles size={14} className="text-orange-200" />
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
        style={{
          background:
            "linear-gradient(126deg, rgba(251, 146, 60, 0.16) 0%, rgba(10, 17, 33, 0) 28%), linear-gradient(145deg, #050b18 0%, #0b1730 48%, #171b3d 100%)",
        }}
        initial={{ opacity: 0, x: -40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.18]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 18% 22%, rgba(251,146,60,0.32), transparent 30%), radial-gradient(circle at 82% 68%, rgba(59,130,246,0.24), transparent 32%), linear-gradient(135deg, transparent 0 42%, rgba(251,146,60,0.22) 42% 43%, transparent 43% 100%)",
            backgroundSize: "auto, auto, 320px 320px",
          }}
        />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-orange-950/25 to-transparent" />

        {bubbleStyles.map((bubble) => (
          <ChatBubble key={bubble.text} {...bubble} />
        ))}

        <div className="relative z-10 flex w-full flex-col items-center justify-center px-10 xl:px-14">
          <RobotIllustration />

          <motion.h1
            className="mt-10 text-center text-3xl font-black text-white xl:text-[2.6rem] xl:leading-tight"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.45 }}
          >
            MTS Telecom
          </motion.h1>

          <motion.div
            className="mt-3.5 inline-flex items-center gap-2 rounded-full border border-amber-200/30 bg-amber-300/10 px-4 py-1.5 shadow-[0_18px_44px_-30px_rgba(251,191,36,0.9)] backdrop-blur"
            initial={{ y: 15, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.55 }}
          >
            <Zap size={14} className="text-amber-200" />
            <span className="text-xs font-semibold uppercase text-amber-100">
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
              <motion.div
                key={badge.value}
                className="rounded-2xl border border-amber-100/[0.14] bg-white/[0.075] px-3.5 py-3.5 shadow-[0_20px_42px_-34px_rgba(251,146,60,0.95)] backdrop-blur-sm transition-colors duration-300 hover:border-amber-200/35 hover:bg-white/[0.11]"
                whileHover={{ y: -4 }}
                transition={{ type: "spring", stiffness: 260, damping: 22 }}
              >
                <div className="mb-1.5 inline-flex h-8 w-8 items-center justify-center rounded-lg border border-amber-200/25 bg-amber-300/12 text-amber-100">
                  <badge.icon size={15} />
                </div>
                <p className="text-[11px] font-semibold uppercase text-slate-200/90">
                  {badge.value}
                </p>
                <p className="mt-1 text-xs text-amber-50/70">{badge.label}</p>
              </motion.div>
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
        className="auth-form-side relative flex min-h-screen flex-1 flex-col transition-colors duration-300"
        initial={{ opacity: 0, x: 30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, delay: 0.15 }}
      >
        <div className="relative z-10 flex items-center justify-end gap-3 p-4 min-[900px]:p-6">
          <button
            onClick={toggleTheme}
            className="rounded-xl border border-slate-200 bg-white/80 p-2.5 text-slate-500 shadow-sm backdrop-blur transition-all duration-200 hover:border-primary-200 hover:bg-white hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-white"
            aria-label="Changer de thème"
          >
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          {rightHeader}
        </div>

        <div className="relative z-10 -mt-1 flex flex-col items-center px-6 pb-3 text-center lg:hidden">
          <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl border border-amber-200/40 bg-white shadow-[0_18px_38px_-30px_rgba(251,146,60,0.95)] dark:border-amber-200/20 dark:bg-slate-900">
            <Bot size={25} className="text-amber-500" />
          </div>
          <h1 className="text-xl font-extrabold text-slate-950 dark:text-white">MTS Telecom</h1>
          <p className="mt-1 max-w-xs text-xs leading-relaxed text-ds-muted">
            Supervision intelligente et support automatisé pour la continuité des opérations télécom
            B2B.
          </p>
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
