import { describe, it, expect, vi, type Mock } from 'vitest';
import { renderWithProviders, screen, within, fireEvent } from '@/test-utils';
import Admin from '../Admin';
import { useAuth } from '@/context/auth';

vi.mock('@/context/auth');

describe('Admin Card Keys panel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useAuth as Mock).mockReturnValue({
      isAdmin: true,
      isAgent: false,
      user: { uid: 'test-admin-uid' },
      loading: false,
      allowedRegions: ['PRISHTINA'],
    });
  });

  it('shows active kid and allows revoke by jti', async () => {
    renderWithProviders(<Admin />);
    const headers = await screen.findAllByText(/Card Keys & Tokens/i);
    expect(headers.length).toBeGreaterThan(0);
    const panel = headers[0].closest('div') as HTMLElement;
    const activeKeyNode = await within(panel).findByText(/Active key id:/i);
    expect(within(activeKeyNode).getByText('v2')).toBeInTheDocument();

    const jtiInput = within(panel).getByLabelText(/jti/i) as HTMLInputElement;
    fireEvent.change(jtiInput, { target: { value: 'abc123' } });
    const reasonInput = within(panel).getByLabelText(/reason/i) as HTMLInputElement;
    fireEvent.change(reasonInput, { target: { value: 'lost' } });
    const revokeBtn = within(panel).getByRole('button', { name: /Revoke/i });
    fireEvent.click(revokeBtn);
  });
});
