import { useCallback, useState } from 'react';
import { auth } from '@/lib/firebase';
import { useToast } from '@/components/ui/useToast';
import { updateMfaPreference } from '@/services/security';
import { useAuth } from '@/hooks/useAuth';

export function useMfaPreference() {
  const { mfaEnabled } = useAuth();
  const { push } = useToast();
  const [updating, setUpdating] = useState(false);

  const setMfaPreference = useCallback(async (enabled: boolean): Promise<boolean> => {
    setUpdating(true);
    try {
      const response = await updateMfaPreference(enabled);
      if (!response.ok) {
        throw new Error('Update rejected');
      }
      await auth.currentUser?.getIdToken(true);
      push({
        type: 'success',
        message: enabled
          ? 'Multi-factor authentication marked as enabled.'
          : 'Multi-factor authentication preference updated.',
      });
      return true;
    } catch (error) {
      console.error('[mfa] Failed to update preference', error);
      push({ type: 'error', message: 'Unable to update MFA preference. Try again.' });
      return false;
    } finally {
      setUpdating(false);
    }
  }, [push]);

  return { mfaEnabled, setMfaPreference, updating };
}

export default useMfaPreference;
