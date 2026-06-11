import React from "react";

interface ReleasePanelProps {
  children: React.ReactNode;
}

export function ReleasePanel({ children }: ReleasePanelProps) {
  return (
    <div className="scholoPanel scholoPanelLeft">
      {children}
    </div>
  );
}
