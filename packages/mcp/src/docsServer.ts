import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from './z.js';
import { readdir, readFile, stat } from 'node:fs/promises';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Dirent } from 'node:fs';

const DOC_DIRECTORIES = ['docs', 'specs'];
const DOC_FILES = ['frontend/TESTING.md', 'docs/TESTING.md'];

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function projectRoot() {
  // packages/mcp/src -> repo root is three levels up
  return resolve(__dirname, '..', '..', '..');
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
  const seen = new Set<string>();
  const entries: { path: string; size: number }[] = [];

  async function addEntry(relativePath: string) {
    if (seen.has(relativePath)) return;
    const absPath = join(root, relativePath);
    const stats = await stat(absPath);
    entries.push({ path: relativePath, size: stats.size });
    seen.add(relativePath);
  }

  async function walk(relativePath: string) {
    const absPath = join(root, relativePath);
    const stats = await stat(absPath);
    if (stats.isFile()) {
      await addEntry(relativePath);
      return;
    }
    const children: Dirent[] = await readdir(absPath, { withFileTypes: true });
    for (const entry of children) {
      const childPath = join(relativePath, entry.name);
      if (entry.isDirectory()) {
        await walk(childPath);
      } else {
        await addEntry(childPath);
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
      await addEntry(filePath);
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

type SearchMatch = {
  path: string;
  lineNumber: number;
  line: string;
};

async function searchDocs(query: string): Promise<SearchMatch[]> {
  const documents = await listDocs();
  const results: SearchMatch[] = [];
  const lowerCaseQuery = query.toLowerCase();

  for (const doc of documents) {
    const { contents } = await readDoc(doc.path);
    const lines = contents.split('\n');
    lines.forEach((line, i) => {
      if (line.toLowerCase().includes(lowerCaseQuery)) {
        results.push({
          path: doc.path,
          lineNumber: i + 1,
          line: line.trim(),
        });
      }
    });
  }
  return results;
}

export function registerDocsTools(server: McpServer) {
  server.registerTool(
    'list-documents',
    {
      title: 'List Project Docs',
      description:
        'Enumerate documents under docs/, specs/, and key testing guides.',
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
      description:
        'Read a project document by relative path from the repo root.',
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

  server.registerTool(
    'search-documents',
    {
      title: 'Search Project Docs',
      description: 'Search for a keyword across all project documents.',
      inputSchema: {
        query: z.string().describe('The keyword to search for.'),
      },
      outputSchema: {
        results: z.array(
          z.object({
            path: z.string(),
            lineNumber: z.number(),
            line: z.string(),
          })
        ),
      },
    },
    async ({ query }) => {
      const results = await searchDocs(query);
      const output = { results };
      return {
        content: [
          {
            type: 'text',
            text:
              results.length > 0
                ? results
                    .map(
                      (r) => `${r.path}:${r.lineNumber}:${r.line.slice(0, 100)}`
                    )
                    .join('\n')
                : 'No results found.',
          },
        ],
        structuredContent: output,
      };
    }
  );
}
