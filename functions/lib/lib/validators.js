"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.startMembershipSchema = exports.setUserRoleSchema = exports.upsertProfileSchema = exports.regionEnum = void 0;
const zod_1 = require("zod");
exports.regionEnum = zod_1.z.enum(['PRISHTINA', 'PEJA', 'GJAKOVA', 'MITROVICA', 'FERIZAJ', 'PRIZREN', 'GJILAN']);
exports.upsertProfileSchema = zod_1.z.object({ name: zod_1.z.string().min(2).max(120), phone: zod_1.z.string().min(5).max(32).optional().nullable(), region: exports.regionEnum, orgId: zod_1.z.string().max(64).optional().nullable() });
exports.setUserRoleSchema = zod_1.z.object({ uid: zod_1.z.string().min(6), role: zod_1.z.enum(['member', 'agent', 'admin']), allowedRegions: zod_1.z.array(exports.regionEnum).optional().default([]) });
exports.startMembershipSchema = zod_1.z.object({ uid: zod_1.z.string().min(6), year: zod_1.z.number().int().min(2020).max(2100), price: zod_1.z.number().nonnegative().optional().default(0), currency: zod_1.z.enum(['EUR']).optional().default('EUR'), paymentMethod: zod_1.z.enum(['bank', 'cash', 'other']).optional().default('bank'), externalRef: zod_1.z.string().optional().nullable() });
