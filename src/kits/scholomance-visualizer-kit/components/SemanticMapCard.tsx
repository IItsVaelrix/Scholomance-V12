import React from "react";

interface SemanticTag {
  label: string;
  description: string;
  active?: boolean;
}

interface SemanticMapCardProps {
  tags: SemanticTag[];
  onTagClick?: (label: string) => void;
}

export function SemanticMapCard({ tags, onTagClick }: SemanticMapCardProps) {
  return (
    <div className="scholoCard">
      <span className="scholoOverline">SEMANTIC MAP</span>
      <ul className="scholoSemanticList" role="list" aria-label="Semantic tags">
        {tags.map((tag) => (
          <li
            key={tag.label}
            className="scholoSemanticItem"
            data-active={tag.active ? "true" : undefined}
            onClick={() => onTagClick?.(tag.label)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onTagClick?.(tag.label);
              }
            }}
            aria-label={`${tag.label}: ${tag.description}`}
            title={tag.description}
          >
            <span>{tag.label}</span>
            <span className="scholoSemanticNode" />
          </li>
        ))}
      </ul>
    </div>
  );
}
