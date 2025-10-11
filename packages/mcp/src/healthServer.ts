import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from './z.js';
import * as net from 'net';
import { createRequire } from 'node:module';
import { promises as fs } from 'node:fs';
import { dirname, join } from 'node:path';

import { execa } from 'execa';

const require = createRequire(import.meta.url);

const checkPortsInput = {
  host: z.string().optional(),
  ports: z.array(z.number()).optional(),
};

const waitForEmulatorsInput = {
  timeoutMs: z.number().optional(),
  host: z.string().optional(),
  ports: z.array(z.number()).optional(),
};

const defaultPorts = [5000, 5001, 8080, 9099];

function checkPort(
  port: number,
  host: string
): Promise<{ port: number; isOpen: boolean }> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    const timeout = 200;

    socket.setTimeout(timeout);

    socket.on('connect', () => {
      socket.destroy();
      resolve({ port, isOpen: true });
    });

    socket.on('timeout', () => {
      socket.destroy();
      resolve({ port, isOpen: false });
    });

    socket.on('error', () => {
      socket.destroy();
      resolve({ port, isOpen: false });
    });

    socket.connect(port, host);
  });
}

export function registerHealthTools(server: McpServer) {
  server.registerTool(
    'env-info',
    {
      title: 'Environment Info',
      description: 'Get Node/pnpm versions, OS, and cwd.',
      inputSchema: {},
      outputSchema: {
        nodeVersion: z.string(),
        pnpmVersion: z.string(),
        os: z.string(),
        cwd: z.string(),
      },
    },
    async () => {
      const pnpmVersion = await execa('pnpm', ['--version']).then(
        (res) => res.stdout
      );
      const output = {
        nodeVersion: process.version,
        pnpmVersion,
        os: process.platform,
        cwd: process.cwd(),
      };
      return {
        content: [{ type: 'text', text: JSON.stringify(output, null, 2) }],
        structuredContent: output,
      };
    }
  );

  server.registerTool(
    'check-ports',
    {
      title: 'Check Ports',
      description: 'Check if ports are open.',
      inputSchema: checkPortsInput,
      outputSchema: {
        ports: z.array(z.object({ port: z.number(), isOpen: z.boolean() })),
      },
    },
    async (input) => {
      const portsToCheck = input.ports ?? defaultPorts;
      const host = input.host ?? '127.0.0.1';
      const results = await Promise.all(
        portsToCheck.map((p: number) => checkPort(p, host))
      );
      const output = { ports: results };
      return {
        content: [{ type: 'text', text: JSON.stringify(output, null, 2) }],
        structuredContent: output,
      };
    }
  );

  server.registerTool(
    'wait-for-emulators',
    {
      title: 'Wait for Emulators',
      description: 'Wait for emulators to be ready.',
      inputSchema: waitForEmulatorsInput,
      outputSchema: {
        success: z.boolean(),
        durationMs: z.number(),
        checkedPorts: z.array(
          z.object({ port: z.number(), isOpen: z.boolean() })
        ),
        error: z.string().optional(),
      },
    },
    async (input) => {
      const timeout = input.timeoutMs ?? 60000;
      const start = Date.now();
      const portsToCheck = input.ports ?? defaultPorts;
      const host = input.host ?? '127.0.0.1';

      while (Date.now() - start < timeout) {
        const results = await Promise.all(
          portsToCheck.map((p: number) => checkPort(p, host))
        );
        if (results.every((res) => res.isOpen)) {
          const output = {
            success: true,
            durationMs: Date.now() - start,
            checkedPorts: results,
          };
          return {
            content: [{ type: 'text', text: JSON.stringify(output, null, 2) }],
            structuredContent: output,
          };
        }
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      const finalResults = await Promise.all(
        portsToCheck.map((p: number) => checkPort(p, host))
      );
      const closed = finalResults.filter((r) => !r.isOpen).map((r) => r.port);
      const output = {
        success: false,
        durationMs: Date.now() - start,
        checkedPorts: finalResults,
        error: `Timed out after ${Date.now() - start}ms waiting for ${host}:${closed.join(', ')} to open`,
      };

      return {
        content: [{ type: 'text', text: JSON.stringify(output, null, 2) }],
        structuredContent: output,
        isError: true,
      };
    }
  );

  server.registerTool(
    'zod-info',
    {
      title: 'Zod Info',
      description: 'Get Zod module path and version.',
      inputSchema: {},
      outputSchema: {
        zodPath: z.string(),
        zodVersion: z.string(),
      },
    },
    async () => {
      const zodPath = require.resolve('zod');
      const packagePath = join(dirname(zodPath), 'package.json');
      const zodPackageJson = JSON.parse(
        await fs.readFile(packagePath, 'utf-8')
      );
      const zodVersion = zodPackageJson.version;
      const output = {
        zodPath,
        zodVersion,
      };
      return {
        content: [{ type: 'text', text: JSON.stringify(output, null, 2) }],
        structuredContent: output,
      };
    }
  );
}
