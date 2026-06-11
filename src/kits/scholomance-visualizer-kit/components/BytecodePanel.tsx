import React from "react";

interface BytecodePanelProps {
  children: React.ReactNode;
}

export function BytecodePanel({ children }: BytecodePanelProps) {
  return (
    <div className="scholoPanel">
      {children}
    </div>
  );
}
