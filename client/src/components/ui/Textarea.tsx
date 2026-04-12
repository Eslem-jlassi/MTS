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
        <label htmlFor={textareaId} className="ds-control-label">
          {label}
        </label>
      )}
      <textarea
        id={textareaId}
        rows={rows}
        className={`ds-control block text-sm px-3.5 py-2.5
          disabled:opacity-50 disabled:cursor-not-allowed resize-y
          ${fullWidth ? "w-full" : ""}
          ${error ? "ds-control-invalid" : ""}
          ${className}`}
        {...rest}
      />
      {error && <p className="ds-control-error-text">{error}</p>}
      {!error && helper && <p className="ds-control-helper">{helper}</p>}
    </div>
  );
};

export default Textarea;
