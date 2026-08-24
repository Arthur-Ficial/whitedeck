#!/usr/bin/env node
import { join, resolve } from 'node:path';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { OUTPUT_FORMATS, renderFormat, resolveFormats } from '../formats.js';
import { parseDeck } from '../parse/deck.js';
import { LAYOUT_IDS, layoutOf } from '../theme/white.js';
const server = new McpServer({ name: 'whitedeck', version: '0.1.0' });
const jsonResult = (value) => ({
    content: [{ type: 'text', text: JSON.stringify(value, null, 2) }],
});
server.registerTool('whitedeck_layouts', {
    description: 'List the 12 Keynote White slide layouts whitedeck supports, with their markdown directive ids.',
    inputSchema: {},
}, () => jsonResult(LAYOUT_IDS.map((id) => ({ id, keynoteName: layoutOf(id).keynoteName }))));
server.registerTool('whitedeck_validate', {
    description: 'Parse and validate whitedeck markdown; returns slide count and resolved layouts.',
    inputSchema: { markdown: z.string().describe('The deck markdown to validate') },
}, ({ markdown }) => {
    const deck = parseDeck(markdown);
    return jsonResult({ ok: true, slides: deck.slides.length, layouts: deck.slides.map((s) => s.layout) });
});
server.registerTool('whitedeck_build', {
    description: 'Render whitedeck markdown into presentation files that look exactly like Apple Keynote White theme. Formats: html, pdf, pptx (editable), key (native Keynote, macOS only).',
    inputSchema: {
        markdown: z.string().describe('The deck markdown'),
        formats: z.array(z.enum(['html', 'pdf', 'pptx', 'key', 'all'])).describe('Output formats'),
        outDir: z.string().describe('Directory to write output files into'),
        name: z.string().optional().describe('Base file name (default: deck)'),
    },
}, async ({ markdown, formats, outDir, name }) => {
    const deck = parseDeck(markdown);
    const baseName = name ?? 'deck';
    const files = [];
    const resolved = formats.flatMap((format) => resolveFormats(format));
    for (const format of [...new Set(resolved)]) {
        const outPath = join(resolve(outDir), `${baseName}.${format}`);
        await renderFormat(format, deck, outPath);
        files.push(outPath);
    }
    return jsonResult({ ok: true, files, formats: OUTPUT_FORMATS });
});
const transport = new StdioServerTransport();
await server.connect(transport);
