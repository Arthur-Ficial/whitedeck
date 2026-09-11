/* One tokeniser for the three inline constructs whitedeck knows:
   `**bold**`, `[label](url)` and `[text]{#rrggbb}` (a coloured run). Bold may
   wrap a link or a colour span, so the bold body is parsed recursively. */
const TOKEN = /\*\*(.+?)\*\*|__(.+?)__|\[([^\]]+)\]\(([^)]+)\)|\[([^\]]+)\]\{(#[0-9a-fA-F]{6})\}/g;
const withBold = (segments) => segments.map((s) => ({ ...s, bold: true }));
/** Split markdown text into plain, bold, link and coloured segments. */
export const parseInline = (text) => {
    const segments = [];
    let last = 0;
    for (const match of text.matchAll(TOKEN)) {
        if (match.index > last)
            segments.push({ text: text.slice(last, match.index) });
        const [, starBold, underBold, label, url, colored, color] = match;
        const bold = starBold ?? underBold;
        if (bold !== undefined)
            segments.push(...withBold(parseInline(bold)));
        else if (label !== undefined && url !== undefined)
            segments.push({ text: label, url });
        else if (colored !== undefined && color !== undefined)
            segments.push({ text: colored, color: color.toLowerCase() });
        last = match.index + match[0].length;
    }
    if (last < text.length)
        segments.push({ text: text.slice(last) });
    return segments;
};
const escapeHtml = (value) => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const segmentHtml = (s) => {
    let html = escapeHtml(s.text);
    if (s.url !== undefined)
        html = `<a href="${escapeHtml(s.url)}">${html}</a>`;
    if (s.color !== undefined)
        html = `<span style="color: ${s.color}">${html}</span>`;
    if (s.bold === true)
        html = `<strong>${html}</strong>`;
    return html;
};
/** Markdown inline runs to HTML: links, bold, coloured spans; everything else escaped. */
export const inlineToHtml = (text) => parseInline(text).map(segmentHtml).join('');
/**
 * Strip the code markers Keynote cannot render. Without this a bullet reaches
 * the slide as literal "`/de/p/123`".
 */
const stripCode = (value) => value.replaceAll(/`([^`]+)`/g, '$1');
/**
 * Markdown to plain text for renderers without inline formatting: links
 * become "text (url)", emphasis and code markers are removed.
 */
export const inlineToPlain = (text) => stripCode(parseInline(text)
    .map((s) => {
    if (s.url === undefined)
        return s.text;
    // A link whose label already IS its target must not be printed twice
    // as "https://x (https://x)" - that is how a full-URL example reads
    // on a Keynote slide.
    return s.text.trim() === s.url.trim() ? s.text : `${s.text} (${s.url})`;
})
    .join(''));
/**
 * The text a renderer actually paints: link labels only (the href is never on
 * the slide) and no emphasis markers. This is what a fit calculation must
 * measure - `inlineToPlain` appends the URL and would over-estimate by far.
 */
export const inlineVisibleText = (text) => stripCode(parseInline(text)
    .map((s) => s.text)
    .join(''));
/**
 * Character ranges (1-based, inclusive - AppleScript's `characters a thru b`)
 * of every styled run inside `inlineVisibleText(text)`. Plain runs are omitted.
 */
export const styledRuns = (text) => {
    const runs = [];
    let offset = 0;
    for (const s of parseInline(text)) {
        const visible = stripCode(s.text);
        const start = offset + 1;
        offset += visible.length;
        if (visible.length === 0)
            continue;
        if (s.bold === true || s.color !== undefined || s.url !== undefined) {
            runs.push({
                start,
                end: offset,
                bold: s.bold === true,
                ...(s.color !== undefined && { color: s.color }),
                ...(s.url !== undefined && { url: s.url }),
            });
        }
    }
    return runs;
};
