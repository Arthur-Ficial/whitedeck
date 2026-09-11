import { existsSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import JSZip from 'jszip';
import { PDFDocument } from 'pdf-lib';
import { describe, expect, it } from 'vitest';
import { parseDeck } from '../parse/deck.js';
import { renderHtml } from './html.js';
import { renderKey, runAppleScript } from './key.js';
import { renderPdf } from './pdf.js';
import { renderPptx } from './pptx.js';

/* P1/P4: the kitchen-sink fixture (examples/scope-demo.md) built through the
   real Marp, pdf-lib, JSZip and Keynote paths. Conservation laws: every image
   of the deck (screenshots + tool logos + the deck logo on all 7 slides) must
   be present in each artifact. */
const FIXTURE = 'examples/scope-demo.md';
/* The CLI chdirs into the deck's folder; the suite runs from the repo root,
   so the fixture's relative paths are re-rooted here. */
const deck = parseDeck(
  readFileSync(FIXTURE, 'utf8')
    .replaceAll('](scope/', '](examples/scope/')
    .replaceAll('Tool: scope/', 'Tool: examples/scope/')
    .replace('logo: scope/', 'logo: examples/scope/'),
);
const screenshots = deck.slides.reduce((n, s) => n + s.images.length, 0);
const toolLogos = deck.slides.filter((s) => s.tool !== undefined).length;
const expectedImages = screenshots + toolLogos + deck.slides.length;

const outDir = mkdtempSync(join(tmpdir(), 'whitedeck-scope-'));

describe('scope layouts: HTML/PDF through the real Marp', () => {
  it('paints every image, border, label bar, bold run and colour span', async () => {
    const outPath = join(outDir, 'scope.html');
    await renderHtml(deck, outPath);
    const html = readFileSync(outPath, 'utf8');
    expect(html.match(/<img /g)?.length).toBe(expectedImages);
    expect(html.match(/outline:9px solid #ee220c/g)?.length).toBe(3);
    expect(html).toContain('outline:9px solid #1db100');
    expect(html.match(/background:#00a1ff/g)?.length).toBe(2);
    expect(html).toContain('>JS off<');
    expect(html).toContain('<strong>SCOPE:</strong>');
    expect(html).toContain('<span style="color: #1db100">green</span>');
    expect(html).toMatch(/<h3[^>]*>IS \(not ok\)<\/h3>/);
    /* Marp's own runtime script contains `**2`; only the slides are checked. */
    const slidesOnly = html.replaceAll(/<script[\s\S]*?<\/script>/g, '').split('<section').slice(1).join('');
    expect(slidesOnly).not.toContain('![');
    expect(slidesOnly).not.toContain('**');
  });

  it('prints one page per slide with the images embedded', async () => {
    const outPath = join(outDir, 'scope.pdf');
    await renderPdf(deck, outPath);
    const pdf = await PDFDocument.load(readFileSync(outPath));
    expect(pdf.getPageCount()).toBe(deck.slides.length);
    const raw = readFileSync(outPath, 'latin1');
    expect(raw.match(/\/Subtype\s*\/Image/g)?.length ?? 0).toBeGreaterThanOrEqual(8);
  });
});

describe('scope layouts: editable pptx', () => {
  it('has media, 7pt borders, filled label bars, bold runs and the colour run', async () => {
    const outPath = join(outDir, 'scope.pptx');
    await renderPptx(deck, outPath);
    const zip = await JSZip.loadAsync(readFileSync(outPath));
    const media = Object.keys(zip.files).filter((n) => n.startsWith('ppt/media/'));
    expect(media.length).toBeGreaterThanOrEqual(8);
    const slides = await Promise.all(
      deck.slides.map((_, i) => zip.file(`ppt/slides/slide${i + 1}.xml`)?.async('string') ?? Promise.resolve('')),
    );
    const pics = slides.reduce((n, xml) => n + (xml.match(/<p:pic>/g)?.length ?? 0), 0);
    expect(pics).toBe(expectedImages);
    const all = slides.join('');
    // 7pt border = 88900 EMU
    expect(all.match(/<a:ln w="88900"/g)?.length).toBe(4);
    expect(all).toContain('<a:srgbClr val="00A1FF"/>');
    expect(all).toContain('<a:srgbClr val="1DB100"/>');
    expect(all.match(/ b="1"/g)?.length ?? 0).toBeGreaterThanOrEqual(8);
    expect(all).not.toContain('**');
    expect(all).toContain('hlinkClick');
  });
});

const onMacWithKeynote = process.platform === 'darwin' && existsSync('/Applications/Keynote.app');

const COUNT_SCRIPT = `
on run argv
  tell application "Keynote"
    set d to open (POSIX file (item 1 of argv))
    set n to count of slides of d
    set imgs to {}
    repeat with s in slides of d
      set end of imgs to (count of images of s)
    end repeat
    set hdr to object text of text item 1 of slide 5 of d
    close d saving no
    if (count of documents) is 0 then quit
  end tell
  set AppleScript's text item delimiters to "|"
  return (n as text) & "§" & (imgs as text) & "§" & hdr
end run
`;

describe.skipIf(!onMacWithKeynote)('scope layouts: native Keynote', () => {
  it('builds all slides with logo, bars and borders as images and real text items', async () => {
    const outPath = join(outDir, 'scope.key');
    await renderKey(deck, outPath);
    const [count, images, hdr] = (await runAppleScript(COUNT_SCRIPT, [outPath])).split('§');
    expect(count).toBe(String(deck.slides.length));
    // slide 4: tool logo + rule + border + shot + deck logo = 5; slide 5 (scope-compare): tool + rule + 2 bars + border + 3 shots + logo = 9; slide 6: tool + rule + 2 borders + 2 shots + logo = 7
    expect((images ?? '').split('|').map(Number)).toEqual([1, 1, 1, 5, 9, 7, 1]);
    expect(hdr).toContain('SCOPE:');
  });
});
