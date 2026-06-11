import React from "react";

interface SigilGlyphProps {
  seed?: string;
  size?: number;
  className?: string;
}

function hashSimple(input: string): number {
  let h = 0;
  for (let i = 0; i < input.length; i++) {
    h = ((h << 5) - h) + input.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

export function SigilGlyph({ seed = "⟡", size = 64, className = "" }: SigilGlyphProps) {
  const h = hashSimple(seed);
  const sides = 5 + (h % 4);
  const rotation = h % 360;
  const strokeColor = h % 3 === 0 ? "var(--scholo-primary)"
    : h % 3 === 1 ? "var(--scholo-secondary)"
    : "var(--scholo-tertiary)";

  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.38;

  const points = Array.from({ length: sides }, (_, i) => {
    const angle = (i / sides) * Math.PI * 2 - Math.PI / 2 + (rotation * Math.PI) / 180;
    return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`;
  }).join(" ");

  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      aria-label="Sigil glyph"
      role="img"
    >
      <polygon
        points={points}
        fill="none"
        stroke={strokeColor}
        strokeWidth="1.5"
        opacity="0.85"
      />
      <circle
        cx={cx}
        cy={cy}
        r={r * 0.35}
        fill="none"
        stroke={strokeColor}
        strokeWidth="1"
        opacity="0.5"
      />
    </svg>
  );
}
