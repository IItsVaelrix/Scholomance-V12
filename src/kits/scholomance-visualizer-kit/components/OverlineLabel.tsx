import React from "react";

interface OverlineLabelProps {
  children: React.ReactNode;
  variant?: "default" | "gold" | "magenta";
}

export function OverlineLabel({ children, variant = "default" }: OverlineLabelProps) {
  const cls = variant === "gold"
    ? "scholoOverline scholoGoldOverline"
    : variant === "magenta"
    ? "scholoOverline scholoMagentaOverline"
    : "scholoOverline";

  return <span className={cls}>{children}</span>;
}
