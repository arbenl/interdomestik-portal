import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useMemberProfile } from './useMemberProfile';
import { onSnapshot } from 'firebase/firestore';

describe('useMemberProfile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return loading state initially', () => {
    const { result } = renderHook(() => useMemberProfile('test-uid'));
    expect(result.current.loading).toBe(true);
  });

  it('should return profile and active membership on successful fetch', async () => {
    const mockProfile = { name: 'Test User', memberNo: '123' };
    const mockMembership = { status: 'active', expiresAt: { seconds: 1234567890 } };
    
    let first = true;
    ;(onSnapshot as unknown as vi.Mock).mockImplementation((_ref, next) => {
      if (first) {
        first = false;
        next({ exists: () => true, id: 'test-uid', data: () => mockProfile });
      } else {
        next({ empty: false, docs: [{ id: '2024', data: () => mockMembership }] });
      }
      return () => {};
    });

    const { result } = renderHook(() => useMemberProfile('test-uid'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.profile).toEqual({ id: 'test-uid', ...mockProfile });
      expect(result.current.activeMembership).toEqual({ id: '2024', ...mockMembership });
      expect(result.current.error).toBeNull();
    });
  });

  it('should return an error if fetching fails', async () => {
    const mockError = new Error('Failed to fetch');
    let sent = false;
    ;(onSnapshot as unknown as vi.Mock).mockImplementation((_ref, _next, error) => {
      if (!sent) { sent = true; error(mockError); }
      return () => {};
    });

    const { result } = renderHook(() => useMemberProfile('test-uid'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toEqual(mockError);
    });
  });

  it('should handle no profile found', async () => {
    let call = 0;
    ;(onSnapshot as unknown as vi.Mock).mockImplementation((_ref, next) => {
      call += 1;
      if (call === 1) {
        next({ exists: () => false, id: 'test-uid', data: () => ({}) });
      } else {
        next({ empty: true, docs: [] });
      }
      return () => {};
    });

    const { result } = renderHook(() => useMemberProfile('test-uid'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.profile).toBeNull();
      expect(result.current.activeMembership).toBeNull();
    });
  });

  it('should handle no active membership', async () => {
    const mockProfile = { name: 'Test User', memberNo: '123' };
    let first = true;
    ;(onSnapshot as unknown as vi.Mock).mockImplementation((_ref, next) => {
      if (first) {
        first = false;
        next({ exists: () => true, id: 'test-uid', data: () => mockProfile });
      } else {
        next({ empty: true, docs: [] });
      }
      return () => {};
    });

    const { result } = renderHook(() => useMemberProfile('test-uid'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.profile).toEqual({ id: 'test-uid', ...mockProfile });
      expect(result.current.activeMembership).toBeNull();
    });
  });
});
