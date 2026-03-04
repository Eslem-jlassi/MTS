import React from "react";

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "children"> {
  label?: string;
  error?: string;
  helper?: string;
  options: SelectOption[];
  placeholder?: string;
  fullWidth?: boolean;
}

const Select: React.FC<SelectProps> = ({
  label,
  error,
  helper,
  options,
  placeholder,
  fullWidth = true,
  className = "",
  id,
  ...rest
}) => {
  const selectId = id || label?.toLowerCase().replace(/\s+/g, "-");

  return (
    <div className={fullWidth ? "w-full" : ""}>
      {label && (
        <label htmlFor={selectId} className="block text-sm font-medium text-ds-primary mb-1.5">
          {label}
        </label>
      )}
      <select
        id={selectId}
        className={`block rounded-xl border border-ds-border bg-ds-card text-ds-primary text-sm
          transition-all duration-200 px-3.5 py-2.5
          focus:ring-2 focus:ring-primary-400/30 focus:border-primary-500
          disabled:opacity-50 disabled:cursor-not-allowed
          ${fullWidth ? "w-full" : ""}
          ${error ? "border-error-500 focus:ring-error-500/30 focus:border-error-500" : "hover:border-ds-muted/50"}
          ${className}`}
        {...rest}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && <p className="mt-1.5 text-xs text-error-500">{error}</p>}
      {!error && helper && <p className="mt-1.5 text-xs text-ds-muted">{helper}</p>}
    </div>
  );
};

export default Select;
