// =============================================================================
// MTS TELECOM - Design Tokens
// Soft AI SaaS: Indigo primary, minimal Orange accent
// =============================================================================

export interface DesignTokens {
  colors: {
    primary: string;
    primaryDark: string;
    primaryLight: string;
    accent: string;
    accentDark: string;
    ai: string;
    aiDark: string;
    success: string;
    warning: string;
    danger: string;
    info: string;
    background: string;
    surface: string;
    surfaceMuted: string;
    border: string;
    borderStrong: string;
    textPrimary: string;
    textSecondary: string;
    textMuted: string;
  };
  spacing: {
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
    xxl: string;
  };
  borderRadius: {
    sm: string;
    md: string;
    lg: string;
    xl: string;
    full: string;
  };
  fontSizes: {
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
    xxl: string;
  };
  shadows: {
    sm: string;
    md: string;
    lg: string;
  };
}

export const designTokens: DesignTokens = {
  colors: {
    primary: "#2563EB", // Blue-600
    primaryDark: "#1D4ED8", // Blue-700
    primaryLight: "#60A5FA", // Blue-400
    accent: "#6366F1", // Indigo-500
    accentDark: "#4338CA", // Indigo-700
    ai: "#7C3AED", // Violet-600
    aiDark: "#6D28D9", // Violet-700
    success: "#10B981", // Emerald-500
    warning: "#F59E0B", // Amber-500
    danger: "#EF4444", // Red-500
    info: "#0EA5E9", // Sky-500
    background: "#F8FAFC", // Slate-50
    surface: "#FFFFFF",
    surfaceMuted: "#F1F5F9", // Slate-100
    border: "#E2E8F0", // Slate-200
    borderStrong: "#CBD5E1", // Slate-300
    textPrimary: "#0F172A", // Slate-900
    textSecondary: "#334155", // Slate-700
    textMuted: "#64748B", // Slate-500
  },
  spacing: {
    xs: "0.25rem",
    sm: "0.5rem",
    md: "1rem",
    lg: "1.5rem",
    xl: "2rem",
    xxl: "3rem",
  },
  borderRadius: {
    sm: "0.5rem",
    md: "0.625rem",
    lg: "0.75rem",
    xl: "0.875rem",
    full: "9999px",
  },
  fontSizes: {
    xs: "0.75rem",
    sm: "0.875rem",
    md: "1rem",
    lg: "1.125rem",
    xl: "1.25rem",
    xxl: "1.5rem",
  },
  shadows: {
    sm: "0 2px 8px -2px rgba(0,0,0,0.06), 0 1px 2px -1px rgba(0,0,0,0.03)",
    md: "0 4px 12px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.04)",
    lg: "0 8px 24px -8px rgba(0,0,0,0.10), 0 4px 8px -4px rgba(0,0,0,0.05)",
  },
};
