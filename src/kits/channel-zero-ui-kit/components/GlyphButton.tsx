import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from 'react';

type SharedProps = {
  children: ReactNode;
  variant?: 'solid' | 'ghost';
};

type AnchorButtonProps = SharedProps & AnchorHTMLAttributes<HTMLAnchorElement> & { href: string };
type NativeButtonProps = SharedProps & ButtonHTMLAttributes<HTMLButtonElement> & { href?: never };

export type GlyphButtonProps = AnchorButtonProps | NativeButtonProps;

const ANCHOR_PROPS = ['href', 'hrefLang', 'media', 'ping', 'target', 'rel', 'download', 'type'] as const;

export function GlyphButton({ children, variant = 'solid', ...props }: GlyphButtonProps) {
  if ('href' in props && props.href) {
    return (
      <a className="cz-button" data-variant={variant} {...props}>
        <span aria-hidden="true">◇</span>
        {children}
      </a>
    );
  }

  const { type, ...buttonProps } = props as Record<string, unknown>;
  return (
    <button className="cz-button" data-variant={variant} type={type as 'button' | 'reset' | 'submit' | undefined} {...buttonProps}>
      <span aria-hidden="true">◇</span>
      {children}
    </button>
  );
}
