import React from "react";

interface VisualizerShellProps {
  children: React.ReactNode;
}

export function VisualizerShell({ children }: VisualizerShellProps) {
  return (
    <div className="scholoVisualizerShell">
      {children}
    </div>
  );
}
