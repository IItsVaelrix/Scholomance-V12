/**
 * TEMPLATE EDITOR QA - Lattice Grid editing surface
 *
 * Proves the hex engine is actually wired: pointer/keyboard edits mutate the
 * engine grid through the Cell Wall adapter, symmetry mirrors stay on-lattice,
 * fill respects boundaries, and the surface passes axe.
 */

import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { TemplateEditor } from '../../../src/pages/PixelBrain/components/TemplateEditor.jsx';

expect.extend(toHaveNoViolations);

const SPRITE_W = 160;
const SPRITE_H = 144;
const DEFAULT_CELL = 8;
const DEFAULT_ZOOM = 4;

// jsdom rects are 0×0, so the component's scale factors collapse to 1 and
// pointer coords map as clientX / zoom.
function paintAt(canvas, latticeX, latticeY) {
  fireEvent.pointerDown(canvas, {
    clientX: latticeX * DEFAULT_ZOOM,
    clientY: latticeY * DEFAULT_ZOOM,
  });
  fireEvent.pointerUp(canvas);
}

function getCanvas() {
  return screen.getByLabelText(/Lattice template canvas/);
}

function statusText() {
  return screen.getByText(/CELLS:/).textContent;
}

describe('TemplateEditor - lattice grid surface', () => {
  it('renders with the hexagonal dialect active and passes axe', async () => {
    const { container } = render(<TemplateEditor />);
    const hexButton = screen.getByRole('button', { name: 'hexagonal' });
    expect(hexButton).toHaveAttribute('aria-pressed', 'true');
    expect(statusText()).toContain('HEXAGONAL');

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('paints a single hex cell on pointer down', () => {
    render(<TemplateEditor />);
    paintAt(getCanvas(), 10, 10);
    expect(statusText()).toContain('CELLS: 1');
  });

  it('erases a painted cell with the erase tool', () => {
    render(<TemplateEditor />);
    const canvas = getCanvas();
    paintAt(canvas, 10, 10);
    fireEvent.click(screen.getByRole('button', { name: 'ERASE' }));
    paintAt(canvas, 10, 10);
    expect(statusText()).toContain('CELLS: 0');
  });

  it('fill floods the whole empty lattice and nothing more', () => {
    render(<TemplateEditor />);
    fireEvent.click(screen.getByRole('button', { name: 'FILL' }));
    paintAt(getCanvas(), 10, 10);

    const cols = Math.ceil(SPRITE_W / DEFAULT_CELL);
    const rows = Math.ceil(SPRITE_H / (DEFAULT_CELL * Math.sqrt(3) / 2));
    expect(statusText()).toContain(`CELLS: ${cols * rows}`);
  });

  it('fill from a painted cell does not leak into empty space', () => {
    render(<TemplateEditor />);
    const canvas = getCanvas();
    paintAt(canvas, 10, 10); // one painted cell
    fireEvent.click(screen.getByRole('button', { name: 'FILL' }));
    paintAt(canvas, 10, 10); // refill that cell only
    expect(statusText()).toContain('CELLS: 1');
  });

  it('vertical symmetry paints the mirrored hex cell too', () => {
    render(<TemplateEditor />);
    fireEvent.click(screen.getByRole('button', { name: 'MIRROR_V' }));
    paintAt(getCanvas(), 10, 10);
    expect(statusText()).toContain('CELLS: 2');
  });

  it('keyboard: Enter applies the tool at the cell cursor', () => {
    render(<TemplateEditor />);
    const canvas = getCanvas();
    canvas.focus();
    fireEvent.keyDown(canvas, { key: 'ArrowRight' });
    fireEvent.keyDown(canvas, { key: 'ArrowDown' });
    fireEvent.keyDown(canvas, { key: 'Enter' });
    expect(statusText()).toContain('CELLS: 1');
    fireEvent.keyDown(canvas, { key: 'Delete' });
    expect(statusText()).toContain('CELLS: 0');
  });

  it('switching dialect rebuilds the lattice', () => {
    render(<TemplateEditor />);
    paintAt(getCanvas(), 10, 10);
    fireEvent.click(screen.getByRole('button', { name: 'rectangular' }));
    expect(statusText()).toContain('RECTANGULAR');
    expect(statusText()).toContain('CELLS: 0');
  });
});
