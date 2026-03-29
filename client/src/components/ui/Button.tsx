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
    "bg-primary-600 text-white hover:bg-primary-700 active:bg-primary-800 focus:ring-primary-400/40 shadow-sm hover:shadow-md dark:bg-primary-500 dark:hover:bg-primary-400 dark:text-white",
  secondary:
    "bg-ds-elevated text-ds-secondary hover:bg-ds-border hover:text-ds-primary focus:ring-ds-border",
  danger: "bg-error-500 text-white hover:bg-error-600 active:bg-error-700 focus:ring-error-500/40",
  ghost:
    "bg-transparent text-ds-secondary hover:bg-ds-elevated hover:text-ds-primary focus:ring-ds-border",
  outline:
    "border border-ds-border bg-transparent text-ds-secondary hover:bg-ds-elevated hover:text-ds-primary hover:border-primary-400/50 focus:ring-primary-400/30",
};

const sizeClasses = {
  sm: "px-3 py-1.5 text-xs gap-1.5",
  md: "px-4 py-2 text-sm gap-2",
  lg: "px-5 py-2.5 text-sm gap-2",
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
    "inline-flex items-center justify-center font-medium rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-ds-card disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none";
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
