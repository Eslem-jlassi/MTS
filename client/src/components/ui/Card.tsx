// =============================================================================
// MTS TELECOM - Design system: Card (Premium SaaS)
// =============================================================================

import React from "react";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  padding?: "none" | "sm" | "md" | "lg";
  children: React.ReactNode;
}

const paddingClasses: Record<string, string> = {
  none: "",
  sm: "p-4",
  md: "p-5",
  lg: "p-6",
};

const Card: React.FC<CardProps> = ({ padding = "md", className = "", children, ...rest }) => {
  return (
    <div className={`ds-panel ${paddingClasses[padding]} ${className}`} {...rest}>
      {children}
    </div>
  );
};

export default Card;
