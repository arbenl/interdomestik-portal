import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { readdir, readFile, stat } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import type { Dirent } from 'node:fs';

const DOC_DIRECTORIES = ['docs', 'specs'];
const DOC_FILES = ['frontend/TESTING.md', 'docs/TESTING.md'];

function projectRoot() {
  return resolve(import.meta.dirname, '..', '..');
}

async function fileExists(relativePath: string) {
  try {
    const root = projectRoot();
    await stat(join(root, relativePath));
    return true;
  } catch {
    return false;
  }
}

async function listDocs(): Promise<{ path: string; size: number }[]> {
  const root = projectRoot();
  const entries: { path: string; size: number }[] = [];

  async function walk(relativePath: string) {
    const absPath = join(root, relativePath);
    const stats = await stat(absPath);
    if (stats.isFile()) {
      entries.push({ path: relativePath, size: stats.size });
      return;
    }
    const children: Dirent[] = await readdir(absPath, { withFileTypes: true });
    for (const entry of children) {
      const childPath = join(relativePath, entry.name);
      if (entry.isDirectory()) {
        await walk(childPath);
      } else {
        const childStats = await stat(join(root, childPath));
        entries.push({ path: childPath, size: childStats.size });
      }
    }
  }

  for (const dir of DOC_DIRECTORIES) {
    if (await fileExists(dir)) {
      await walk(dir);
    }
  }

  for (const filePath of DOC_FILES) {
    if (await fileExists(filePath)) {
      const absPath = join(root, filePath);
      const fileStats = await stat(absPath);
      entries.push({ path: filePath, size: fileStats.size });
    }
  }

  entries.sort((a, b) => a.path.localeCompare(b.path));
  return entries;
}

async function readDoc(relativePath: string) {
  const root = projectRoot();
  const absPath = resolve(root, relativePath);
  const contents = await readFile(absPath, 'utf8');
  return { path: relativePath, contents };
}

async function main() {
  const server = new McpServer({
    name: 'project-docs',
    version: '0.1.0',
  });

  server.registerTool(
    'list-documents',
    {
      title: 'List Project Docs',
      description: 'Enumerate documents under docs/, specs/, and key testing guides.',
      outputSchema: {
        documents: z.array(
          z.object({
            path: z.string(),
            size: z.number(),
          })
        ),
      },
    },
    async () => {
      const documents = await listDocs();
      const output = { documents };
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(output, null, 2),
          },
        ],
        structuredContent: output,
      };
    }
  );

  server.registerTool(
    'read-document',
    {
      title: 'Read Project Doc',
      description: 'Read a project document by relative path from the repo root.',
      inputSchema: {
        path: z
          .string()
          .describe('Relative path to the document (e.g. docs/TESTING.md)'),
      },
      outputSchema: {
        path: z.string(),
        contents: z.string(),
      },
    },
    async ({ path }) => {
      if (!(await fileExists(path))) {
        const message = `Document not found: ${path}`;
        return {
          content: [{ type: 'text', text: message }],
          isError: true,
        };
      }

      const doc = await readDoc(path);
      return {
        content: [{ type: 'text', text: doc.contents }],
        structuredContent: doc,
      };
    }
  );

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error('[project-docs] Server error', error);
  process.exit(1);
});
