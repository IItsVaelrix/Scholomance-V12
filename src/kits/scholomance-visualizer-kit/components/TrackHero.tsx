import React from "react";

interface TrackHeroProps {
  title: string;
  subtitle?: string;
}

export function TrackHero({ title, subtitle }: TrackHeroProps) {
  return (
    <div className="scholoHero">
      <h1 className="scholoHeroTitle">{title}</h1>
      {subtitle && <p className="scholoHeroSubtitle">{subtitle}</p>}
    </div>
  );
}
