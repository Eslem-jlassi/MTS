// =============================================================================
// MTS TELECOM - Design system: Button (Soft AI SaaS)
// =============================================================================

import React from "react";

export type ButtonVariant = "primary" | "secondary" | "danger" | "ghost" | "outline";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: "sm" | "md" | "lg";
  icon?: React.ReactNode;
  iconPosition?: "left" | "right";
  loading?: boolean;
  fullWidth?: boolean;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "border border-primary-600 bg-primary-600 text-white shadow-soft hover:border-primary-700 hover:bg-primary-700 hover:shadow-card-hover active:bg-primary-800 focus:ring-primary-400/30 dark:border-primary-500 dark:bg-primary-500 dark:hover:border-primary-400 dark:hover:bg-primary-400",
  secondary:
    "border border-ds-border bg-ds-elevated/80 text-ds-secondary shadow-soft hover:border-primary-300/40 hover:bg-ds-surface hover:text-ds-primary focus:ring-primary-400/20",
  danger:
    "border border-error-500 bg-error-500 text-white shadow-soft hover:border-error-600 hover:bg-error-600 active:bg-error-700 focus:ring-error-500/30",
  ghost:
    "border border-transparent bg-transparent text-ds-secondary hover:bg-ds-elevated/70 hover:text-ds-primary focus:ring-primary-400/20",
  outline:
    "border border-ds-border bg-ds-card/70 text-ds-secondary shadow-soft hover:border-primary-300/50 hover:bg-ds-elevated/65 hover:text-ds-primary focus:ring-primary-400/20",
};

const sizeClasses = {
  sm: "min-h-[2.1rem] px-3 py-1.5 text-xs gap-1.5",
  md: "min-h-[2.5rem] px-4 py-2 text-sm gap-2",
  lg: "min-h-[2.85rem] px-5 py-2.5 text-sm gap-2",
};

const Button: React.FC<ButtonProps> = ({
  variant = "primary",
  size = "md",
  icon,
  iconPosition = "left",
  loading = false,
  fullWidth,
  className = "",
  disabled,
  children,
  ...rest
}) => {
  const base =
    "inline-flex items-center justify-center rounded-xl font-semibold tracking-[-0.01em] transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-ds-card disabled:cursor-not-allowed disabled:opacity-55 disabled:shadow-none";
  const cls = [
    base,
    variantClasses[variant],
    sizeClasses[size],
    fullWidth ? "w-full" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button className={cls} disabled={disabled || loading} {...rest}>
      {loading && (
        <svg
          className="animate-spin h-4 w-4"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      )}
      {!loading && icon && iconPosition === "left" && icon}
      {children && <span>{children}</span>}
      {!loading && icon && iconPosition === "right" && icon}
    </button>
  );
};

export default Button;
