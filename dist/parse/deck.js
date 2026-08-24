import matter from 'gray-matter';
import { ALL_LAYOUT_IDS } from '../theme/white.js';
const CLASS_DIRECTIVE = /<!--\s*_class:\s*([\w-]+)\s*-->/;
const INLINE_CODE = /`([^`]*)`/g;
/** Keynote has no code styling - inline code markers are stripped everywhere for fidelity. */
const plainText = (value) => value.replace(INLINE_CODE, '$1').trim();
const IMAGE = /!\[[^\]]*\]\(([^)]+)\)/g;
const BULLET = /^(\s*)[-*]\s+(.*)$/;
const ATTRIBUTION = /^(?:--|—)\s*(.*)$/;
const parseLine = (line, slide) => {
    const classMatch = CLASS_DIRECTIVE.exec(line);
    if (classMatch?.[1] !== undefined) {
        slide.layout = classMatch[1];
        return;
    }
    const images = [...line.matchAll(IMAGE)].flatMap((m) => (m[1] !== undefined ? [m[1]] : []));
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
        const text = line.replace(/^>\s?/, '').trim();
        const attribution = ATTRIBUTION.exec(text);
        if (attribution?.[1] !== undefined)
            slide.attribution = attribution[1].trim();
        else if (text.length > 0)
            slide.quoteLines.push(text);
        return;
    }
    if (line.trimStart().startsWith('Source:')) {
        slide.source = line.trim();
        return;
    }
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
const finalizeSlide = (slide, isFirst) => {
    const layout = slide.layout ?? inferLayout(slide, isFirst);
    if (!ALL_LAYOUT_IDS.includes(layout)) {
        throw new Error(`Unknown layout "${layout}". Valid layouts: ${ALL_LAYOUT_IDS.join(', ')}`);
    }
    const quote = slide.quoteLines.join(' ');
    return {
        layout,
        ...(slide.title !== undefined && { title: slide.title }),
        ...(slide.subtitle !== undefined && { subtitle: slide.subtitle }),
        bullets: slide.bullets,
        images: slide.images,
        ...(quote.length > 0 && { quote }),
        ...(slide.attribution !== undefined && { attribution: slide.attribution }),
        ...(slide.source !== undefined && { source: slide.source }),
        ...(layout === 'compare' && { columns: toColumns(slide.bullets) }),
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
    };
    return { meta, slides };
};
