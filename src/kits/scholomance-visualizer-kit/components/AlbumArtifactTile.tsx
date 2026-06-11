import React from "react";
import { FormatBadge } from "./FormatBadge";

interface AlbumArtifactTileProps {
  fallbackGlyph?: string;
  imageUrl?: string;
  formatBadges?: string[];
}

export function AlbumArtifactTile({ fallbackGlyph = "⟡", imageUrl, formatBadges }: AlbumArtifactTileProps) {
  return (
    <div className="scholoAlbumArtifact">
      <div className="scholoCoverTile">
        {imageUrl ? (
          <img src={imageUrl} alt="Album artwork" />
        ) : (
          <span aria-hidden>{fallbackGlyph}</span>
        )}
      </div>
      {formatBadges && formatBadges.length > 0 && (
        <div className="scholoFormatBadges">
          {formatBadges.map((badge) => (
            <FormatBadge key={badge} label={badge} />
          ))}
        </div>
      )}
    </div>
  );
}
