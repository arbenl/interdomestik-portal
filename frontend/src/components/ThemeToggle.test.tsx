import { render, screen, fireEvent } from '@testing-library/react';
import ThemeToggle from './ThemeToggle';
import { useTheme } from '@/hooks/useTheme';
import { vi } from 'vitest';

// Mock the useTheme hook
vi.mock('@/hooks/useTheme');

describe('ThemeToggle', () => {
  it('should call setTheme when clicked', () => {
    const setTheme = vi.fn();
    (useTheme as any).mockReturnValue({ theme: 'light', setTheme });

    render(<ThemeToggle />);

    const button = screen.getByRole('button', { name: /toggle theme/i });
    fireEvent.click(button);

    expect(setTheme).toHaveBeenCalledWith('dark');
  });
});
