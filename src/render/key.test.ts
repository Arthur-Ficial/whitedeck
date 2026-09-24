import { existsSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import JSZip from 'jszip';
import { describe, expect, it } from 'vitest';
import { parseDeck } from '../parse/deck.js';
import { THEME_DUMMY_STRINGS } from '../theme/dummy.js';
import { PDFDocument, PDFName, PDFString } from 'pdf-lib';
import { deckLinkTargets, exportPdfScript, importScript, keyDefects, linkUrisInPdf, readBackScript, renderKey, runAppleScript } from './key.js';
import { renderPptx } from './pptx.js';

const onMacWithKeynote = process.platform === 'darwin' && existsSync('/Applications/Keynote.app');

/* The two slides that broke Franz's .key on 2026-09-24: a quote slide (theme
   dummy copy painted over it) and a slide whose links came out as raw text. */
const DECK_MD = [
  '<!-- _class: quote -->',
  '',
  '> Content Marketing im AI Zeitalter?',
  '> -- Q05 · Cluster C4 · Crawlability',
  '',
  '---',
  '',
  '<!-- _class: title-bullets -->',
  '',
  '# Every link stays a link',
  '',
  '- See [Search Console](https://search.google.com/search-console/index?resource_id=sc-domain%3Aexample.com)',
  '',
  'Source: [web.dev, captured 2026-09-24](https://web.dev/articles/vitals#:~:text=75th%20percentile)',
].join('\n');

const deck = parseDeck(DECK_MD);

describe('the .key is built by importing the pptx, never slide by slide', () => {
  const script = importScript('/tmp/x/Deck.pptx', '/tmp/x/Deck.key');

  it('never selects a theme master, least of all "Quote"', () => {
    expect(script).not.toMatch(/master slide/i);
    expect(script).not.toContain('Quote');
  });

  it('never writes text into a master placeholder', () => {
    expect(script).not.toContain('default body item');
    expect(script).not.toContain('default title item');
    expect(script).not.toContain('object text');
  });

  it('never appends a URL as visible text', () => {
    expect(script).not.toMatch(/ \(https?:\/\//);
  });

  it('opens the pptx and saves it as .key through the bundle id', () => {
    expect(script).toContain('tell application id "com.apple.Keynote"');
    expect(script).toContain('open (POSIX file "/tmp/x/Deck.pptx")');
    expect(script).toContain('save d in POSIX file "/tmp/x/Deck.key"');
  });

  it('reads the saved .key back for the post-build check', () => {
    const back = readBackScript('/tmp/x/Deck.key');
    expect(back).toContain('open (POSIX file "/tmp/x/Deck.key")');
    expect(back).toContain('close d saving no');
  });
});

describe('the pptx that becomes the .key places the quote itself', () => {
  it('carries the question text and no theme dummy copy', async () => {
    const outPath = join(mkdtempSync(join(tmpdir(), 'whitedeck-keyq-')), 'q.pptx');
    await renderPptx(deck, outPath);
    const zip = await JSZip.loadAsync(readFileSync(outPath));
    const slide1 = (await zip.file('ppt/slides/slide1.xml')?.async('string')) ?? '';
    expect(slide1).toContain('Content Marketing im AI Zeitalter?');
    for (const dummy of THEME_DUMMY_STRINGS) expect(slide1).not.toContain(dummy);
    const slide2 = (await zip.file('ppt/slides/slide2.xml')?.async('string')) ?? '';
    expect(slide2).toContain('hlinkClick');
    expect(slide2).not.toContain('(https://');
  });
});

describe('keyDefects: the build-time guard on a finished .key', () => {
  it('passes clean slide text', () => {
    expect(keyDefects(['Content Marketing im AI Zeitalter?', 'Every link stays a link\nSee Search Console'], deck)).toEqual([]);
  });

  it('fails on the White theme dummy copy', () => {
    const defects = keyDefects(['Type a quote here.\n-Johnny Appleseed', ''], deck);
    expect(defects).toHaveLength(2);
    expect(defects[0]).toContain('slide 1');
  });

  it('fails on a link target printed as text', () => {
    const defects = keyDefects(['', 'See Search Console (https://search.google.com/search-console/index?resource_id=sc-domain%3Aexample.com)'], deck);
    expect(defects).toHaveLength(1);
    expect(defects[0]).toContain('raw URL visible as text');
  });

  it('allows a URL the markdown itself shows as text', () => {
    const q06 = parseDeck('<!-- _class: quote -->\n\n> LLMs.txt good/bad? (https://llmstxt.org/)\n> -- Q06');
    expect(keyDefects(['LLMs.txt good/bad? (https://llmstxt.org/)'], q06)).toEqual([]);
  });
});

describe('link check: every markdown link must be a clickable annotation in the .key', () => {
  it('collects every link target, deep links and encoded parentheses intact', () => {
    expect(deckLinkTargets(deck)).toEqual([
      'https://search.google.com/search-console/index?resource_id=sc-domain%3Aexample.com',
      'https://web.dev/articles/vitals#:~:text=75th%20percentile',
    ]);
  });

  it('reads the URI of every link annotation from a PDF', async () => {
    const pdf = await PDFDocument.create();
    const page = pdf.addPage([1920, 1080]);
    const link = pdf.context.obj({
      Type: 'Annot', Subtype: 'Link', Rect: [0, 0, 100, 20],
      A: { S: 'URI', URI: PDFString.of('https://web.dev/articles/vitals#:~:text=75th%20percentile') },
    });
    page.node.set(PDFName.of('Annots'), pdf.context.obj([pdf.context.register(link)]));
    expect(await linkUrisInPdf(await pdf.save())).toEqual(['https://web.dev/articles/vitals#:~:text=75th%20percentile']);
  });

  it('exports the saved .key to PDF through the bundle id', () => {
    const script = exportPdfScript('/tmp/x/Deck.key', '/tmp/x/check.pdf');
    expect(script).toContain('export d to POSIX file "/tmp/x/check.pdf" as PDF');
    expect(script).toContain('tell application id "com.apple.Keynote"');
  });
});

describe.skipIf(!onMacWithKeynote)('renderKey (real Keynote.app)', () => {
  it('builds a 1920x1080 .key with the deck\'s slides and passes its own post-build check', async () => {
    const outPath = join(mkdtempSync(join(tmpdir(), 'whitedeck-key-')), 'demo.key');
    await renderKey(deck, outPath); // throws on dummy text or a visible link target
    expect(existsSync(outPath)).toBe(true);
    const raw = await runAppleScript(
      `tell application id "com.apple.Keynote"\n set d to open (POSIX file "${outPath}")\n set r to ((count of slides of d) as text) & "x" & (width of d as text)\n close d saving no\nend tell\nreturn r`,
    );
    expect(raw).toBe('2x1920');
  });
});
