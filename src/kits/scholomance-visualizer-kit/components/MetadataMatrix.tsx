import React from "react";

interface MetadataRow {
  key: string;
  value: string;
}

interface MetadataMatrixProps {
  rows: MetadataRow[];
}

export function MetadataMatrix({ rows }: MetadataMatrixProps) {
  return (
    <div className="scholoMetadataMatrix">
      {rows.map((row) => (
        <div key={row.key} className="scholoMetaRow">
          <span className="scholoMetaKey">{row.key}</span>
          <span className="scholoMetaValue">{row.value}</span>
        </div>
      ))}
    </div>
  );
}
