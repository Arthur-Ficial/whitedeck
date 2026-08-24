import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import JSZip from 'jszip';
import { describe, expect, it } from 'vitest';
import { parseDeck } from '../parse/deck.js';
import whiteTheme from '../theme/white.json' with { type: 'json' };
import { renderPptx } from './pptx.js';

const DEMO_MD = [
  '<!-- _class: title -->',
  '# Hello Keynote',
  '## A subtitle',
  '',
  '---',
  '',
  '<!-- _class: title-bullets -->',
  '# Agenda',
  '- First',
  '- See [docs](https://example.com/docs)',
  '',
  'Source: [GSC](https://search.google.com/sc)',
].join('\n');

const emuOf = (xml: string, shapeIndex: number): { x: number; y: number; cx: number; cy: number } => {
  const shapes = [...xml.matchAll(/<p:sp>[\s\S]*?<\/p:sp>/g)];
  const shape = shapes[shapeIndex]?.[0];
  if (shape === undefined) throw new Error(`no shape #${shapeIndex}`);
  const m = /<a:off x="(-?\d+)" y="(-?\d+)"\/><a:ext cx="(\d+)" cy="(\d+)"\/>/.exec(shape);
  if (!m?.[1] || !m[2] || !m[3] || !m[4]) throw new Error(`no xfrm in shape #${shapeIndex}`);
  return { x: Number(m[1]), y: Number(m[2]), cx: Number(m[3]), cy: Number(m[4]) };
};

describe('renderPptx (native editable OOXML)', () => {
  it('produces a pptx with Keynote-exact slide size and placeholder geometry', async () => {
    const outDir = mkdtempSync(join(tmpdir(), 'whitedeck-pptx-'));
    const outPath = join(outDir, 'demo.pptx');

    await renderPptx(parseDeck(DEMO_MD), outPath);

    const zip = await JSZip.loadAsync(readFileSync(outPath));
    const presentation = await zip.file('ppt/presentation.xml')?.async('string');
    expect(presentation).toContain(`cx="${whiteTheme.canvas.widthEmu}"`);
    expect(presentation).toContain(`cy="${whiteTheme.canvas.heightEmu}"`);

    const slide2 = await zip.file('ppt/slides/slide2.xml')?.async('string');
    if (slide2 === undefined) throw new Error('slide2.xml missing');

    const layout = whiteTheme.layouts['title-bullets'];
    const title = layout.placeholders.find((p) => p.role === 'title');
    const body = layout.placeholders.find((p) => p.role === 'body');
    if (!title || !body) throw new Error('white.json lost its placeholders');

    expect(emuOf(slide2, 0)).toEqual({ x: title.xEmu, y: title.yEmu, cx: title.wEmu, cy: title.hEmu });
    expect(emuOf(slide2, 1)).toEqual({ x: body.xEmu, y: body.yEmu, cx: body.wEmu, cy: body.hEmu });

    expect(slide2).toContain('Agenda');
    expect(slide2).toContain('First');
    expect(slide2).toMatch(/sz="11200"/);
    expect(slide2).toMatch(/sz="4800"/);
    expect(slide2).toContain('typeface="Helvetica Neue Medium"');
    expect(slide2).toMatch(/<a:spcBef><a:spcPts val="5900"\/>/);
    expect(slide2).toContain('typeface="Helvetica Neue"');

    const rels2 = await zip.file('ppt/slides/_rels/slide2.xml.rels')?.async('string');
    expect(rels2).toContain('https://example.com/docs');
    expect(rels2).toContain('https://search.google.com/sc');
    expect(slide2).toContain('Source:');

    const slide1 = await zip.file('ppt/slides/slide1.xml')?.async('string');
    expect(slide1).toMatch(/anchor="b"/);
    expect(slide1).toContain('Hello Keynote');
    expect(slide2).toContain('<a:normAutofit/>');
    expect(slide1).toContain('A subtitle');
  });

  it('renders compare slides as two half-width text boxes', async () => {
    const outDir = mkdtempSync(join(tmpdir(), 'whitedeck-pptx-'));
    const outPath = join(outDir, 'compare.pptx');
    await renderPptx(
      parseDeck('<!-- _class: compare -->\n# Faster\n- **Before**\n- LCP 4.1s\n- **After**\n- LCP 1.3s'),
      outPath,
    );
    const zip = await JSZip.loadAsync(readFileSync(outPath));
    const slide1 = await zip.file('ppt/slides/slide1.xml')?.async('string');
    if (slide1 === undefined) throw new Error('slide1 missing');
    const left = emuOf(slide1, 1);
    const right = emuOf(slide1, 2);
    expect(left.cx).toBe(right.cx);
    expect(right.x).toBeGreaterThan(left.x + left.cx - 1);
    expect(slide1).toContain('Before');
    expect(slide1).toContain('LCP 4.1s');
  });

  it('writes real text (editable), not slide images', async () => {
    const outDir = mkdtempSync(join(tmpdir(), 'whitedeck-pptx-'));
    const outPath = join(outDir, 'text.pptx');
    await renderPptx(parseDeck('# Only Text'), outPath);

    const zip = await JSZip.loadAsync(readFileSync(outPath));
    const media = Object.values(zip.files).filter((f) => f.name.startsWith('ppt/media/') && !f.dir);
    expect(media).toEqual([]);
  });
});
