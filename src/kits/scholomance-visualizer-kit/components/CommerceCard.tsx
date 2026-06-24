import React from "react";

interface CommerceCardProps {
  price: string;
  currency?: string;
  description?: string;
  onBuy?: () => void;
  onDownload?: () => void;
  buyEnabled?: boolean;
  downloadFormats?: string[];
}

export function CommerceCard({
  price,
  currency = "USD",
  description = "Includes unlimited streaming, high-quality FLAC/WAV download, and archive access.",
  onBuy,
  onDownload,
  buyEnabled = true,
  downloadFormats,
}: CommerceCardProps) {
  return (
    <div className="scholoCommerceCard">
      <span className="scholoOverline scholoGoldOverline">OWN THIS RELEASE</span>
      <p className="scholoPrice">
        {price} <span style={{ fontSize: "0.6em", color: "var(--scholo-on-surface-medium)" }}>{currency}</span>
      </p>
      <p className="scholoCommerceDescription">{description}</p>
      <div className="scholoCommerceActions">
        <button
          className="scholoPrimaryAction"
          onClick={onBuy}
          disabled={!buyEnabled}
          aria-label={`Buy for ${price} ${currency}`}
        >
          BUY NOW - {price}
        </button>
        {downloadFormats && downloadFormats.length > 0 && (
          <button className="scholoSecondaryAction" onClick={onDownload} aria-label="Download">
            DOWNLOAD - {downloadFormats.join(", ")}
          </button>
        )}
      </div>
    </div>
  );
}
