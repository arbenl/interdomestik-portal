import { createRequire } from 'node:module';

const requireFromHere = createRequire(import.meta.url);
const requireFromSdk = createRequire(
  require.resolve('@modelcontextprotocol/sdk/server/mcp.js')
);

console.log('Zod path from CWD:', requireFromHere.resolve('zod'));
console.log('Zod path from SDK:', requireFromSdk.resolve('zod'));
