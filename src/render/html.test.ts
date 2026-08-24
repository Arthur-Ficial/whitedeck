import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseDeck } from '../parse/deck.js';
import { renderHtml } from './html.js';

const DEMO_MD = [
  '---',
  'title: HTML Render Demo',
  '---',
  '',
  '<!-- _class: title -->',
  '# Hello Keynote',
  '## A subtitle',
  '',
  '---',
  '',
  '<!-- _class: title-bullets -->',
  '# Agenda',
  '- First',
  '- Second',
  '',
  '---',
  '',
  '<!-- _class: quote -->',
  '> "Simplicity is the ultimate sophistication."',
  '> -- Leonardo da Vinci',
].join('\n');

describe('renderHtml (real marp-cli)', () => {
  it('renders a deck to a self-contained HTML file with layout classes and theme geometry', async () => {
    const outDir = mkdtempSync(join(tmpdir(), 'whitedeck-html-'));
    const outPath = join(outDir, 'demo.html');

    await renderHtml(parseDeck(DEMO_MD), outPath);

    const html = readFileSync(outPath, 'utf8');
    expect(html).toContain('class="title"');
    expect(html).toContain('class="title-bullets"');
    expect(html).toContain('class="quote"');
    expect(html).toContain('Hello Keynote');
    expect(html).toContain('Leonardo da Vinci');
    expect(html).toMatch(/width:\s*2560px/);
    expect(html).toMatch(/font-size:\s*112pt/);
  });
});
