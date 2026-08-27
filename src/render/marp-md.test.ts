import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseDeck } from '../parse/deck.js';
import { toMarpMarkdown } from './marp-md.js';

describe('toMarpMarkdown', () => {
  it('emits short titles as plain markdown headings at full size', () => {
    const md = toMarpMarkdown(parseDeck('<!-- _class: title-bullets -->\n# Short title\n- a'));
    expect(md).toContain('# Short title');
    expect(md).not.toContain('<h1');
  });

  it('shrinks titles that would overflow the Keynote title box, like Keynote does', () => {
    const long = 'This headline is far too long to fit the Keynote title box at full size';
    const md = toMarpMarkdown(parseDeck(`<!-- _class: title-bullets -->\n# ${long}\n- a`));
    const h1 = /<h1 style="font-size: (\d+)pt">/.exec(md);
    expect(h1).not.toBeNull();
    expect(Number(h1?.[1])).toBeLessThan(112);
    expect(Number(h1?.[1])).toBeGreaterThanOrEqual(40);
  });

  it('keeps bullets as a markdown list after a shrunk HTML title (blank line ends the HTML block)', () => {
    const long = 'This headline is far too long to fit the Keynote title box at full size';
    const md = toMarpMarkdown(parseDeck(`<!-- _class: title-bullets -->\n# ${long}\n- first bullet\n- second bullet`));
    expect(md).toMatch(/<\/h1>\n\n- first bullet/);
  });
});

describe('image references for Marp', () => {
  it('emits local images as percent-encoded absolute paths so spaces survive CommonMark', () => {
    const dir = mkdtempSync(join(tmpdir(), 'whitedeck img test '));
    const img = join(dir, 'chart one.png');
    writeFileSync(img, 'png');
    const md = toMarpMarkdown(parseDeck(`<!-- _class: photo-vertical -->\n# A headline for the photo slide test\n![](${img})`));
    expect(md).not.toContain('chart one.png');
    expect(md).toContain(encodeURIComponent('chart one.png'));
    expect(md).toMatch(/!\[\]\(\/[^ )]+\)/);
  });

  it('fails the build loudly when a referenced image does not exist', () => {
    const deck = parseDeck('<!-- _class: photo-vertical -->\n# A headline for the photo slide test\n![](charts/does-not-exist.png)');
    expect(() => toMarpMarkdown(deck)).toThrow(/image not found/);
  });

  it('passes http and data URIs through untouched', () => {
    const deck = parseDeck('<!-- _class: photo-vertical -->\n# A headline for the photo slide test\n![](https://example.com/a b.png)');
    expect(toMarpMarkdown(deck)).toContain('![](https://example.com/a b.png)');
  });
});

describe('quote shrink-to-fit', () => {
  it('keeps short quotes at full size as plain markdown blockquotes', () => {
    const md = toMarpMarkdown(parseDeck('<!-- _class: quote -->\n> "Short and sweet."\n> -- Someone'));
    expect(md).toContain('> "Short and sweet."');
    expect(md).not.toContain('<blockquote style');
  });

  it('shrinks a long quote and lets the box grow instead of painting over the attribution', () => {
    const long = 'x'.repeat(450);
    const md = toMarpMarkdown(parseDeck(`<!-- _class: quote -->\n> "${long}"\n> -- Someone`));
    const m = /<blockquote style="font-size: (\d+)pt; height: auto/.exec(md);
    expect(m).not.toBeNull();
    expect(Number(m?.[1])).toBeLessThan(48);
    expect(Number(m?.[1])).toBeGreaterThanOrEqual(24);
  });
});
