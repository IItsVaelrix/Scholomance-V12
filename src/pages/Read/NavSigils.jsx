export function EditorSigil({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 2L20 8L12 14L4 8Z"/>
      <line x1="12" y1="8" x2="12" y2="21"/>
      <line x1="9" y1="11" x2="15" y2="11"/>
    </svg>
  );
}

export function ScrollsSigil({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="4" cy="12" r="2.5"/>
      <circle cx="20" cy="12" r="2.5"/>
      <rect x="6.5" y="7" width="11" height="10" rx="0.5"/>
      <line x1="9" y1="11" x2="15" y2="11"/>
      <line x1="9" y1="14" x2="13" y2="14"/>
    </svg>
  );
}

export function OracleSigil({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 12C2 12 6 4 12 4s10 8 10 8-4 8-10 8S2 12 2 12z"/>
      <circle cx="12" cy="12" r="3"/>
      <line x1="12" y1="9" x2="12" y2="15"/>
    </svg>
  );
}

export function HexSigil({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polygon points="12,2 20.66,7 20.66,17 12,22 3.34,17 3.34,7"/>
      <path d="M12 8L13.5 11.5L17 12L13.5 12.5L12 16L10.5 12.5L7 12L10.5 11.5Z"/>
    </svg>
  );
}

export function PowerSigil({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9"/>
      <path d="M13 6L9 13L12 13L11 18L15 11L12 11Z"/>
    </svg>
  );
}

const SIGILS = {
  EDITOR:  EditorSigil,
  SCROLLS: ScrollsSigil,
  ORACLE:  OracleSigil,
  HEX:     HexSigil,
  POWER:   PowerSigil,
};

export function NavSigil({ tab, className }) {
  const Component = SIGILS[tab];
  return Component ? <Component className={className} /> : null;
}
