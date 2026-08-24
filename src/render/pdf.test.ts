import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PDFDocument } from 'pdf-lib';
import { describe, expect, it } from 'vitest';
import { parseDeck } from '../parse/deck.js';
import { renderPdf } from './pdf.js';

const DEMO_MD = ['# One', '', '---', '', '- a', '- b', '', '---', '', '> "q"', '> -- me'].join('\n');

describe('renderPdf (real marp-cli + Chrome)', () => {
  it('renders one 16:9 PDF page per slide', async () => {
    const outDir = mkdtempSync(join(tmpdir(), 'whitedeck-pdf-'));
    const outPath = join(outDir, 'demo.pdf');

    await renderPdf(parseDeck(DEMO_MD), outPath);

    const pdf = await PDFDocument.load(readFileSync(outPath));
    expect(pdf.getPageCount()).toBe(3);
    const { width, height } = pdf.getPage(0).getSize();
    expect(width / height).toBeCloseTo(16 / 9, 2);
  });
});
