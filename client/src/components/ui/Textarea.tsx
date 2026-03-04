import React from "react";

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helper?: string;
  fullWidth?: boolean;
}

const Textarea: React.FC<TextareaProps> = ({
  label,
  error,
  helper,
  fullWidth = true,
  className = "",
  id,
  rows = 4,
  ...rest
}) => {
  const textareaId = id || label?.toLowerCase().replace(/\s+/g, "-");

  return (
    <div className={fullWidth ? "w-full" : ""}>
      {label && (
        <label htmlFor={textareaId} className="block text-sm font-medium text-ds-primary mb-1.5">
          {label}
        </label>
      )}
      <textarea
        id={textareaId}
        rows={rows}
        className={`block rounded-xl border border-ds-border bg-ds-card text-ds-primary placeholder-ds-muted text-sm
          transition-all duration-200 px-3.5 py-2.5
          focus:ring-2 focus:ring-primary-400/30 focus:border-primary-500
          disabled:opacity-50 disabled:cursor-not-allowed resize-y
          ${fullWidth ? "w-full" : ""}
          ${error ? "border-error-500 focus:ring-error-500/30 focus:border-error-500" : "hover:border-ds-muted/50"}
          ${className}`}
        {...rest}
      />
      {error && <p className="mt-1.5 text-xs text-error-500">{error}</p>}
      {!error && helper && <p className="mt-1.5 text-xs text-ds-muted">{helper}</p>}
    </div>
  );
};

export default Textarea;
