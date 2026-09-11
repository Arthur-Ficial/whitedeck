import matter from 'gray-matter';
import { borderColor, isScopeLayout } from '../theme/scope.js';
import { ALL_LAYOUT_IDS } from '../theme/white.js';
const CLASS_DIRECTIVE = /<!--\s*_class:\s*([\w-]+)\s*-->/;
/* A slide may override the theme background - used for context slides that must read
   as a different kind of slide (a client's own question, a section marker). Keynote
   supports this per slide, so the renderers do too. */
const BACKGROUND_DIRECTIVE = /<!--\s*_background:\s*(#[0-9a-fA-F]{3,8}|[a-zA-Z]+)\s*-->/;
const INLINE_CODE = /`([^`]*)`/g;
/* A deck is markdown, not HTML: an author who writes about markup types either
   `<title>` or `&lt;title&gt;`, and both must reach the slide as the same four
   visible characters. Without this the Keynote and pptx renderers - which paint
   the parsed string verbatim - print a literal "&lt;title&gt;" on the slide.
   Decoding happens once, here, so every renderer works on real text; the
   HTML/PDF path re-encodes on its way into Marp. */
const NAMED = {
    lt: '<', gt: '>', amp: '&', quot: '"', apos: "'", nbsp: '\u00a0',
};
const ENTITY = /&(#\d+|#[xX][0-9a-fA-F]+|[a-zA-Z][a-zA-Z0-9]*);/g;
const decodeEntities = (value) => value.replaceAll(ENTITY, (whole, body) => {
    if (body.startsWith('#')) {
        const code = body[1] === 'x' || body[1] === 'X'
            ? Number.parseInt(body.slice(2), 16)
            : Number.parseInt(body.slice(1), 10);
        return Number.isFinite(code) && code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : whole;
    }
    return NAMED[body.toLowerCase()] ?? whole;
});
/** Keynote has no code styling - inline code markers are stripped everywhere for fidelity. */
const plainText = (value) => decodeEntities(value.replace(INLINE_CODE, '$1')).trim();
const IMAGE = /!\[([^\]]*)\]\(([^)]+)\)/g;
const IMAGE_ATTR = /(\w+)=(?:"([^"]*)"|(\S+))/g;
const BULLET = /^(\s*)[-*]\s+(.*)$/;
const ATTRIBUTION = /^(?:--|—)\s*(.*)$/;
/** `Scope:`, `Tool:`, `Caption:`, `Footer:` - one-line slide fields. */
const FIELD = /^(Scope|Tool|Caption|Footer):\s*(.*)$/;
/* Alt text carries image attributes as `key=value` pairs; plain alt text
   (a description, an empty string) is ignored, as before. */
const parseImage = (alt, path) => {
    const image = { path };
    for (const [, key, quoted, bare] of alt.matchAll(IMAGE_ATTR)) {
        const value = quoted ?? bare ?? '';
        if (key === 'border')
            image.border = borderColor(value);
        else if (key === 'label')
            image.label = value;
        else
            throw new Error(`Unknown image attribute "${key}" in ![${alt}](${path}). Known: border, label`);
    }
    return image;
};
const parseField = (line, slide) => {
    const field = FIELD.exec(line.trimStart());
    if (field?.[1] === undefined || field[2] === undefined)
        return false;
    const value = decodeEntities(field[2]).trim();
    if (field[1] === 'Scope')
        slide.scope = value;
    else if (field[1] === 'Tool')
        slide.tool = value;
    else if (field[1] === 'Caption')
        slide.caption = value;
    else
        slide.footer = value;
    return true;
};
const parseLine = (line, slide) => {
    const classMatch = CLASS_DIRECTIVE.exec(line);
    if (classMatch?.[1] !== undefined) {
        slide.layout = classMatch[1];
        return;
    }
    const backgroundMatch = BACKGROUND_DIRECTIVE.exec(line);
    if (backgroundMatch?.[1] !== undefined) {
        slide.background = backgroundMatch[1];
        return;
    }
    const images = [...line.matchAll(IMAGE)].flatMap((m) => m[2] !== undefined ? [parseImage(m[1] ?? '', m[2])] : []);
    if (images.length > 0) {
        slide.images.push(...images);
        return;
    }
    if (line.startsWith('# ')) {
        slide.title = plainText(line.slice(2));
        return;
    }
    if (line.startsWith('## ')) {
        slide.subtitle = plainText(line.slice(3));
        return;
    }
    if (line.startsWith('>')) {
        const text = decodeEntities(line.replace(/^>\s?/, '')).trim();
        const attribution = ATTRIBUTION.exec(text);
        if (attribution?.[1] !== undefined)
            slide.attribution = attribution[1].trim();
        else if (text.length > 0)
            slide.quoteLines.push(text);
        return;
    }
    if (line.trimStart().startsWith('Source:')) {
        slide.source = decodeEntities(line).trim();
        return;
    }
    if (parseField(line, slide))
        return;
    const bullet = BULLET.exec(line);
    if (bullet?.[1] !== undefined && bullet[2] !== undefined) {
        slide.bullets.push({ text: plainText(bullet[2]), level: Math.floor(bullet[1].length / 2) });
        return;
    }
    if (line.trim().length > 0) {
        slide.bullets.push({ text: plainText(line), level: 0 });
    }
};
const inferLayout = (slide, isFirst) => {
    const hasContent = slide.title !== undefined ||
        slide.subtitle !== undefined ||
        slide.bullets.length > 0 ||
        slide.images.length > 0 ||
        slide.quoteLines.length > 0;
    if (!hasContent)
        return 'blank';
    if (slide.quoteLines.length > 0)
        return 'quote';
    if (slide.images.length > 0 && slide.title === undefined && slide.bullets.length === 0)
        return 'photo';
    if (isFirst)
        return 'title';
    if (slide.images.length > 0)
        return 'title-bullets-photo';
    return 'title-bullets';
};
const COLUMN_HEADER = /^\*\*(.+)\*\*$/;
const toColumns = (bullets) => {
    const columns = [];
    for (const bullet of bullets) {
        const header = COLUMN_HEADER.exec(bullet.text);
        if (header?.[1] !== undefined) {
            columns.push({ header: header[1], bullets: [] });
        }
        else {
            columns.at(-1)?.bullets.push(bullet);
        }
    }
    return columns;
};
/* Scope layouts fail at parse time, never in front of a client (P8). */
const checkScope = (layout, slide) => {
    if (!isScopeLayout(layout))
        return;
    if (slide.scope === undefined)
        throw new Error(`${layout} needs a "Scope:" line`);
    if (slide.images.length === 0)
        throw new Error(`${layout} needs at least one image`);
    if (layout === 'scope-shot' && slide.images.length !== 1)
        throw new Error('scope-shot takes exactly one image');
    if (layout === 'scope-shot-notes' && slide.images.length !== 2)
        throw new Error('scope-shot-notes takes exactly two images (main, side)');
    if (layout === 'scope-compare' && slide.images.some((i) => i.label === undefined)) {
        throw new Error('scope-compare: every image needs a label="..." attribute');
    }
};
/** Layouts whose bullets are grouped under bold headings (`- **IS**` then plain bullets). */
const usesColumns = (layout) => layout === 'compare' || layout === 'scope-compare' || layout === 'scope-shot-notes';
const finalizeSlide = (slide, isFirst) => {
    const layout = slide.layout ?? inferLayout(slide, isFirst);
    if (!ALL_LAYOUT_IDS.includes(layout)) {
        throw new Error(`Unknown layout "${layout}". Valid layouts: ${ALL_LAYOUT_IDS.join(', ')}`);
    }
    checkScope(layout, slide);
    const quote = slide.quoteLines.join(' ');
    return {
        layout,
        ...(slide.background !== undefined && { background: slide.background }),
        ...(slide.title !== undefined && { title: slide.title }),
        ...(slide.subtitle !== undefined && { subtitle: slide.subtitle }),
        bullets: slide.bullets,
        images: slide.images,
        ...(quote.length > 0 && { quote }),
        ...(slide.attribution !== undefined && { attribution: slide.attribution }),
        ...(slide.source !== undefined && { source: slide.source }),
        ...(usesColumns(layout) && { columns: toColumns(slide.bullets) }),
        ...(slide.scope !== undefined && { scope: slide.scope }),
        ...(slide.tool !== undefined && { tool: slide.tool }),
        ...(slide.caption !== undefined && { caption: slide.caption }),
        ...(slide.footer !== undefined && { footer: slide.footer }),
    };
};
export const parseDeck = (markdown) => {
    const { data, content } = matter(markdown);
    const blocks = content.split(/^---$/m);
    const slides = blocks.map((block, index) => {
        const slide = { bullets: [], images: [], quoteLines: [] };
        for (const line of block.split('\n'))
            parseLine(line, slide);
        return finalizeSlide(slide, index === 0);
    });
    const meta = {
        ...(typeof data['title'] === 'string' && { title: data['title'] }),
        ...(typeof data['author'] === 'string' && { author: data['author'] }),
        ...(typeof data['logo'] === 'string' && { logo: data['logo'] }),
    };
    return { meta, slides };
};
