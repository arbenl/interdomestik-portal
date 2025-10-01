import { z } from 'zod';

// Regions: store codes, not free text
export const regionEnum = z.enum([
  'PRISHTINA',
  'PRIZREN',
  'GJAKOVA',
  'PEJA',
  'FERIZAJ',
  'GJILAN',
  'MITROVICA',
]);

// Profile input: PII-light; allow optional empty strings for phone/orgId
export const upsertProfileSchema = z.object({
  name: z.string().min(2).max(100),
  region: regionEnum,
  phone: z
    .union([z.string().min(7).max(20), z.literal('')])
    .optional()
    .transform((v) => (v === '' ? undefined : v)),
  orgId: z
    .union([z.string().max(50), z.literal('')])
    .optional()
    .transform((v) => (v === '' ? undefined : v)),
});

export const setUserRoleSchema = z.object({
  uid: z.string().min(6),
  role: z.enum(['member', 'agent', 'admin']),
  allowedRegions: z.array(regionEnum).optional().default([]),
});

export const updateMfaPreferenceSchema = z.object({
  enabled: z.boolean(),
  uid: z.string().min(6).optional(),
});

export const shareDocumentSchema = z.object({
  documentId: z.string().min(6).max(120).optional(),
  fileName: z.string().min(1).max(200),
  storagePath: z.string().min(1).max(500),
  mimeType: z.string().min(3).max(120).optional(),
  note: z.string().max(500).optional(),
  recipients: z
    .array(
      z.object({
        uid: z.string().min(6).max(120),
      })
    )
    .min(1, 'At least one recipient is required'),
});

export const startMembershipSchema = z.object({
  uid: z.string().min(6),
  year: z.number().int().min(2020).max(2100),
  price: z.number().nonnegative().optional().default(0),
  currency: z.enum(['EUR']).optional().default('EUR'),
  paymentMethod: z
    .enum(['cash', 'card', 'bank', 'other'])
    .optional()
    .default('bank'),
  externalRef: z.string().optional().nullable(),
});

export const agentCreateMemberSchema = z.object({
  email: z.string().email().max(320),
  name: z.string().min(2).max(100),
  region: regionEnum,
  phone: z
    .union([z.string().min(7).max(20), z.literal('')])
    .optional()
    .transform((v) => (v === '' ? undefined : v)),
  orgId: z
    .union([z.string().max(50), z.literal('')])
    .optional()
    .transform((v) => (v === '' ? undefined : v)),
});
