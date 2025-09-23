
import { screen, fireEvent } from '@testing-library/react';
import { renderWithProviders } from '@/test-utils';
import Input from './Input';
import { describe, it, expect } from 'vitest';

describe('Input', () => {
  it('renders with a label and updates its value', () => {
    renderWithProviders(
      <Input label="Test Input" placeholder="Enter text" />
    );

    const input = screen.getByLabelText('Test Input') as HTMLInputElement;
    expect(input).toBeInTheDocument();
    expect(input.value).toBe('');

    fireEvent.change(input, { target: { value: 'hello' } });
    expect(input.value).toBe('hello');
  });
});
