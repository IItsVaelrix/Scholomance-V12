import React from "react";

interface IconButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  ariaLabel?: string;
  className?: string;
}

export function IconButton({ children, onClick, disabled, ariaLabel, className = "" }: IconButtonProps) {
  return (
    <button
      className={`scholoIconButton ${className}`}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      type="button"
    >
      {children}
    </button>
  );
}
