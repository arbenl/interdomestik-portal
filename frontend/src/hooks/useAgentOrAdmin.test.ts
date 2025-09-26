import { describe, it, expect, vi, type Mock } from 'vitest';
import { renderHookWithProviders, waitFor } from '@/test-utils';
import useAgentOrAdmin from './useAgentOrAdmin';
import { useAuth } from '@/hooks/useAuth';

vi.mock('@/hooks/useAuth');

describe('useAgentOrAdmin', () => {
  it('maps claims to flags and regions', async () => {
    (useAuth as Mock).mockReturnValue({
      user: { uid: 'admin-1' },
      isAdmin: true,
      isAgent: false,
      allowedRegions: ['PRISHTINA'],
      loading: false,
      mfaEnabled: true,
      signIn: vi.fn(),
      signUp: vi.fn(),
      signOutUser: vi.fn(),
    });
    const { result } = renderHookWithProviders(() => useAgentOrAdmin());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.isAdmin).toBe(true);
    expect(result.current.isAgent).toBe(false);
    expect(result.current.allowedRegions).toEqual(['PRISHTINA']);
  });
});
