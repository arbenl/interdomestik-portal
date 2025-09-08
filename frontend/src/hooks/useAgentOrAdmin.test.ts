import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import useAgentOrAdmin from './useAgentOrAdmin';

const mockGetIdTokenResult = vi.fn();
const mockGetIdToken = vi.fn();

vi.mock('./useAuth', () => ({
  useAuth: () => ({ user: ({ getIdToken: mockGetIdToken, getIdTokenResult: mockGetIdTokenResult }) })
}));

describe('useAgentOrAdmin', () => {
  it('maps claims to flags and regions', async () => {
    mockGetIdToken.mockResolvedValue('token');
    mockGetIdTokenResult.mockResolvedValue({ claims: { role: 'agent', allowedRegions: ['PRISHTINA','PEJA'] } });
    const { result } = renderHook(() => useAgentOrAdmin());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.isAgent).toBe(true);
    expect(result.current.canRegister).toBe(true);
    expect(result.current.allowedRegions).toEqual(['PRISHTINA','PEJA']);
  });
});
