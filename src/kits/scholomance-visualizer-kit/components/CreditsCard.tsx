import React from "react";

interface CreditEntry {
  role: string;
  name: string;
}

interface CreditsCardProps {
  credits: CreditEntry[];
}

export function CreditsCard({ credits }: CreditsCardProps) {
  return (
    <div className="scholoCard">
      <span className="scholoOverline">CREDITS</span>
      <div className="scholoCreditGrid">
        {credits.map((credit) => (
          <div key={credit.role} className="scholoCreditItem">
            <div style={{ fontSize: "var(--scholo-micro)", color: "var(--scholo-on-surface-low)", letterSpacing: "0.12em", textTransform: "uppercase" }}>
              {credit.role}
            </div>
            <div style={{ marginTop: "var(--scholo-space-1)", color: "var(--scholo-on-surface-high)" }}>
              {credit.name}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
