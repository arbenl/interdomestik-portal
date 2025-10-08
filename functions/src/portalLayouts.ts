import * as functions from 'firebase-functions/v1';
import { log } from './lib/logger';
import { upsertPortalLayoutLogic } from './lib/dashboard';

const REGION = 'europe-west1' as const;

export const upsertPortalLayout = functions
  .region(REGION)
  .https.onCall(async (data, context) => {
    try {
      return await upsertPortalLayoutLogic(data, context);
    } catch (error) {
      log('upsert_portal_layout_error', { error: String(error) });
      throw error;
    }
  });
