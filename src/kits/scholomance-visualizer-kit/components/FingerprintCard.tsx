import React from "react";

interface FingerprintCardProps {
  fingerprint: string;
  checksum: string;
}

export function FingerprintCard({ fingerprint, checksum }: FingerprintCardProps) {
  return (
    <div className="scholoCard">
      <span className="scholoOverline">FINGERPRINT</span>
      <div className="scholoFingerprint">{fingerprint}</div>
      <div className="scholoChecksum">{checksum}</div>
    </div>
  );
}
