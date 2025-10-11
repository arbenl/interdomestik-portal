import { Client } from '@modelcontextprotocol/sdk/client';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = resolve(__dirname, '..');

async function main() {
  const args = process.argv.slice(2);
  if (args.length < 1) {
    console.error('Usage: tsx scripts/mcp-client.ts <tool-name> [json-args]');
    process.exit(1);
  }

  const [toolName, jsonArgs] = args;

  let toolArgs = {};
  if (jsonArgs) {
    try {
      toolArgs = JSON.parse(jsonArgs);
    } catch (e) {
      console.error(
        `Invalid JSON arguments: ${e instanceof Error ? e.message : String(e)}`
      );
      process.exit(1);
    }
  }

  const transport = new StdioClientTransport({
    command: 'pnpm',
    args: ['mcp'],
    cwd: repoRoot,
  });

  const client = new Client({ name: 'mcp-cli-client', version: '0.1.0' });

  try {
    await client.connect(transport);

    console.log(`Calling tool "${toolName}"...`);

    const result = await client.callTool({
      name: toolName,
      arguments: toolArgs,
    });

    if (result.isError) {
      console.error('Tool execution failed:');
      console.error(result.content[0]?.text ?? 'No error message provided.');
    } else {
      console.log('Tool execution successful:');
      console.log(
        JSON.stringify(
          result.structuredContent ?? result.content[0]?.text,
          null,
          2
        )
      );
    }
  } catch (error) {
    console.error(
      `An unexpected error occurred: ${error instanceof Error ? error.message : String(error)}`
    );
  } finally {
    await client.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
