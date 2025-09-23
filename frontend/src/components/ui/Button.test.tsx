import { describe, it, expect } from 'vitest';
import { renderWithProviders, screen } from '@/test-utils';
import { Button } from './Button';

describe('Button', () => {
  it('renders primary variant by default', () => {
    renderWithProviders(<Button>Click me</Button>);
    expect(screen.getByRole('button')).toHaveClass('bg-indigo-600');
  });

  it('renders ghost variant', () => {
    renderWithProviders(<Button variant="ghost">Click me</Button>);
    expect(screen.getByRole('button')).toHaveClass('bg-transparent');
  });
});
