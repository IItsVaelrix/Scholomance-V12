/**
 * LATTICE GRID (Read page) QA — annotation lattice toggle
 *
 * Pins the contract for the ToolsSidebar "Lattice Grid" tool: toggle state is
 * exposed to assistive tech, the dependency on Truesight is communicated
 * instead of silently no-opping, and the ScrollEditor overlay actually swaps
 * annotation-box classes with the toggle.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';

vi.mock('../../../src/hooks/usePhonemeEngine.jsx', () => ({
  usePhonemeEngine: () => ({ engine: null }),
}));
vi.mock('../../../src/pages/Read/GrimDesignPanel.jsx', () => ({
  default: () => null,
}));

import ToolsSidebar from '../../../src/pages/Read/ToolsSidebar.jsx';
import ScrollEditor from '../../../src/pages/Read/ScrollEditor.jsx';
import { ThemeProvider } from '../../../src/hooks/useTheme.jsx';

expect.extend(toHaveNoViolations);

function sidebarProps(overrides = {}) {
  return {
    isTruesight: true,
    onToggleTruesight: vi.fn(),
    isLatticeGrid: false,
    onToggleLatticeGrid: vi.fn(),
    isPredictive: false,
    onTogglePredictive: vi.fn(),
    mirrored: false,
    onToggleMirrored: vi.fn(),
    analysisMode: 'none',
    onModeChange: vi.fn(),
    isAnalyzing: false,
    showScorePanel: false,
    onToggleScorePanel: vi.fn(),
    selectedSchool: 'SONIC',
    onSchoolChange: vi.fn(),
    schoolList: [{ id: 'SONIC', glyph: '♪', name: 'Sonic' }],
    ...overrides,
  };
}

function latticeButton() {
  return screen.getByRole('button', { name: /Lattice Grid/ });
}

describe('ToolsSidebar — Lattice Grid toggle', () => {
  it('exposes toggle state via aria-pressed and passes axe', async () => {
    const { container, rerender } = render(<ToolsSidebar {...sidebarProps()} />);
    expect(latticeButton()).toHaveAttribute('aria-pressed', 'false');

    rerender(<ToolsSidebar {...sidebarProps({ isLatticeGrid: true })} />);
    expect(latticeButton()).toHaveAttribute('aria-pressed', 'true');

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('communicates the Truesight dependency instead of silently no-opping', () => {
    const onToggle = vi.fn();
    render(<ToolsSidebar {...sidebarProps({ isTruesight: false, onToggleLatticeGrid: onToggle })} />);
    const button = latticeButton();
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('title', expect.stringMatching(/Truesight/));
    fireEvent.click(button);
    expect(onToggle).not.toHaveBeenCalled();
  });

  it('fires the toggle when Truesight is active', () => {
    const onToggle = vi.fn();
    render(<ToolsSidebar {...sidebarProps({ onToggleLatticeGrid: onToggle })} />);
    fireEvent.click(latticeButton());
    expect(onToggle).toHaveBeenCalledTimes(1);
  });
});

describe('ScrollEditor — lattice annotation boxes', () => {
  const renderEditor = (isLatticeGrid) => render(
    <ThemeProvider>
      <ScrollEditor
        title="Lattice"
        content="Alpha beta"
        isEditable={false}
        isTruesight={true}
        isLatticeGrid={isLatticeGrid}
        analysisMode="rhyme"
        analyzedWords={new Map()}
        activeConnections={[]}
        highlightedLines={[]}
      />
    </ThemeProvider>
  );

  it('marks every word annotation box as lattice when enabled', () => {
    const { container } = renderEditor(true);
    const boxes = container.querySelectorAll('.truesight-annotation-box');
    expect(boxes.length).toBeGreaterThan(0);
    boxes.forEach(box => {
      expect(box.classList.contains('truesight-annotation-box--lattice')).toBe(true);
    });
  });

  it('hides annotation boxes when the lattice is off', () => {
    const { container } = renderEditor(false);
    const boxes = container.querySelectorAll('.truesight-annotation-box');
    expect(boxes.length).toBeGreaterThan(0);
    boxes.forEach(box => {
      expect(box.classList.contains('truesight-annotation-box--hidden')).toBe(true);
    });
  });

  it('punctuation brightening is class-driven, not inline-styled', () => {
    const { container } = render(
      <ThemeProvider>
        <ScrollEditor
          title="Punct"
          content="Alpha, beta!"
          isEditable={false}
          isTruesight={true}
          isLatticeGrid={true}
          analysisMode="rhyme"
          analyzedWords={new Map()}
          activeConnections={[]}
          highlightedLines={[]}
        />
      </ThemeProvider>
    );
    const puncta = container.querySelectorAll('.truesight-puncta--lattice');
    expect(puncta.length).toBeGreaterThan(0);
    puncta.forEach(p => {
      expect(p.style.color).toBe('');
    });
  });
});
