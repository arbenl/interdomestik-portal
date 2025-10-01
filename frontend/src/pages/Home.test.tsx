import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/test-utils';
import Home from './Home';
import { describe, it, expect } from 'vitest';

describe('Home Page', () => {
  it('renders the main heading and portal link', () => {
    renderWithProviders(<Home />);
    expect(
      screen.getByRole('heading', { name: /Interdomestik Member Portal/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /Open Portal/i })
    ).toBeInTheDocument();
  });
});
