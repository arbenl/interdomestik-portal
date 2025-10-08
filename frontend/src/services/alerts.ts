import callFn from '@/services/functionsClient';

export type AcknowledgeAlertResponse = {
  acknowledged: boolean;
  acknowledgedAt: string;
};

export async function acknowledgeAlert(alertId: string) {
  if (!alertId || typeof alertId !== 'string') {
    throw new Error('alertId is required');
  }
  return callFn<{ alertId: string }, AcknowledgeAlertResponse>(
    'acknowledgeAlert',
    { alertId }
  );
}
