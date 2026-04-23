// =============================================================================
// MTS TELECOM - Tailwind CSS Configuration
// Soft AI SaaS Design System: Blue primary, indigo accent, neutral B2B surfaces
// =============================================================================

const defaultTheme = require("tailwindcss/defaultTheme");

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}", "./public/index.html"],
  darkMode: "class",
  theme: {
    extend: {
      /* ------------------------------------------------------------------ */
      /*  COLORS                                                            */
      /* ------------------------------------------------------------------ */
      colors: {
        /* ---- Semantic surface tokens (CSS custom properties) ---- */
        ds: {
          page:      "rgb(var(--ds-page)      / <alpha-value>)",
          card:      "rgb(var(--ds-card)      / <alpha-value>)",
          surface:   "rgb(var(--ds-surface)   / <alpha-value>)",
          elevated:  "rgb(var(--ds-elevated)  / <alpha-value>)",
          border:    "rgb(var(--ds-border)    / <alpha-value>)",
          primary:   "rgb(var(--ds-primary)   / <alpha-value>)",
          secondary: "rgb(var(--ds-secondary) / <alpha-value>)",
          muted:     "rgb(var(--ds-muted)     / <alpha-value>)",
        },

        /* ---- Primary: Indigo ---- */
        primary: {
          DEFAULT: "rgb(var(--color-primary) / <alpha-value>)",
          50:  "#EEF2FF",
          100: "#E0E7FF",
          200: "#C7D2FE",
          300: "#A5B4FC",
          400: "#818CF8",
          500: "#6366F1",
          600: "#4F46E5",
          700: "#4338CA",
          800: "#3730A3",
          900: "#312E81",
          950: "#1E1B4B",
        },

        /* ---- Accent: Indigo support (identity / premium emphasis) ---- */
        accent: {
          DEFAULT: "rgb(var(--color-accent) / <alpha-value>)",
          50:  "#F5F7FF",
          100: "#E8EDFF",
          200: "#D7DEFF",
          300: "#BBC8FF",
          400: "#96A4FF",
          500: "#6366F1",
          600: "#4F46E5",
          700: "#4338CA",
          800: "#3730A3",
          900: "#312E81",
        },

        /* ---- Semantic status ---- */
        success: {
          DEFAULT: "#10B981",
          50: "#ECFDF5", 100: "#D1FAE5", 200: "#A7F3D0",
          300: "#6EE7B7", 400: "#34D399",
          500: "#10B981", 600: "#059669", 700: "#047857",
          800: "#065F46", 900: "#064E3B",
        },
        warning: {
          DEFAULT: "#F59E0B",
          50: "#FFFBEB", 100: "#FEF3C7", 200: "#FDE68A",
          300: "#FCD34D", 400: "#FBBF24",
          500: "#F59E0B", 600: "#D97706", 700: "#B45309",
          800: "#92400E", 900: "#78350F",
        },
        error: {
          DEFAULT: "rgb(var(--color-error) / <alpha-value>)",
          50: "#FEF2F2", 100: "#FEE2E2", 200: "#FECACA",
          300: "#FCA5A5", 400: "#F87171",
          500: "#EF4444", 600: "#DC2626", 700: "#B91C1C",
          800: "#991B1B", 900: "#7F1D1D",
        },
        info: {
          DEFAULT: "rgb(var(--color-info) / <alpha-value>)",
          50: "#F0F9FF", 100: "#E0F2FE", 200: "#BAE6FD",
          300: "#7DD3FC", 400: "#38BDF8",
          500: "#0EA5E9", 600: "#0284C7", 700: "#0369A1",
          800: "#075985", 900: "#0C4A6E",
        },
        ai: {
          DEFAULT: "rgb(var(--color-ai) / <alpha-value>)",
          50: "#F5F3FF", 100: "#EDE9FE", 200: "#DDD6FE",
          300: "#C4B5FD", 400: "#A78BFA",
          500: "#8B5CF6", 600: "#7C3AED", 700: "#6D28D9",
          800: "#5B21B6", 900: "#4C1D95",
        },
      },

      /* ------------------------------------------------------------------ */
      /*  TYPOGRAPHY                                                        */
      /* ------------------------------------------------------------------ */
      fontFamily: {
        sans: ["Inter", ...defaultTheme.fontFamily.sans],
      },
      fontSize: {
        "h1": ["1.875rem", { lineHeight: "2.25rem", fontWeight: "700" }],
        "h2": ["1.5rem",   { lineHeight: "2rem",    fontWeight: "600" }],
        "h3": ["1.25rem",  { lineHeight: "1.75rem", fontWeight: "600" }],
        "h4": ["1.125rem", { lineHeight: "1.5rem",  fontWeight: "600" }],
      },

      /* ------------------------------------------------------------------ */
      /*  SPACING (8px base)                                                */
      /* ------------------------------------------------------------------ */
      spacing: {
        "4.5": "1.125rem",
        "13":  "3.25rem",
        "15":  "3.75rem",
        "18":  "4.5rem",
        "88":  "22rem",
        "sidebar": "260px",
        "sidebar-collapsed": "72px",
      },

      /* ------------------------------------------------------------------ */
      /*  BORDER RADIUS                                                     */
      /* ------------------------------------------------------------------ */
      borderRadius: {
        DEFAULT: "12px",
        sm:  "8px",
        md:  "10px",
        lg:  "12px",
        xl:  "14px",
        "2xl": "16px",
        "3xl": "20px",
      },

      /* ------------------------------------------------------------------ */
      /*  BOX SHADOW                                                        */
      /* ------------------------------------------------------------------ */
      boxShadow: {
        "soft":        "0 2px 8px -2px rgba(0,0,0,0.06), 0 1px 2px -1px rgba(0,0,0,0.03)",
        "soft-lg":     "0 8px 24px -8px rgba(0,0,0,0.10), 0 4px 8px -4px rgba(0,0,0,0.05)",
        "card":        "0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06)",
        "card-hover":  "0 4px 16px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.04)",
        "sidebar":     "4px 0 24px -4px rgba(0,0,0,0.12)",
        "elevated":    "0 4px 12px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.04)",
        "dropdown":    "0 10px 32px -4px rgba(0,0,0,0.12), 0 4px 8px -2px rgba(0,0,0,0.06)",
      },

      /* ------------------------------------------------------------------ */
      /*  ANIMATIONS                                                        */
      /* ------------------------------------------------------------------ */
      keyframes: {
        "fade-in": {
          "0%":   { opacity: "0", transform: "translateY(4px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "slide-in-right": {
          "0%":   { transform: "translateX(100%)" },
          "100%": { transform: "translateX(0)" },
        },
        "scale-in": {
          "0%":   { opacity: "0", transform: "scale(0.96)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
      },
      animation: {
        "fade-in":        "fade-in 0.3s ease-out",
        "slide-in-right": "slide-in-right 0.3s ease-out",
        "scale-in":       "scale-in 0.2s ease-out",
      },

      /* ------------------------------------------------------------------ */
      /*  TRANSITIONS                                                       */
      /* ------------------------------------------------------------------ */
      transitionDuration: {
        DEFAULT: "200ms",
      },
    },
  },
  plugins: [
    require("@tailwindcss/forms")({
      strategy: "class",
    }),
  ],
};
