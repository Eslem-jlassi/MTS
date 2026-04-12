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
        <label htmlFor={inputId} className="ds-control-label">
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
          className={`ds-control block text-sm
            ${hasLeft ? "pl-10" : "pl-3.5"} ${rightIcon ? "pr-10" : "pr-3.5"} py-2.5
            ${fullWidth ? "w-full" : ""}
            ${error ? "ds-control-invalid" : ""}
            ${className}`}
          {...rest}
        />
        {rightIcon && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-ds-muted">
            {rightIcon}
          </span>
        )}
      </div>
      {error && <p className="ds-control-error-text">{error}</p>}
    </div>
  );
};

export default Input;
