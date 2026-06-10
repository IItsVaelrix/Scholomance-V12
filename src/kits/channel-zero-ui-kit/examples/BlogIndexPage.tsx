import { ArticleCard } from '../components/ArticleCard';
import { ArticleHero } from '../components/ArticleHero';
import { ChannelHeader } from '../components/ChannelHeader';
import { ChannelShell } from '../components/ChannelShell';
import { NewsletterSigil } from '../components/NewsletterSigil';

const posts = [
  {
    href: '/blog/emergent-disparity-reconciliation-spell',
    title: 'Emergent Disparity Reconciliation Spell',
    excerpt: 'A method for scanning a codebase for connective tissue hidden between systems, then proposing upgrades with low regression blast radius.',
    category: 'Skill',
    kind: 'skill' as const,
    date: 'June 10, 2026',
    readTime: '7 min',
    featured: true,
  },
  {
    href: '/whitepapers/scholoecho-space-painting',
    title: 'ScholoEcho and the Space-Painting Instrument',
    excerpt: 'A blog-native white paper on designing reverb and delay as spatial paint instead of knob soup.',
    category: 'Whitepaper',
    kind: 'whitepaper' as const,
    date: 'June 2026',
    readTime: '12 min',
  },
  {
    href: '/verdicts/scholomance-channel-zero-launch',
    title: 'Launch Verdict: Channel Zero',
    excerpt: 'A structured self-audit for the blog surface: signal clarity, SEO runway, accessibility, and design law alignment.',
    category: 'Verdict',
    kind: 'verdict' as const,
    date: 'June 2026',
    readTime: '9 min',
  },
];

export function BlogIndexPage() {
  return (
    <ChannelShell>
      <ChannelHeader />
      <main className="cz-page">
        <ArticleHero
          title="The Scholomance Channel: Zero"
          lede="Free doctrine for writers, engineers, musicians, and creative operators building their own instruments instead of begging the machine for permission."
        />

        <section aria-labelledby="latest-transmissions">
          <div className="cz-section-head">
            <h2 id="latest-transmissions">Latest Transmissions</h2>
            <p>Skills, postmortems, white papers, and verdicts from the creative operating system.</p>
          </div>

          <div className="cz-grid">
            {posts.map((post) => (
              <ArticleCard key={post.href} {...post} />
            ))}
          </div>
        </section>

        <NewsletterSigil />
      </main>
    </ChannelShell>
  );
}
