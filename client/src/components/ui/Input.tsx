// =============================================================================
// MTS TELECOM - Design system: Input (Soft AI SaaS)
// =============================================================================

import React from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

const Input: React.FC<InputProps> = ({
  label,
  error,
  icon,
  leftIcon,
  rightIcon,
  fullWidth = true,
  className = "",
  id,
  ...rest
}) => {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");
  const hasLeft = icon || leftIcon;
  return (
    <div className={fullWidth ? "w-full" : ""}>
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-ds-primary mb-1.5">
          {label}
        </label>
      )}
      <div className="relative">
        {hasLeft && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ds-muted pointer-events-none">
            {leftIcon || icon}
          </span>
        )}
        <input
          id={inputId}
          className={`block rounded-xl border border-ds-border bg-ds-card text-ds-primary placeholder-ds-muted text-sm transition-all duration-200
            focus:ring-2 focus:ring-primary-400/30 focus:border-primary-500
            disabled:opacity-50 disabled:cursor-not-allowed
            ${hasLeft ? "pl-10" : "pl-3.5"} ${rightIcon ? "pr-10" : "pr-3.5"} py-2.5
            ${fullWidth ? "w-full" : ""}
            ${error ? "border-error-500 focus:ring-error-500/30 focus:border-error-500" : "hover:border-ds-muted/50"}
            ${className}`}
          {...rest}
        />
        {rightIcon && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-ds-muted">
            {rightIcon}
          </span>
        )}
      </div>
      {error && <p className="mt-1.5 text-xs text-error-500">{error}</p>}
    </div>
  );
};

export default Input;
