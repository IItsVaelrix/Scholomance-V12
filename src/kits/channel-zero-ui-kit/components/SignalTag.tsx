export type SignalKind = 'featured' | 'skill' | 'verdict' | 'essay' | 'whitepaper';

export type SignalTagProps = {
  children: string;
  kind?: SignalKind;
  href?: string;
};

const TAG_COLOR: Record<SignalKind, string> = {
  featured: 'var(--cz-featured)',
  skill: 'var(--cz-skill)',
  verdict: 'var(--cz-verdict)',
  essay: 'var(--cz-essay)',
  whitepaper: 'var(--cz-whitepaper)',
};

export function SignalTag({ children, kind = 'essay', href }: SignalTagProps) {
  const style = { '--tag-color': TAG_COLOR[kind] } as React.CSSProperties;

  if (href) {
    return (
      <a className="cz-tag" href={href} style={style}>
        {children}
      </a>
    );
  }

  return (
    <span className="cz-tag" style={style}>
      {children}
    </span>
  );
}
