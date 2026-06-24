/**
 * FORGE GATE PANEL QA - PixelBrain Immunity verdict surface (task 7aff0e39)
 *
 * Pins the UI contract for the Forge Craft Gate surface: the verdict region is
 * an aria-live status (never an alert box), the file control is labelled and
 * keyboard reachable, and the panel renders the normalized adapter verdict  - 
 * PB-XP vaccine on PASS, PB-ERR bytecode + reason on a blocking FAIL.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';

import { ForgeGatePanel } from '../../../src/pages/PixelBrain/components/ForgeGatePanel.jsx';

expect.extend(toHaveNoViolations);

function specFile(obj, name = 'voidmetal-pickaxe.v1.json') {
  const file = new File([JSON.stringify(obj)], name, { type: 'application/json' });
  // jsdom's File lacks .text() in some versions - polyfill deterministically.
  file.text = () => Promise.resolve(JSON.stringify(obj));
  return file;
}

function loadSpec(file) {
  const input = screen.getByLabelText(/run the forge craft gate/i);
  fireEvent.change(input, { target: { files: [file] } });
}

describe('ForgeGatePanel - Immunity verdict surface', () => {
  it('renders an idle prompt with a labelled control and passes axe', async () => {
    const { container } = render(<ForgeGatePanel onRunGate={vi.fn()} />);

    expect(screen.getByRole('status')).toHaveTextContent(/load an item-spec/i);
    expect(screen.getByLabelText(/run the forge craft gate/i)).toBeInTheDocument();

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('uses an aria-live status region, not an alert box', () => {
    render(<ForgeGatePanel onRunGate={vi.fn()} />);
    const status = screen.getByRole('status');
    expect(status).toHaveAttribute('aria-live', 'polite');
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('renders the PB-XP vaccine bytecode on a PASS verdict', async () => {
    const onRunGate = vi.fn(() => ({ ok: true, vaccine: 'PB-XP-v1:FORGE-PASS' }));
    render(<ForgeGatePanel onRunGate={onRunGate} />);

    loadSpec(specFile({ id: 'voidmetal-pickaxe', parts: [] }));

    await waitFor(() => expect(screen.getByText('PB-XP-v1:FORGE-PASS')).toBeInTheDocument());
    expect(onRunGate).toHaveBeenCalledWith({ id: 'voidmetal-pickaxe', parts: [] });
    expect(screen.getByRole('status')).toHaveTextContent(/gate passed/i);
  });

  it('renders the PB-ERR bytecode and reason on a blocking FAIL', async () => {
    const onRunGate = vi.fn(() => ({
      ok: false,
      bytecode: 'PB-ERR-v1:0x0040',
      reason: 'off-grid coordinate detected',
    }));
    render(<ForgeGatePanel onRunGate={onRunGate} />);

    loadSpec(specFile({ id: 'bad', parts: [] }));

    await waitFor(() => expect(screen.getByText('PB-ERR-v1:0x0040')).toBeInTheDocument());
    expect(screen.getByText(/off-grid coordinate detected/i)).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(/gate blocked/i);
  });

  it('reports a malformed spec without calling the gate', async () => {
    const onRunGate = vi.fn();
    render(<ForgeGatePanel onRunGate={onRunGate} />);

    const bad = new File(['{not json'], 'broken.json', { type: 'application/json' });
    bad.text = () => Promise.resolve('{not json');
    loadSpec(bad);

    await waitFor(() => expect(screen.getByText(/malformed spec/i)).toBeInTheDocument());
    expect(onRunGate).not.toHaveBeenCalled();
  });
});

function silhFile(text = 'SILH_START\nSILH_END', name = 'p.silh') {
  const file = new File([text], name, { type: 'text/plain' });
  file.text = () => Promise.resolve(text);
  return file;
}

function loadBlueprint(file) {
  const input = screen.getByLabelText(/load a silhouette blueprint/i);
  fireEvent.change(input, { target: { files: [file] } });
}

describe('ForgeGatePanel - silhouette blueprint surface', () => {
  it('renders per-view chips when a blueprint verdict comes back', async () => {
    const onRunGate = vi.fn();
    const onRunBlueprint = vi.fn(() => ({
      ok: false,
      bytecode: 'PB-ERR-v1:0x0F01',
      reason: 'shadow does not match blueprint',
      view: 'side',
    }));
    render(<ForgeGatePanel onRunGate={onRunGate} onRunBlueprint={onRunBlueprint} />);

    // load spec then blueprint
    loadSpec(specFile({ id: 'x', parts: [] }));
    loadBlueprint(silhFile());

    await waitFor(() =>
      expect(screen.getByText(/shadow does not match blueprint/i)).toBeInTheDocument()
    );
    expect(onRunBlueprint).toHaveBeenCalledWith({ id: 'x', parts: [] }, 'SILH_START\nSILH_END');
    expect(screen.getByTestId('pb-view-chip-side')).toHaveAttribute('data-state', 'fail');
    expect(screen.getByTestId('pb-view-chip-front')).toHaveAttribute('data-state', 'idle');
    expect(screen.getByTestId('pb-view-chip-top')).toHaveAttribute('data-state', 'idle');
  });

  it('marks all three views PASS when the blueprint gate certifies the asset', async () => {
    const onRunBlueprint = vi.fn(() => ({ ok: true, vaccine: 'PB-XP-v1:SILH-PASS', digest: 'abc123' }));
    render(<ForgeGatePanel onRunGate={vi.fn()} onRunBlueprint={onRunBlueprint} />);

    loadSpec(specFile({ id: 'x', parts: [] }));
    loadBlueprint(silhFile());

    await waitFor(() => expect(screen.getByText('PB-XP-v1:SILH-PASS')).toBeInTheDocument());
    for (const view of ['front', 'side', 'top']) {
      expect(screen.getByTestId(`pb-view-chip-${view}`)).toHaveAttribute('data-state', 'pass');
    }
  });

  it('refuses a blueprint with no spec loaded and does not call the gate', async () => {
    const onRunBlueprint = vi.fn();
    render(<ForgeGatePanel onRunGate={vi.fn()} onRunBlueprint={onRunBlueprint} />);

    loadBlueprint(silhFile());

    await waitFor(() => expect(screen.getByText(/load an item spec/i)).toBeInTheDocument());
    expect(onRunBlueprint).not.toHaveBeenCalled();
  });

  it('keeps the blueprint control labelled and free of axe violations', async () => {
    const { container } = render(<ForgeGatePanel onRunGate={vi.fn()} onRunBlueprint={vi.fn()} />);
    expect(screen.getByLabelText(/load a silhouette blueprint/i)).toBeInTheDocument();
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
