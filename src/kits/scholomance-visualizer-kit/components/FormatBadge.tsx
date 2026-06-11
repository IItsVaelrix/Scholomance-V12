import React from "react";

interface FormatBadgeProps {
  label: string;
  className?: string;
}

export function FormatBadge({ label, className = "" }: FormatBadgeProps) {
  return (
    <span className={`scholoFormatBadge ${className}`}>
      {label}
    </span>
  );
}
