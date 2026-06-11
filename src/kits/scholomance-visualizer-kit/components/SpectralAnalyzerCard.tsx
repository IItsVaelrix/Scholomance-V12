import React, { useMemo } from "react";

interface SpectralAnalyzerCardProps {
  getByteFrequencyData?: (data: Uint8Array) => void;
  isPlaying?: boolean;
}

function generateSparklinePath(values: number[], height: number, width: number): string {
  if (values.length === 0) return "";
  const stepX = width / (values.length - 1);
  return values
    .map((v, i) => {
      const x = i * stepX;
      const y = height - v * height;
      return `${i === 0 ? "M" : "L"}${x},${y}`;
    })
    .join(" ");
}

export function SpectralAnalyzerCard({ getByteFrequencyData, isPlaying }: SpectralAnalyzerCardProps) {
  const bands = useMemo(() => {
    if (getByteFrequencyData && isPlaying) {
      const data = new Uint8Array(96);
      getByteFrequencyData(data);
      const low = Array.from(data.slice(0, 32)).map(v => v / 255);
      const mid = Array.from(data.slice(32, 64)).map(v => v / 255);
      const high = Array.from(data.slice(64, 96)).map(v => v / 255);
      return { low, mid, high };
    }
    const synthetic = Array.from({ length: 32 }, (_, i) => Math.max(0, 0.3 + 0.2 * Math.sin(i * 0.3)));
    return { low: synthetic, mid: synthetic, high: synthetic };
  }, [getByteFrequencyData, isPlaying]);

  return (
    <div className="scholoCard">
      <span className="scholoOverline">SPECTRAL</span>
      <div className="scholoSparklineStack">
        {(["low", "mid", "high"] as const).map((band) => (
          <svg
            key={band}
            className="scholoSparkline"
            data-band={band}
            preserveAspectRatio="none"
            viewBox={`0 0 ${bands[band].length} 1`}
          >
            <path d={generateSparklinePath(bands[band], 1, bands[band].length)} />
          </svg>
        ))}
      </div>
    </div>
  );
}
