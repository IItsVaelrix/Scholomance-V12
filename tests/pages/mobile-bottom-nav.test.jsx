import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import MobileBottomNav from '../../src/pages/Read/MobileBottomNav';

describe('MobileBottomNav', () => {
  const onTabChange = vi.fn();

  beforeEach(() => onTabChange.mockClear());

  it('renders all 5 tabs', () => {
    render(<MobileBottomNav activeTab="EDITOR" onTabChange={onTabChange} />);
    expect(screen.getByRole('tab', { name: /editor/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /scrolls/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /oracle/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /hex/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /power/i })).toBeInTheDocument();
  });

  it('marks active tab with aria-selected=true', () => {
    render(<MobileBottomNav activeTab="SCROLLS" onTabChange={onTabChange} />);
    expect(screen.getByRole('tab', { name: /scrolls/i })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: /editor/i })).toHaveAttribute('aria-selected', 'false');
  });

  it('calls onTabChange with tab id on press', () => {
    render(<MobileBottomNav activeTab="EDITOR" onTabChange={onTabChange} />);
    fireEvent.click(screen.getByRole('tab', { name: /scrolls/i }));
    expect(onTabChange).toHaveBeenCalledWith('SCROLLS');
  });

  it('shows editorSubtitle under EDITOR tab when provided', () => {
    render(
      <MobileBottomNav
        activeTab="EDITOR"
        onTabChange={onTabChange}
        editorSubtitle="Ln 4 · Col 12"
      />
    );
    expect(screen.getByText('Ln 4 · Col 12')).toBeInTheDocument();
  });

  it('does not show editorSubtitle when activeTab is not EDITOR', () => {
    render(
      <MobileBottomNav
        activeTab="SCROLLS"
        onTabChange={onTabChange}
        editorSubtitle="Ln 4 · Col 12"
      />
    );
    expect(screen.queryByText('Ln 4 · Col 12')).not.toBeInTheDocument();
  });
});
