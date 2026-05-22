import { render } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import SearchPanel from '../../../src/pages/Read/SearchPanel.jsx';

expect.extend(toHaveNoViolations);

vi.mock('../../../src/hooks/useWordLookup.jsx', () => ({
  useWordLookup: () => ({
    lookup: vi.fn(),
    retry: vi.fn(),
    data: null,
    isLoading: false,
    status: 'idle',
    error: null,
    reset: vi.fn(),
    source: null,
  }),
}));

vi.mock('../../../src/hooks/usePredictor.jsx', () => ({
  usePredictor: () => ({
    checkSpelling: vi.fn().mockResolvedValue(true),
    getSpellingSuggestions: vi.fn().mockResolvedValue([]),
    predict: vi.fn().mockResolvedValue([]),
    getCompletions: vi.fn().mockResolvedValue([]),
    ready: false,
    isDictionaryConnected: false,
  }),
}));

function renderPanel(props = {}) {
  return render(
    <MemoryRouter>
      <SearchPanel seedWord="" selectedSchool="DEFAULT" {...props} />
    </MemoryRouter>
  );
}

describe('SearchPanel accessibility', () => {
  test('single instance: no axe violations', async () => {
    const { container } = renderPanel();
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  test('two simultaneous instances: no duplicate IDs', async () => {
    const { container } = render(
      <MemoryRouter>
        <SearchPanel seedWord="fire"  selectedSchool="DEFAULT" />
        <SearchPanel seedWord="water" selectedSchool="DEFAULT" />
      </MemoryRouter>
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
