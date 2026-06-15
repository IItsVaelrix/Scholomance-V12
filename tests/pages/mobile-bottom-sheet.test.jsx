import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import MobileBottomSheet from '../../src/pages/Read/MobileBottomSheet';

describe('MobileBottomSheet', () => {
  it('renders children when open', () => {
    render(
      <MobileBottomSheet isOpen={true} onClose={vi.fn()}>
        <p>Sheet content</p>
      </MobileBottomSheet>
    );
    expect(screen.getByText('Sheet content')).toBeInTheDocument();
  });

  it('does not render children when closed', () => {
    render(
      <MobileBottomSheet isOpen={false} onClose={vi.fn()}>
        <p>Sheet content</p>
      </MobileBottomSheet>
    );
    expect(screen.queryByText('Sheet content')).not.toBeInTheDocument();
  });

  it('calls onClose when backdrop is clicked', () => {
    const onClose = vi.fn();
    render(
      <MobileBottomSheet isOpen={true} onClose={onClose}>
        <p>Content</p>
      </MobileBottomSheet>
    );
    fireEvent.click(document.querySelector('.ide-sheet-backdrop'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('renders drag handle', () => {
    render(
      <MobileBottomSheet isOpen={true} onClose={vi.fn()}>
        <p>Content</p>
      </MobileBottomSheet>
    );
    expect(document.querySelector('.ide-sheet-handle')).toBeInTheDocument();
  });
});
