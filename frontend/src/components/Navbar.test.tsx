import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Navbar from './Navbar';

vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({ user: { displayName: 'Ada Lovelace', email: 'ada@example.com' } }),
}));

describe('Navbar', () => {
  it('renders links and toggles user menu', () => {
    render(
      <MemoryRouter>
        <Navbar />
      </MemoryRouter>
    );
    // Basic links
    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Portal')).toBeInTheDocument();

    // Open menu
    const avatarBtn = screen.getByRole('button');
    fireEvent.click(avatarBtn);
    expect(screen.getByText('History')).toBeInTheDocument();
    expect(screen.getByText('Sign out')).toBeInTheDocument();
  });
});
