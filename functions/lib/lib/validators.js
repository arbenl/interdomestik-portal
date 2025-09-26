"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.agentCreateMemberSchema = exports.startMembershipSchema = exports.shareDocumentSchema = exports.updateMfaPreferenceSchema = exports.setUserRoleSchema = exports.upsertProfileSchema = exports.regionEnum = void 0;
const zod_1 = require("zod");
// Regions: store codes, not free text
exports.regionEnum = zod_1.z.enum([
    'PRISHTINA',
    'PRIZREN',
    'GJAKOVA',
    'PEJA',
    'FERIZAJ',
    'GJILAN',
    'MITROVICA',
]);
// Profile input: PII-light; allow optional empty strings for phone/orgId
exports.upsertProfileSchema = zod_1.z.object({
    name: zod_1.z.string().min(2).max(100),
    region: exports.regionEnum,
    phone: zod_1.z
        .union([zod_1.z.string().min(7).max(20), zod_1.z.literal('')])
        .optional()
        .transform((v) => (v === '' ? undefined : v)),
    orgId: zod_1.z
        .union([zod_1.z.string().max(50), zod_1.z.literal('')])
        .optional()
        .transform((v) => (v === '' ? undefined : v)),
});
exports.setUserRoleSchema = zod_1.z.object({
    uid: zod_1.z.string().min(6),
    role: zod_1.z.enum(['member', 'agent', 'admin']),
    allowedRegions: zod_1.z.array(exports.regionEnum).optional().default([]),
});
exports.updateMfaPreferenceSchema = zod_1.z.object({
    enabled: zod_1.z.boolean(),
    uid: zod_1.z.string().min(6).optional(),
});
exports.shareDocumentSchema = zod_1.z.object({
    documentId: zod_1.z.string().min(6).max(120).optional(),
    fileName: zod_1.z.string().min(1).max(200),
    storagePath: zod_1.z.string().min(1).max(500),
    mimeType: zod_1.z.string().min(3).max(120).optional(),
    note: zod_1.z.string().max(500).optional(),
    recipients: zod_1.z.array(zod_1.z.object({
        uid: zod_1.z.string().min(6).max(120),
    })).min(1, 'At least one recipient is required'),
});
exports.startMembershipSchema = zod_1.z.object({
    uid: zod_1.z.string().min(6),
    year: zod_1.z.number().int().min(2020).max(2100),
    price: zod_1.z.number().nonnegative().optional().default(0),
    currency: zod_1.z.enum(['EUR']).optional().default('EUR'),
    paymentMethod: zod_1.z.enum(['cash', 'card', 'bank', 'other']).optional().default('bank'),
    externalRef: zod_1.z.string().optional().nullable(),
});
exports.agentCreateMemberSchema = zod_1.z.object({
    email: zod_1.z.string().email().max(320),
    name: zod_1.z.string().min(2).max(100),
    region: exports.regionEnum,
    phone: zod_1.z
        .union([zod_1.z.string().min(7).max(20), zod_1.z.literal('')])
        .optional()
        .transform((v) => (v === '' ? undefined : v)),
    orgId: zod_1.z
        .union([zod_1.z.string().max(50), zod_1.z.literal('')])
        .optional()
        .transform((v) => (v === '' ? undefined : v)),
});
