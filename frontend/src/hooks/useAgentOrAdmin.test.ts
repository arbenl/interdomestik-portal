import { describe, it, expect, vi, type Mock } from 'vitest';
import { renderHookWithProviders, waitFor } from '@/test-utils';
import useAgentOrAdmin from './useAgentOrAdmin';
import { useAuth } from '@/hooks/useAuth';

vi.mock('../context/AuthProvider');

describe('useAgentOrAdmin', () => {
  it('maps claims to flags and regions', async () => {
    (useAuth as Mock).mockReturnValue({ isAdmin: true, isAgent: false, allowedRegions: ['PRISHTINA'], loading: false });
    const { result } = renderHookWithProviders(() => useAgentOrAdmin());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.isAdmin).toBe(true);
    expect(result.current.isAgent).toBe(false);
    expect(result.current.allowedRegions).toEqual(['PRISHTINA']);
  });
});
