// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { DivLayoutRenderer } from '../../../src/features/divwand/DivLayoutRenderer.jsx';

afterEach(cleanup);

const proposal = {
  rationale: 'test',
  confidence: 1,
  reviewRequired: false,
  proposedLayout: {
    id: 'root',
    type: 'container',
    role: 'card',
    style: { variant: 'glassmorphic' },
    layout: { display: 'flex', flexDirection: 'column', width: 200, height: 200 },
    children: [
      { id: 'hdr', type: 'container', role: 'header', layout: { height: 40 }, children: [] },
      { id: 'body', type: 'container', role: 'content', layout: { flex: undefined, height: 120 }, children: [] },
    ],
  },
};

describe('DivLayoutRenderer', () => {
  it('renders layout nodes by id', () => {
    render(<DivLayoutRenderer proposal={proposal} />);
    expect(document.getElementById('root')).toBeTruthy();
    expect(document.getElementById('hdr')).toBeTruthy();
  });

  it('injects slots into header/content roles', () => {
    render(
      <DivLayoutRenderer
        proposal={proposal}
        slots={{
          title: <h2>Scholomance Update Ledger</h2>,
          content: <p>Chronicle body</p>,
        }}
      />
    );
    expect(screen.getByRole('heading', { name: 'Scholomance Update Ledger' })).toBeTruthy();
    expect(screen.getByText('Chronicle body')).toBeTruthy();
  });
});
