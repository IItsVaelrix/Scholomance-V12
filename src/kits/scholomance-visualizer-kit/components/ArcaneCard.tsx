import React from "react";

interface ArcaneCardProps {
  children: React.ReactNode;
  className?: string;
  state?: "default" | "active" | "locked";
}

export function ArcaneCard({ children, className = "", state = "default" }: ArcaneCardProps) {
  const stateAttr = state === "default" ? undefined : state;
  return (
    <div
      className={`scholoCard ${className}`}
      data-state={stateAttr}
    >
      {children}
    </div>
  );
}
