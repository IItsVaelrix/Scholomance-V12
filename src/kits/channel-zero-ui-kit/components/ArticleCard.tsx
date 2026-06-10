import { SignalTag, type SignalKind } from './SignalTag';

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
  return (
    <a className="cz-card" href={href} data-featured={featured}>
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
