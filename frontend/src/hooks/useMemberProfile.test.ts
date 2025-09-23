import { describe, it, expect, vi, type Mock } from 'vitest';
import { renderHookWithProviders, waitFor } from '@/test-utils';
import { useMemberProfile } from './useMemberProfile';
import { getMemberProfile } from '../services/member';

vi.mock('../services/member');

describe('useMemberProfile', () => {
  it('should return a member profile', async () => {
    (getMemberProfile as Mock).mockResolvedValue({ id: '1', name: 'Test User' });
    const { result } = renderHookWithProviders(() => useMemberProfile('test-uid'));
    await waitFor(() => {
      expect(result.current.data).toBeDefined();
    });
    expect(result.current.data?.name).toBe('Test User');
  });
});