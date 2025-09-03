import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useMemberProfile } from './useMemberProfile';
import { getDoc, getDocs } from 'firebase/firestore';

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
    
    (getDoc as vi.Mock).mockResolvedValue({ exists: () => true, data: () => mockProfile });
    (getDocs as vi.Mock).mockResolvedValue({ empty: false, docs: [{ data: () => mockMembership }] });

    const { result } = renderHook(() => useMemberProfile('test-uid'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.profile).toEqual(mockProfile);
      expect(result.current.activeMembership).toEqual(mockMembership);
      expect(result.current.error).toBeNull();
    });
  });

  it('should return an error if fetching fails', async () => {
    const mockError = new Error('Failed to fetch');
    (getDoc as vi.Mock).mockRejectedValue(mockError);

    const { result } = renderHook(() => useMemberProfile('test-uid'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toEqual(mockError);
    });
  });

  it('should handle no profile found', async () => {
    (getDoc as vi.Mock).mockResolvedValue({ exists: () => false });
    (getDocs as vi.Mock).mockResolvedValue({ empty: true, docs: [] });

    const { result } = renderHook(() => useMemberProfile('test-uid'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.profile).toBeNull();
      expect(result.current.activeMembership).toBeNull();
    });
  });

  it('should handle no active membership', async () => {
    const mockProfile = { name: 'Test User', memberNo: '123' };
    (getDoc as vi.Mock).mockResolvedValue({ exists: () => true, data: () => mockProfile });
    (getDocs as vi.Mock).mockResolvedValue({ empty: true, docs: [] });

    const { result } = renderHook(() => useMemberProfile('test-uid'));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(result.current.profile).toEqual(mockProfile);
      expect(result.current.activeMembership).toBeNull();
    });
  });
});
