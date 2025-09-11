import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Profile from '../Profile';

vi.mock('../../hooks/useAuth', () => ({ useAuth: () => ({ user: { uid: 'u1', email: 'u1@example.com' } }) }));
vi.mock('../../hooks/useMemberProfile', () => ({ useMemberProfile: () => ({ profile: { name: 'User One', region: 'PRISHTINA' }, activeMembership: null, loading: false, error: null }) }));
vi.mock('../../components/ui/useToast', () => ({ useToast: () => ({ push: vi.fn() }) }));

vi.mock('firebase/functions', () => {
  return {
    httpsCallable: () => vi.fn().mockResolvedValue({ data: { message: 'ok' } })
  };
});

vi.mock('../../firebase', () => ({ auth: { currentUser: { reload: vi.fn().mockResolvedValue(undefined) } }, functions: {} }));

describe('Profile page', () => {
  it('updates profile successfully', async () => {
    render(<Profile />);
    expect(screen.getByText(/My Profile/i)).toBeInTheDocument();
    const name = screen.getByLabelText(/Name/i) as HTMLInputElement;
    fireEvent.change(name, { target: { value: 'User One Updated' } });
    fireEvent.click(screen.getByRole('button', { name: /Update Profile/i }));
    expect(await screen.findByText(/Profile updated successfully/i)).toBeInTheDocument();
  });
});

