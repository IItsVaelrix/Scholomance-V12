import React from "react";

interface ProvenanceCardProps {
  humanIntent: string;
  tools: string[];
  assistance: string[];
  masteringChain?: string[];
}

export function ProvenanceCard({ humanIntent, tools, assistance, masteringChain }: ProvenanceCardProps) {
  return (
    <div className="scholoCard">
      <span className="scholoOverline">PROVENANCE</span>
      <div className="scholoProvenanceBody">
        <p><strong>Intent:</strong> {humanIntent}</p>
        <p><strong>Tools:</strong> {tools.join(", ")}</p>
        <p><strong>Assistance:</strong> {assistance.join(", ")}</p>
        {masteringChain && masteringChain.length > 0 && (
          <p><strong>Mastering:</strong> {masteringChain.join(" → ")}</p>
        )}
      </div>
    </div>
  );
}
