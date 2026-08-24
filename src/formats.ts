import type { Deck } from './parse/deck.js';
import { renderHtml } from './render/html.js';
import { renderKey } from './render/key.js';
import { renderPdf } from './render/pdf.js';
import { renderPptx } from './render/pptx.js';

export type OutputFormat = 'html' | 'pdf' | 'pptx' | 'key';

export const OUTPUT_FORMATS: readonly OutputFormat[] = ['html', 'pdf', 'pptx', 'key'];

const RENDERERS: Readonly<Record<OutputFormat, (deck: Deck, outPath: string) => Promise<void>>> = {
  html: renderHtml,
  pdf: renderPdf,
  pptx: renderPptx,
  key: renderKey,
};

export const isOutputFormat = (value: string): value is OutputFormat =>
  (OUTPUT_FORMATS as readonly string[]).includes(value);

/** Resolve a -f argument ("html,pdf" or "all") into concrete formats; "all" includes key only on macOS. */
export const resolveFormats = (spec: string): OutputFormat[] => {
  if (spec === 'all') {
    return OUTPUT_FORMATS.filter((f) => f !== 'key' || process.platform === 'darwin');
  }
  return spec.split(',').map((part) => {
    const format = part.trim();
    if (!isOutputFormat(format)) {
      throw new Error(`Unknown format "${format}". Valid: ${OUTPUT_FORMATS.join(', ')}, all`);
    }
    return format;
  });
};

export const renderFormat = async (format: OutputFormat, deck: Deck, outPath: string): Promise<void> =>
  RENDERERS[format](deck, outPath);
