import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AlbumIndexPage from '../../src/pages/Visualiser/AlbumIndexPage';

describe('AlbumIndexPage', () => {
  it('renders album cards for released albums', () => {
    render(
      <MemoryRouter>
        <AlbumIndexPage />
      </MemoryRouter>
    );
    expect(screen.getByText('Albums')).toBeInTheDocument();
    const links = screen.getAllByRole('link');
    expect(links.length).toBeGreaterThan(0);
  });

  it('each album card links to the album page', () => {
    render(
      <MemoryRouter>
        <AlbumIndexPage />
      </MemoryRouter>
    );
    const links = screen.getAllByRole('link').filter(
      l => l.getAttribute('href')?.includes('/visualiser/album/')
    );
    expect(links.length).toBeGreaterThan(0);
  });
});
