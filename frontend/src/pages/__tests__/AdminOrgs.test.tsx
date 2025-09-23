import { renderWithProviders, screen, fireEvent, waitFor } from '@/test-utils';
import { vi, type Mock, describe, it, expect } from 'vitest';
import Admin from '../Admin';
import useAgentOrAdmin from '@/hooks/useAgentOrAdmin';
import { useOrganizations } from '@/hooks/admin/useOrganizations';

vi.mock('@/hooks/useAgentOrAdmin');
vi.mock('@/hooks/admin/useOrganizations');

describe('Admin Organizations panel', () => {
  it('creates organization', async () => {
    (useAgentOrAdmin as Mock).mockReturnValue({ isAdmin: true, canRegister: true, allowedRegions: ['PRISHTINA'], loading: false });
    const create = vi.fn().mockResolvedValue({ data: { ok: true } });
    (useOrganizations as Mock).mockReturnValue({ data: [], isLoading: false, error: null, create });

    renderWithProviders(<Admin />);

    await waitFor(() => {
      expect(screen.getByText('Organizations')).toBeInTheDocument();
    });

    const nameInput = screen.getByLabelText(/Name/i);
    fireEvent.change(nameInput, { target: { value: 'Test Org' } });
    fireEvent.click(screen.getByRole('button', { name: /Create Org/i }));

    await waitFor(() => {
      expect(create).toHaveBeenCalledWith({
        name: 'Test Org',
        email: '',
        seats: 10,
      });
    });
  });
});