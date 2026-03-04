// =============================================================================
// MTS TELECOM - Design system: Skeleton loading
// =============================================================================

import React from "react";

interface SkeletonProps {
  className?: string;
  variant?: "text" | "circular" | "rectangular";
  width?: string | number;
  height?: string | number;
}

const Skeleton: React.FC<SkeletonProps> = ({
  className = "",
  variant = "rectangular",
  width,
  height,
}) => {
  const base = "animate-pulse bg-ds-elevated rounded";
  const variantClass =
    variant === "circular"
      ? "rounded-full"
      : variant === "text"
      ? "rounded h-4"
      : "rounded-lg";
  const style: React.CSSProperties = {};
  if (width) style.width = typeof width === "number" ? `${width}px` : width;
  if (height) style.height = typeof height === "number" ? `${height}px` : height;

  return (
    <div
      className={`${base} ${variantClass} ${className}`}
      style={style}
    />
  );
};

export function SkeletonCard() {
  return (
    <div className="bg-ds-card rounded-xl border border-ds-border p-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2 flex-1">
          <Skeleton variant="text" width="40%" />
          <Skeleton variant="text" width="60%" height={28} />
        </div>
        <Skeleton variant="circular" width={48} height={48} />
      </div>
    </div>
  );
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="bg-ds-card rounded-xl border border-ds-border overflow-hidden">
      <div className="p-4 border-b border-ds-border flex gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} variant="text" width={`${80 + i * 20}px`} height={16} />
        ))}
      </div>
      <div className="divide-y divide-ds-border">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="p-4 flex gap-4 items-center">
            <Skeleton variant="circular" width={40} height={40} />
            <Skeleton variant="text" width="25%" />
            <Skeleton variant="text" width="30%" />
            <Skeleton variant="text" width="20%" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default Skeleton;
