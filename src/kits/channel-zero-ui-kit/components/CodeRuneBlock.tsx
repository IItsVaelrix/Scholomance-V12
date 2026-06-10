import type { ReactNode } from 'react';

export type CodeRuneBlockProps = {
  title?: string;
  language?: string;
  children: ReactNode;
};

export function CodeRuneBlock({ title = 'Rune Contract', language = 'tsx', children }: CodeRuneBlockProps) {
  return (
    <figure className="cz-code-rune">
      <figcaption className="cz-code-rune__bar">
        <span>{title}</span>
        <span>{language}</span>
      </figcaption>
      <pre>
        <code>{children}</code>
      </pre>
    </figure>
  );
}
