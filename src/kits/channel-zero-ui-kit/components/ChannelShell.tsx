import type { ReactNode } from 'react';

export type ChannelShellProps = {
  children: ReactNode;
  theme?: 'dark' | 'light';
};

export function ChannelShell({ children, theme = 'dark' }: ChannelShellProps) {
  return (
    <div className="cz-shell" data-theme={theme}>
      {children}
    </div>
  );
}
