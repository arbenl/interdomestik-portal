import callFn from '@/services/functionsClient';

export type UpdateMfaPreferenceResponse = {
  ok: boolean;
  uid: string;
  enabled: boolean;
};

export async function updateMfaPreference(enabled: boolean): Promise<UpdateMfaPreferenceResponse> {
  const result = await callFn<{ enabled: boolean }, UpdateMfaPreferenceResponse>('updateMfaPreference', { enabled });
  return {
    ok: Boolean(result?.ok ?? true),
    uid: result?.uid ?? '',
    enabled: Boolean(result?.enabled ?? enabled),
  };
}
