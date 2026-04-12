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
        <label htmlFor={selectId} className="ds-control-label">
          {label}
        </label>
      )}
      <select
        id={selectId}
        className={`ds-control block bg-ds-card text-sm px-3.5 py-2.5
          ${fullWidth ? "w-full" : ""}
          ${error ? "ds-control-invalid" : ""}
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
      {error && <p className="ds-control-error-text">{error}</p>}
      {!error && helper && <p className="ds-control-helper">{helper}</p>}
    </div>
  );
};

export default Select;
