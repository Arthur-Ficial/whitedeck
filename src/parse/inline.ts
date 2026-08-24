export interface InlineSegment {
  readonly text: string;
  readonly url?: string;
}

const LINK = /\[([^\]]+)\]\(([^)]+)\)/g;

/** Split markdown text into plain and link segments. */
export const parseInline = (text: string): InlineSegment[] => {
  const segments: InlineSegment[] = [];
  let last = 0;
  for (const match of text.matchAll(LINK)) {
    if (match.index > last) segments.push({ text: text.slice(last, match.index) });
    if (match[1] !== undefined && match[2] !== undefined) {
      segments.push({ text: match[1], url: match[2] });
    }
    last = match.index + match[0].length;
  }
  if (last < text.length) segments.push({ text: text.slice(last) });
  return segments;
};

const escapeHtml = (value: string): string =>
  value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');

/** Markdown links to HTML anchors; everything else escaped. */
export const inlineToHtml = (text: string): string =>
  parseInline(text)
    .map((s) => (s.url !== undefined ? `<a href="${escapeHtml(s.url)}">${escapeHtml(s.text)}</a>` : escapeHtml(s.text)))
    .join('');

/** Markdown links to plain "text (url)" for renderers without hyperlink support. */
export const inlineToPlain = (text: string): string =>
  parseInline(text)
    .map((s) => (s.url !== undefined ? `${s.text} (${s.url})` : s.text))
    .join('');
