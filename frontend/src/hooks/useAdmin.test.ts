import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import useAdmin from './useAdmin';

vi.mock('./useAuth', () => ({
  useAuth: () => ({
    user: ({
      getIdToken: vi.fn().mockResolvedValue('token'),
      getIdTokenResult: vi.fn().mockResolvedValue({ claims: { role: 'admin' } }),
    })
  })
}));

describe('useAdmin', () => {
  it('returns isAdmin=true when role=admin', async () => {
    const { result } = renderHook(() => useAdmin());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.isAdmin).toBe(true);
  });
});
