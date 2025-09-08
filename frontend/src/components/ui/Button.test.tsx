import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import Button from './Button';

describe('Button', () => {
  it('renders primary variant by default', () => {
    const { getByRole } = render(<Button>Click</Button>);
    const btn = getByRole('button', { name: 'Click' });
    expect(btn.className).toMatch(/bg-indigo-600/);
  });

  it('renders ghost variant', () => {
    const { getByRole } = render(<Button variant="ghost">Ghost</Button>);
    const btn = getByRole('button', { name: 'Ghost' });
    expect(btn.className).toMatch(/bg-transparent/);
  });
});

