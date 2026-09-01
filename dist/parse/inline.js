const LINK = /\[([^\]]+)\]\(([^)]+)\)/g;
/** Split markdown text into plain and link segments. */
export const parseInline = (text) => {
    const segments = [];
    let last = 0;
    for (const match of text.matchAll(LINK)) {
        if (match.index > last)
            segments.push({ text: text.slice(last, match.index) });
        if (match[1] !== undefined && match[2] !== undefined) {
            segments.push({ text: match[1], url: match[2] });
        }
        last = match.index + match[0].length;
    }
    if (last < text.length)
        segments.push({ text: text.slice(last) });
    return segments;
};
const escapeHtml = (value) => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
/** Markdown links to HTML anchors; everything else escaped. */
export const inlineToHtml = (text) => parseInline(text)
    .map((s) => (s.url !== undefined ? `<a href="${escapeHtml(s.url)}">${escapeHtml(s.text)}</a>` : escapeHtml(s.text)))
    .join('');
/**
 * Strip the emphasis and code markers Keynote cannot render. Without this a
 * bullet reaches the slide as literal "**IS**" or "`/de/p/123`".
 */
const stripEmphasis = (value) => value
    .replaceAll(/\*\*(.+?)\*\*/g, '$1')
    .replaceAll(/__(.+?)__/g, '$1')
    .replaceAll(/`([^`]+)`/g, '$1');
/**
 * Markdown to plain text for renderers without inline formatting: links
 * become "text (url)", emphasis and code markers are removed.
 */
export const inlineToPlain = (text) => stripEmphasis(parseInline(text)
    .map((s) => {
    if (s.url === undefined)
        return s.text;
    // A link whose label already IS its target must not be printed twice
    // as "https://x (https://x)" - that is how a full-URL example reads
    // on a Keynote slide.
    return s.text.trim() === s.url.trim() ? s.text : `${s.text} (${s.url})`;
})
    .join(''));
