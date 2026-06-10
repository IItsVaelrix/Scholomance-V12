import { SignalTag, type SignalKind } from './SignalTag';

// Deterministic kind → procedural sigil map (kit guardrail: map type to a named
// sigil, never store asset paths on posts, never randomize at runtime).
const SIGIL_BY_KIND: Record<string, string> = {
  featured: 'origin',
  skill: 'skill',
  verdict: 'verdict',
  essay: 'lexicon',
  whitepaper: 'whitepaper',
};

export type ArticleCardProps = {
  href: string;
  title: string;
  excerpt: string;
  category: string;
  kind?: SignalKind;
  date: string;
  readTime: string;
  featured?: boolean;
};

export function ArticleCard({
  href,
  title,
  excerpt,
  category,
  kind = 'essay',
  date,
  readTime,
  featured = false,
}: ArticleCardProps) {
  const sigil = SIGIL_BY_KIND[kind] ?? 'origin';
  return (
    <a className="cz-card" href={href} data-featured={featured} data-kind={kind}>
      <img
        className="cz-card__sigil"
        src={`/assets/channel-zero/sigil-${sigil}.svg`}
        alt=""
        aria-hidden="true"
        width={64}
        height={64}
        loading="lazy"
      />
      <div className="cz-card__meta">
        <SignalTag kind={kind}>{category}</SignalTag>
        <SignalTag>{date}</SignalTag>
      </div>
      <h3 className="cz-card__title">{title}</h3>
      <p className="cz-card__excerpt">{excerpt}</p>
      <span className="cz-card__footer">Read transmission · {readTime}</span>
    </a>
  );
}
