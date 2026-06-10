import { GlyphButton } from './GlyphButton';

export type ArticleHeroProps = {
  eyebrow?: string;
  title: string;
  lede: string;
  ctaHref?: string;
  ctaLabel?: string;
};

export function ArticleHero({
  eyebrow = 'The origin feed for creative engineering doctrine',
  title,
  lede,
  ctaHref = '/skills',
  ctaLabel = 'Enter the Skills Index',
}: ArticleHeroProps) {
  return (
    <section className="cz-hero">
      <div className="cz-hero__eyebrow">
        <span aria-hidden="true">✦</span>
        {eyebrow}
      </div>
      <h1 className="cz-hero__title">{title}</h1>
      <p className="cz-hero__lede">{lede}</p>
      <p>
        <GlyphButton href={ctaHref}>{ctaLabel}</GlyphButton>
      </p>
    </section>
  );
}
