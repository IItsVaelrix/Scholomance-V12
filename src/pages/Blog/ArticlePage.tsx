import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChannelHeader } from '../../kits/channel-zero-ui-kit/components/ChannelHeader';
import { ChannelShell } from '../../kits/channel-zero-ui-kit/components/ChannelShell';
import { CodeRuneBlock } from '../../kits/channel-zero-ui-kit/components/CodeRuneBlock';
import { NewsletterSigil } from '../../kits/channel-zero-ui-kit/components/NewsletterSigil';
import { SignalTag } from '../../kits/channel-zero-ui-kit/components/SignalTag';
import { TableOfContents } from '../../kits/channel-zero-ui-kit/components/TableOfContents';
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion.js';
import './channel-zero-grim.css';

interface TocItem {
  href: string;
  label: string;
}

const toc: TocItem[] = [
  { href: '#summary', label: 'Summary' },
  { href: '#why', label: 'Why It Matters' },
  { href: '#contract', label: 'Output Contract' },
  { href: '#qa', label: 'QA Checklist' },
];

const articleContent = [
  {
    id: 'summary',
    heading: 'Summary',
    level: 2,
    content: (
      <p>
        This pattern turns scattered strengths into deliberate infrastructure. It is not a rewrite ritual. It is a pressure test for hidden leverage.
      </p>
    ),
  },
  {
    id: 'why',
    heading: 'Why It Matters',
    level: 2,
    content: (
      <p>
        Mature systems accumulate almost-compatible parts. The spell finds where those parts want to become a shared contract, adapter, token, or doctrine page.
      </p>
    ),
  },
  {
    id: 'contract',
    heading: 'Output Contract',
    level: 2,
    content: (
      <CodeRuneBlock title="Skill Output" language="markdown">
{`Summary
Why
Proposed connective tissue
Risk reduced
Implementation sketch
QA checklist
Next risks`}
      </CodeRuneBlock>
    ),
  },
  {
    id: 'qa',
    heading: 'QA Checklist',
    level: 2,
    content: (
      <ul>
        <li>Verify no hard-coded colors escaped token law.</li>
        <li>Check keyboard focus on all actions.</li>
        <li>Confirm reduced-motion mode disables ornamental movement.</li>
      </ul>
    ),
  },
] as const;

export default function ArticlePage() {
  const prefersReducedMotion = usePrefersReducedMotion();
  const [visibleSections, setVisibleSections] = useState<Set<string>>(new Set());

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisibleSections(new Set(articleContent.map(s => s.id)));
    }, prefersReducedMotion ? 0 : 600);
    return () => clearTimeout(timer);
  }, [prefersReducedMotion]);

  return (
    <ChannelShell>
      <ChannelHeader />
      <main className="cz-page cz-layout-article cz-grim">
        <article className="cz-article">
          <SignalTag kind="skill">Skill</SignalTag>
          <motion.h1
            initial={prefersReducedMotion ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.6, ease: [0.16, 1, 0.3, 1] }}
          >
            Emergent Disparity Reconciliation Spell
          </motion.h1>
          <motion.p
            className="cz-article-lede"
            initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.5, delay: prefersReducedMotion ? 0 : 0.1, ease: [0.16, 1, 0.3, 1] }}
          >
            Scan the codebase fundamentals, find invisible gaps between systems, and propose connective tissue that creates new boons without destabilizing the current architecture.
          </motion.p>

          <AnimatePresence>
            {articleContent.map((section, index) => (
              <motion.section
                key={section.id}
                id={section.id}
                className="cz-article-section"
                initial={prefersReducedMotion ? false : { opacity: 0, y: 24 }}
                animate={visibleSections.has(section.id) ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
                exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -12 }}
                transition={{
                  duration: prefersReducedMotion ? 0 : 0.5,
                  ease: [0.16, 1, 0.3, 1],
                  delay: prefersReducedMotion ? 0 : index * 0.1 + 0.2,
                }}
              >
                {section.level === 2 && (
                  <motion.h2
                    initial={prefersReducedMotion ? false : { opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: prefersReducedMotion ? 0 : 0.4, delay: prefersReducedMotion ? 0 : 0.05 }}
                  >
                    {section.heading}
                  </motion.h2>
                )}
                {section.content}
              </motion.section>
            ))}
          </AnimatePresence>

          <motion.section
            className="cz-article-newsletter"
            initial={prefersReducedMotion ? false : { opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.5, delay: prefersReducedMotion ? 0 : 0.3 }}
          >
            <NewsletterSigil />
          </motion.section>
        </article>

        <motion.aside
          className="cz-toc-wrapper"
          initial={prefersReducedMotion ? false : { opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: prefersReducedMotion ? 0 : 0.5, delay: prefersReducedMotion ? 0 : 0.2, ease: [0.16, 1, 0.3, 1] }}
        >
          <TableOfContents items={toc} />
        </motion.aside>
      </main>
    </ChannelShell>
  );
}