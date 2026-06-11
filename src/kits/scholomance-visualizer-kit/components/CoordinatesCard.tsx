import React from "react";

interface CoordinatesCardProps {
  x: number;
  y: number;
  z: number;
}

export function CoordinatesCard({ x, y, z }: CoordinatesCardProps) {
  return (
    <div className="scholoCard">
      <span className="scholoOverline">COORDINATES</span>
      <div className="scholoCoordinates">
        <div className="scholoCoordinateRow">
          <span className="scholoCoordinateAxis">X</span>
          <span className="scholoCoordinateValue">{x.toFixed(2)}</span>
        </div>
        <div className="scholoCoordinateRow">
          <span className="scholoCoordinateAxis">Y</span>
          <span className="scholoCoordinateValue">{y.toFixed(2)}</span>
        </div>
        <div className="scholoCoordinateRow">
          <span className="scholoCoordinateAxis">Z</span>
          <span className="scholoCoordinateValue">{z.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
}
