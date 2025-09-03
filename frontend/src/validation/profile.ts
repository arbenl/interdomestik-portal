import { z } from 'zod';
import { REGIONS } from '../constants/regions';

export const regionEnum = z.enum(REGIONS as unknown as [string, ...string[]]);

export const ProfileInput = z.object({
  name: z.string().trim().min(2).max(100),
  region: regionEnum,
  phone: z.union([z.string().trim().min(7).max(20), z.literal('')]).optional(),
  orgId: z.union([z.string().trim().max(50), z.literal('')]).optional(),
});

export type ProfileInputType = z.infer<typeof ProfileInput>;

