import { renderHtml } from './render/html.js';
import { renderKey } from './render/key.js';
import { renderPdf } from './render/pdf.js';
import { renderPptx } from './render/pptx.js';
export const OUTPUT_FORMATS = ['html', 'pdf', 'pptx', 'key'];
const RENDERERS = {
    html: renderHtml,
    pdf: renderPdf,
    pptx: renderPptx,
    key: renderKey,
};
export const isOutputFormat = (value) => OUTPUT_FORMATS.includes(value);
/** Resolve a -f argument ("html,pdf" or "all") into concrete formats; "all" includes key only on macOS. */
export const resolveFormats = (spec) => {
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
export const renderFormat = async (format, deck, outPath) => RENDERERS[format](deck, outPath);
