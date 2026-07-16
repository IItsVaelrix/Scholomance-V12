import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { DiscographyNav } from '../../src/pages/Visualiser/DiscographyNav';

function renderNav() {
  return render(
    <MemoryRouter>
      <DiscographyNav activeTrackId="petrichor" onSelectTrack={vi.fn()} />
    </MemoryRouter>
  );
}

describe('DiscographyNav header', () => {
  it('groups Discography title and Albums link in a left title cluster', () => {
    const { container } = renderNav();
    const titleCluster = container.querySelector('.bcv-disco-header-title');
    expect(titleCluster).toBeTruthy();
    expect(titleCluster?.querySelector('h2')?.textContent).toMatch(/discography/i);
    const albumsLink = titleCluster?.querySelector('a.bcv-disco-albums-link');
    expect(albumsLink).toBeTruthy();
    expect(albumsLink).toHaveAttribute('href', '/visualiser/albums');
    expect(albumsLink?.textContent).toMatch(/albums/i);
  });

  it('keeps Upload and collapse in the right actions cluster', () => {
    const { container } = renderNav();
    const actions = container.querySelector('.bcv-disco-header-actions');
    expect(actions).toBeTruthy();
    expect(actions?.querySelector('.bcv-upload-btn')).toBeTruthy();
    expect(actions?.querySelector('.bcv-disco-collapse-btn')).toBeTruthy();
    expect(screen.getByRole('button', { name: /upload/i })).toBeInTheDocument();
    expect(within(actions as HTMLElement).getByRole('button', { name: /collapse discography/i })).toBeInTheDocument();
  });
});
