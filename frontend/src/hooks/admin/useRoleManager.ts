import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { httpsCallable } from 'firebase/functions';
import { functions, auth } from '@/firebase';

type Role = 'member' | 'agent' | 'admin';

const searchUserByEmail = httpsCallable<{ email: string }, { uid: string }>(functions, 'searchUserByEmail');
const setUserRole = httpsCallable<{ uid: string; role: Role; allowedRegions: string[] }, { message: string }>(functions, 'setUserRole');
const getUserClaims = httpsCallable<{ uid: string }, { uid: string; claims: Record<string, unknown> }>(functions, 'getUserClaims');

export function useRoleManager() {
  const queryClient = useQueryClient();
  const [targetUid, setTargetUid] = useState('');
  const [claims, setClaims] = useState<Record<string, unknown> | null>(null);

  const { mutate: findUser, isPending: isFindingUser, error: findUserError } = useMutation({
    mutationFn: async (email: string) => {
      const res = await searchUserByEmail({ email });
      const uid = res.data?.uid;
      if (!uid) throw new Error('User not found');
      setTargetUid(uid);
      return uid;
    },
  });

  const { mutate: applyRole, isPending: isApplyingRole, error: applyRoleError } = useMutation({
    mutationFn: async ({ uid, role, allowedRegions }: { uid: string; role: Role; allowedRegions: string[] }) => {
      await setUserRole({ uid, role, allowedRegions });
    },
    onSuccess: () => {
      return queryClient.invalidateQueries({ queryKey: ['userClaims', targetUid] });
    },
  });

  const { mutate: viewClaims, isPending: isViewingClaims, error: viewClaimsError } = useMutation({
    mutationFn: async (uid: string) => {
      const r = await getUserClaims({ uid });
      setClaims(r.data?.claims || {});
    },
  });

  const { mutate: refreshToken, isPending: isRefreshingToken, error: refreshTokenError } = useMutation({
    mutationFn: async () => {
      await auth.currentUser?.getIdToken(true);
    },
  });

  return {
    busy: isFindingUser || isApplyingRole || isViewingClaims || isRefreshingToken,
    error: findUserError?.message || applyRoleError?.message || viewClaimsError?.message || refreshTokenError?.message,
    success: null,
    claims,
    targetUid,
    findUser,
    applyRole,
    viewClaims,
    setTargetUid,
    refreshToken,
  };
}
