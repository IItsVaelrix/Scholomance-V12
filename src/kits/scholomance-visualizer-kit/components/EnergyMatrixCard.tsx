import React from "react";

interface EnergyMatrixCardProps {
  matrix?: number[][];
}

export function EnergyMatrixCard({ matrix }: EnergyMatrixCardProps) {
  const cells = matrix ?? [
    [0.2, 0.4, 0.7, 1.0, 0.6, 0.3, 0.2],
    [0.3, 0.8, 0.5, 0.4, 0.9, 0.6, 0.2],
  ];

  const flattened = cells.flat();

  return (
    <div className="scholoCard">
      <span className="scholoOverline">ENERGY MATRIX</span>
      <div className="scholoEnergyMatrix" role="img" aria-label="Energy matrix visualization">
        {flattened.map((value, i) => (
          <div
            key={i}
            className="scholoEnergyDot"
            style={{ "--energy": value } as React.CSSProperties}
            data-critical={value > 0.85 ? "true" : undefined}
          />
        ))}
      </div>
    </div>
  );
}
