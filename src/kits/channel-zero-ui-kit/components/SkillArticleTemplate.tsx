import type { ReactNode } from 'react';
import { SignalTag } from './SignalTag';

export type SkillArticleTemplateProps = {
  title: string;
  subtitle: string;
  children: ReactNode;
};

export function SkillArticleTemplate({ title, subtitle, children }: SkillArticleTemplateProps) {
  return (
    <article className="cz-article">
      <SignalTag kind="skill">Skill Transmission</SignalTag>
      <h1>{title}</h1>
      <p>{subtitle}</p>

      <h2 id="what-it-does">What It Does</h2>
      <h2 id="when-to-use-it">When To Use It</h2>
      <h2 id="inputs-needed">Inputs Needed</h2>
      <h2 id="output-contract">Output Contract</h2>
      <h2 id="method">Step-by-Step Method</h2>
      <h2 id="example-prompt">Example Prompt</h2>
      <h2 id="failure-modes">Failure Modes</h2>
      <h2 id="upgrade-path">Upgrade Path</h2>

      {children}
    </article>
  );
}
