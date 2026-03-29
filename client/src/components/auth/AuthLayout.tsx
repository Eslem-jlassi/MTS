// =============================================================================
// MTS TELECOM - Auth Layout (Enterprise-Grade Split Screen)
// Left: Deep blue branding + 3D AI robot + glassmorphism chat bubbles
// Right: Clean form area (white/dark adaptive)
// Billcom Consulting - PFE 2026
// =============================================================================

import React, { useMemo } from "react";
import { motion } from "framer-motion";
import { Bot, Sparkles, MessageCircle, Zap, Sun, Moon } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";

// ── Floating glassmorphism chat bubbles ──────────────────────────────────────
const CHAT_BUBBLES = [
  {
    text: "Bonjour ! Je suis votre assistant IA 🤖",
    top: "14%",
    left: "10%",
    delay: 0.6,
    rotate: -3,
  },
  {
    text: "Analyse terminée ✅",
    top: "32%",
    right: "8%",
    delay: 1.0,
    rotate: 2,
  },
  {
    text: "3 tickets résolus aujourd'hui",
    bottom: "30%",
    left: "6%",
    delay: 1.4,
    rotate: -2,
  },
  {
    text: "Conformité SLA : 98,7 %",
    bottom: "14%",
    right: "12%",
    delay: 1.8,
    rotate: 1,
  },
];

/** Single glassmorphism floating bubble */
const ChatBubble: React.FC<{
  text: string;
  delay: number;
  rotate: number;
  style: React.CSSProperties;
}> = React.memo(({ text, delay, rotate, style }) => (
  <motion.div
    className="absolute z-20 px-4 py-2.5 rounded-2xl
               bg-white/10 backdrop-blur-md border border-white/15
               text-white/90 text-xs font-medium shadow-lg
               select-none pointer-events-none"
    style={style}
    initial={{ opacity: 0, y: 20, rotate: 0 }}
    animate={{ opacity: 1, y: 0, rotate }}
    transition={{ delay, duration: 0.7, type: "spring", stiffness: 80 }}
  >
    <div className="flex items-center gap-1.5">
      <MessageCircle size={12} className="text-accent-400 flex-shrink-0" />
      <span>{text}</span>
    </div>
  </motion.div>
));
ChatBubble.displayName = "ChatBubble";

/** 3D Robot placeholder with orange glow halo */
const RobotIllustration: React.FC = React.memo(() => (
  <motion.div
    className="relative flex items-center justify-center"
    initial={{ scale: 0.7, opacity: 0 }}
    animate={{ scale: 1, opacity: 1 }}
    transition={{ delay: 0.3, type: "spring", stiffness: 100, damping: 14 }}
  >
    {/* Orange glow halo */}
    <div className="absolute w-56 h-56 rounded-full bg-accent-500 blur-3xl opacity-20 pointer-events-none" />
    <div className="absolute w-40 h-40 rounded-full bg-accent-400 blur-2xl opacity-15 pointer-events-none animate-pulse" />

    {/* Robot container — glassmorphism circle */}
    <motion.div
      className="relative z-10 flex items-center justify-center w-32 h-32 rounded-full
                 bg-white/10 backdrop-blur-lg border border-white/15
                 shadow-2xl shadow-accent-500/10"
      whileHover={{ scale: 1.06, rotate: 3 }}
      transition={{ type: "spring", stiffness: 260, damping: 20 }}
    >
      <Bot size={56} className="text-accent-400 drop-shadow-lg" />

      {/* Sparkle accent */}
      <motion.div
        className="absolute -top-1 -right-1"
        animate={{ scale: [1, 1.3, 1], opacity: [0.5, 1, 0.5] }}
        transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
      >
        <Sparkles size={18} className="text-accent-300" />
      </motion.div>
    </motion.div>
  </motion.div>
));
RobotIllustration.displayName = "RobotIllustration";

// ── Main Layout ──────────────────────────────────────────────────────────────

interface AuthLayoutProps {
  children: React.ReactNode;
  rightHeader?: React.ReactNode;
}

const AuthLayout: React.FC<AuthLayoutProps> = ({ children, rightHeader }) => {
  const { theme, toggleTheme } = useTheme();

  // Memoize bubble styles so objects aren't re-created every render
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
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* ================================================================= */}
      {/* LEFT PANEL — Deep blue branding + AI Robot + Chat Bubbles          */}
      {/* ================================================================= */}
      <motion.div
        className="relative hidden lg:flex lg:w-1/2 min-h-screen bg-slate-900 overflow-hidden"
        initial={{ opacity: 0, x: -40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6 }}
      >
        {/* Subtle radial gradient */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse at 50% 40%, rgb(var(--color-accent) / 0.08) 0%, transparent 60%)",
          }}
        />

        {/* Dot grid pattern */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.04]"
          style={{
            backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.6) 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        />

        {/* Floating Chat Bubbles */}
        {bubbleStyles.map((b) => (
          <ChatBubble key={b.text} {...b} />
        ))}

        {/* Center content */}
        <div className="relative z-10 flex flex-col items-center justify-center w-full px-12">
          {/* Robot */}
          <RobotIllustration />

          {/* Brand */}
          <motion.h1
            className="mt-10 text-3xl font-extrabold text-white tracking-tight"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.45 }}
          >
            MTS Telecom
          </motion.h1>

          <motion.div
            className="flex items-center gap-2 mt-3"
            initial={{ y: 15, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.55 }}
          >
            <Zap size={14} className="text-accent-400" />
            <span className="text-xs font-semibold text-accent-400 uppercase tracking-widest">
              Plateforme propulsée par l'IA
            </span>
          </motion.div>

          <motion.p
            className="mt-4 text-sm text-slate-400 text-center max-w-xs leading-relaxed"
            initial={{ y: 15, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.65 }}
          >
            Supervision intelligente et support automatisé pour opérateurs télécoms
          </motion.p>

          {/* Footer */}
          <motion.p
            className="absolute bottom-8 text-xs text-slate-500"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2 }}
          >
            © 2026 Billcom Consulting
          </motion.p>
        </div>
      </motion.div>

      {/* ================================================================= */}
      {/* RIGHT PANEL — Form area (white / dark adaptive)                   */}
      {/* ================================================================= */}
      <motion.div
        className="relative flex-1 flex flex-col min-h-screen
                   bg-white dark:bg-slate-800 transition-colors duration-300"
        initial={{ opacity: 0, x: 30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, delay: 0.15 }}
      >
        {/* Theme toggle + optional header */}
        <div className="relative z-10 flex justify-end items-center gap-3 p-6 min-[900px]:p-8">
          <button
            onClick={toggleTheme}
            className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-700
                       hover:bg-slate-200 dark:hover:bg-slate-600
                       text-slate-500 dark:text-slate-400
                       hover:text-slate-900 dark:hover:text-white
                       border border-slate-200 dark:border-slate-600
                       transition-all duration-200"
            aria-label="Changer de thème"
          >
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          {rightHeader}
        </div>

        {/* Centered form container */}
        <div className="relative z-10 flex-1 flex items-center justify-center px-6 pb-8 min-[900px]:px-12">
          <div className="w-full max-w-md">{children}</div>
        </div>

        {/* Mobile branding (visible only on small screens) */}
        <div className="lg:hidden flex items-center justify-center gap-2 pb-6 text-xs text-slate-400">
          <Bot size={14} className="text-accent-500" />
          <span>MTS Telecom · Billcom Consulting</span>
        </div>
      </motion.div>
    </div>
  );
};

export default AuthLayout;
