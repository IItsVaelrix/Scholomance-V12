import { ChannelHeader } from '../components/ChannelHeader';
import { ChannelShell } from '../components/ChannelShell';
import { CodeRuneBlock } from '../components/CodeRuneBlock';
import { NewsletterSigil } from '../components/NewsletterSigil';
import { SignalTag } from '../components/SignalTag';
import { TableOfContents } from '../components/TableOfContents';

const toc = [
  { href: '#summary', label: 'Summary' },
  { href: '#why', label: 'Why It Matters' },
  { href: '#contract', label: 'Output Contract' },
  { href: '#qa', label: 'QA Checklist' },
];

export function ArticlePage() {
  return (
    <ChannelShell>
      <ChannelHeader />
      <main className="cz-page cz-layout-article">
        <article className="cz-article">
          <SignalTag kind="skill">Skill</SignalTag>
          <h1>Emergent Disparity Reconciliation Spell</h1>
          <p>
            Scan the codebase fundamentals, find invisible gaps between systems, and propose connective tissue that creates new boons without destabilizing the current architecture.
          </p>

          <h2 id="summary">Summary</h2>
          <p>
            This pattern turns scattered strengths into deliberate infrastructure. It is not a rewrite ritual. It is a pressure test for hidden leverage.
          </p>

          <h2 id="why">Why It Matters</h2>
          <p>
            Mature systems accumulate almost-compatible parts. The spell finds where those parts want to become a shared contract, adapter, token, or doctrine page.
          </p>

          <h2 id="contract">Output Contract</h2>
          <CodeRuneBlock title="Skill Output" language="markdown">
{`Summary
Why
Proposed connective tissue
Risk reduced
Implementation sketch
QA checklist
Next risks`}
          </CodeRuneBlock>

          <h2 id="qa">QA Checklist</h2>
          <ul>
            <li>Verify no hard-coded colors escaped token law.</li>
            <li>Check keyboard focus on all actions.</li>
            <li>Confirm reduced-motion mode disables ornamental movement.</li>
          </ul>

          <NewsletterSigil />
        </article>

        <TableOfContents items={toc} />
      </main>
    </ChannelShell>
  );
}
