import { renderWithProviders, screen, fireEvent, waitFor, within } from '@/test-utils';
import { vi, describe, it, expect, type Mock } from 'vitest';
import { OrgPanel } from '@/features/admin/organizations/OrgPanel';
import { useOrganizations } from '@/hooks/admin/useOrganizations';

vi.mock('@/hooks/admin/useOrganizations');

const mockedUseOrganizations = useOrganizations as unknown as Mock;

describe('Admin Organizations panel', () => {
  it('creates organization', async () => {
    const create = vi.fn().mockResolvedValue({ data: { ok: true } });
    mockedUseOrganizations.mockReturnValue({ data: [], isLoading: false, error: null, create });

    const push = vi.fn();
    renderWithProviders(<OrgPanel push={push} />);

    const panel = await screen.findByTestId('orgs-panel');
    const panelScope = within(panel);

    const nameInput = panelScope.getByLabelText(/Name/i);
    fireEvent.change(nameInput, { target: { value: 'Test Org' } });
    fireEvent.click(panelScope.getByRole('button', { name: /Create Org/i }));

    await waitFor(() => {
      expect(create).toHaveBeenCalledWith({
        name: 'Test Org',
        email: '',
        seats: 10,
      });
    });

    await waitFor(() => {
      expect(push).toHaveBeenCalledWith({ type: 'success', message: 'Organization created' });
    });
  });
});
