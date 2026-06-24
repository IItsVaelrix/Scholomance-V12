import React, { useMemo } from 'react';
import { buildSigilModel, polygonPoints, stopToCss, type VisualGenome } from './genomeGeometry';

interface GenomeSigilProps {
  genome: VisualGenome;
  size?: number;
  /** 0..1 playback pulse (from the sidecar at play time). Static when omitted. */
  pulse?: number;
  className?: string;
}

/**
 * Deterministic sacred-geometry render of a track's visual genome - the right
 * page of the Grimoire. Pure SVG built from the genome model, so it renders
 * byte-identical on every device with no Web Audio / FFT dependency. `pulse`
 * (optional) scales the core glow when a live sidecar is driving it.
 */
export const GenomeSigil: React.FC<GenomeSigilProps> = ({ genome, size = 600, pulse = 0, className }) => {
  const model = useMemo(() => buildSigilModel(genome, size), [genome, size]);
  const { cx, cy, palette } = model;
  const accent = palette[0] || 'hsl(280 80% 60%)';
  const accent2 = palette[1] || accent;
  const glow = 0.35 + Math.min(1, Math.max(0, pulse)) * 0.65;

  return (
    <svg
      className={className}
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label={`Deterministic visual genome ${genome.checksum}`}
      data-genome-checksum={genome.checksum}
      data-archetype={genome.archetype}
    >
      <defs>
        <radialGradient id={`coreGlow-${genome.checksum}`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={accent2} stopOpacity={glow} />
          <stop offset="100%" stopColor={accent2} stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* central glow */}
      <circle cx={cx} cy={cy} r={model.coreRadius * 2.4} fill={`url(#coreGlow-${genome.checksum})`} />

      {/* concentric rings (one per layer) */}
      {model.rings.map((ring, i) => (
        <circle
          key={`ring-${i}`}
          cx={cx}
          cy={cy}
          r={ring.r}
          fill="none"
          stroke={ring.color}
          strokeWidth={ring.strokeWidth}
          strokeDasharray={ring.dash ?? undefined}
          opacity={0.55}
        />
      ))}

      {/* radial spokes (symmetry) */}
      {model.spokes.map((s, i) => (
        <line key={`spoke-${i}`} x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2} stroke={s.color} strokeWidth={0.75} opacity={0.4} />
      ))}

      {/* central nested polygons - eye-in-triangle motif */}
      <polygon
        points={polygonPoints(cx, cy, model.coreRadius, model.coreSides, genome.baseHue % 60)}
        fill="none"
        stroke={accent}
        strokeWidth={1.5}
        opacity={0.9}
      />
      <polygon
        points={polygonPoints(cx, cy, model.coreRadius * 0.6, model.coreSides, (genome.baseHue % 60) + 180)}
        fill="none"
        stroke={accent2}
        strokeWidth={1}
        opacity={0.8}
      />
      <circle cx={cx} cy={cy} r={model.coreRadius * 0.22} fill={accent} opacity={0.85} />

      {/* glyph inscriptions around the outer ring */}
      {model.glyphMarks.map((g, i) => (
        <text
          key={`glyph-${i}`}
          x={g.x}
          y={g.y}
          fontSize={g.size}
          fill={g.color}
          textAnchor="middle"
          dominantBaseline="central"
          opacity={0.85}
        >
          {g.glyph}
        </text>
      ))}
    </svg>
  );
};

export { stopToCss };
export default GenomeSigil;
