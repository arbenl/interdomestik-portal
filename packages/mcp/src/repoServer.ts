import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from './z.js';
import { execa } from 'execa';
import fg from 'fast-glob';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFile } from 'node:fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// packages/mcp/src -> repo root
const repoRoot = resolve(__dirname, '..', '..', '..');

const listFilesInput = {
  globs: z.array(z.string()).optional(),
  max: z.number().optional(),
};

const searchCodeInput = {
  query: z.string(),
  mode: z.enum(['regex', 'literal']).optional().default('regex'),
  globs: z.array(z.string()).optional(),
  context: z.number().optional(),
  caseSensitive: z.boolean().optional(),
  maxResults: z.number().optional(),
  maxFileSizeBytes: z.number().optional(),
};

const gitWhoInput = {
  path: z.string(),
  line: z.number().optional(),
};

export function registerRepoTools(server: McpServer) {
  server.registerTool(
    'list-files',
    {
      title: 'List Files',
      description: 'List repository-relative files.',
      inputSchema: listFilesInput,
      outputSchema: {
        files: z.array(z.string()),
      },
    },
    async (input) => {
      const { globs, max } = input;
      const files = await fg(globs ?? '**/*', {
        cwd: repoRoot,
        ignore: ['**/node_modules/**', '**/.git/**'],
        onlyFiles: true,
        absolute: false,
      });

      const limitedFiles = max ? files.slice(0, max) : files;

      const output = { files: limitedFiles };

      return {
        content: [{ type: 'text', text: JSON.stringify(output, null, 2) }],
        structuredContent: output,
      };
    }
  );

  server.registerTool(
    'search-code',
    {
      title: 'Search Code',
      description: 'Search for code in the repository.',
      inputSchema: searchCodeInput,
      outputSchema: {
        results: z.array(
          z.object({
            path: z.string(),
            line: z.number(),
            text: z.string(),
            contextBefore: z.array(z.string()).optional(),
            contextAfter: z.array(z.string()).optional(),
          })
        ),
      },
    },
    async (input) => {
      const {
        query,
        mode = 'regex',
        globs,
        context = 0,
        caseSensitive = false,
        maxResults = 100,
        maxFileSizeBytes = 1_000_000,
      } = input;

      const results: any[] = [];
      const escaped = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const pattern = mode === 'literal' ? escaped(query) : query;
      const regex = new RegExp(pattern, caseSensitive ? '' : 'i');

      const files = await fg(globs ?? '**/*', {
        cwd: repoRoot,
        ignore: ['**/node_modules/**', '**/.git/**', '**/dist/**'],
        onlyFiles: true,
        absolute: true, // Read paths need to be absolute
      });

      for (const file of files) {
        if (results.length >= maxResults) {
          break;
        }

        try {
          const stat = await import('node:fs/promises').then((m) =>
            m.stat(file)
          );
          if (stat.size > maxFileSizeBytes) {
            continue;
          }
          const content = await readFile(file, 'utf-8');
          const lines = content.split('\n');

          for (let i = 0; i < lines.length; i++) {
            if (results.length >= maxResults) {
              break;
            }

            const line = lines[i];
            if (regex.test(line)) {
              const result = {
                path: file.replace(`${repoRoot}/`, ''), // Make path relative
                line: i + 1,
                text: line.trim(),
                contextBefore: lines
                  .slice(Math.max(0, i - context), i)
                  .map((l) => l.trim()),
                contextAfter: lines
                  .slice(i + 1, i + 1 + context)
                  .map((l) => l.trim()),
              };
              results.push(result);
            }
          }
        } catch (e) {
          // Ignore files that can't be read (e.g. binary)
        }
      }

      const output = { results };
      return {
        content: [{ type: 'text', text: JSON.stringify(output, null, 2) }],
        structuredContent: output,
      };
    }
  );

  server.registerTool(
    'git-who',
    {
      title: 'Git Who',
      description: 'Get last commit/author for a file path.',
      inputSchema: gitWhoInput,
      outputSchema: {
        commit: z.string(),
        author: z.string(),
        authorMail: z.string(),
        authorTime: z.string(),
        summary: z.string(),
      },
    },
    async (input) => {
      const { path, line } = input;
      const args = ['blame', '--porcelain'];
      if (line) {
        args.push(`-L${line},${line}`);
      }
      args.push(path);

      try {
        const { stdout } = await execa('git', args, { cwd: repoRoot });
        const lines = stdout.split('\n');
        const commit = lines[0].split(' ')[0];
        const author = lines.find((l) => l.startsWith('author '))?.substring(7);
        const authorMail = lines
          .find((l) => l.startsWith('author-mail '))
          ?.substring(12);
        const authorTime = lines
          .find((l) => l.startsWith('author-time '))
          ?.substring(12);
        const summary = lines
          .find((l) => l.startsWith('summary '))
          ?.substring(8);

        const output = {
          commit,
          author,
          authorMail,
          authorTime,
          summary,
        };

        return {
          content: [{ type: 'text', text: JSON.stringify(output, null, 2) }],
          structuredContent: output,
        };
      } catch (e: any) {
        return {
          content: [{ type: 'text', text: e.stderr || e.message }],
          isError: true,
        };
      }
    }
  );
}
