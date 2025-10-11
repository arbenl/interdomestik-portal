import { createRequire } from 'node:module';

// Load zod from the SDK's module graph to ensure ABI compatibility
const r = createRequire(import.meta.url);
const sdkEntry = r.resolve('@modelcontextprotocol/sdk/server/mcp.js');
const requireFromSdk = createRequire(sdkEntry);

const zodModule = requireFromSdk('zod');
export const z = zodModule.z ?? zodModule;
