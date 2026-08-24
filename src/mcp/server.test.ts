import { existsSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const ROOT = new URL('..', import.meta.url).pathname;

describe('whitedeck MCP server (real stdio round-trip)', () => {
  const client = new Client({ name: 'whitedeck-test', version: '0.0.0' });

  beforeAll(async () => {
    const transport = new StdioClientTransport({
      command: process.execPath,
      args: [join(ROOT, '..', 'dist', 'mcp', 'server.js')],
    });
    await client.connect(transport);
  }, 60_000);

  afterAll(async () => {
    await client.close();
  });

  it('lists the whitedeck tools', async () => {
    const { tools } = await client.listTools();
    const names = tools.map((tool) => tool.name).sort();
    expect(names).toEqual(['whitedeck_build', 'whitedeck_layouts', 'whitedeck_validate']);
  });

  it('returns all 12 layouts', async () => {
    const result = await client.callTool({ name: 'whitedeck_layouts', arguments: {} });
    const text = (result.content as { type: string; text: string }[])[0]?.text ?? '';
    const layouts = JSON.parse(text) as { id: string }[];
    expect(layouts).toHaveLength(12);
  });

  it('validates markdown', async () => {
    const result = await client.callTool({
      name: 'whitedeck_validate',
      arguments: { markdown: '# Hi\n\n---\n\n- a' },
    });
    const text = (result.content as { type: string; text: string }[])[0]?.text ?? '';
    expect(JSON.parse(text)).toMatchObject({ ok: true, slides: 2 });
  });

  it('builds a pptx from markdown', async () => {
    const outDir = mkdtempSync(join(tmpdir(), 'whitedeck-mcp-'));
    const result = await client.callTool({
      name: 'whitedeck_build',
      arguments: { markdown: '# From MCP', formats: ['pptx'], outDir, name: 'mcp-demo' },
    });
    const text = (result.content as { type: string; text: string }[])[0]?.text ?? '';
    const report = JSON.parse(text) as { files: string[] };
    expect(report.files).toHaveLength(1);
    expect(existsSync(report.files[0] ?? '')).toBe(true);
  });
});
