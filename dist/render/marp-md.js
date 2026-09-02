import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { inlineToHtml, inlineVisibleText } from '../parse/inline.js';
import { layoutOf } from '../theme/white.js';
/* Keynote shrinks overflowing placeholder text; CSS cannot, so the emitted markdown
   carries a pre-computed size. Helvetica Neue metrics approximated: avg glyph 0.56em,
   line height 1.15em. */
const AVG_GLYPH_EM = 0.56;
const LINE_HEIGHT_EM = 1.15;
const MIN_TITLE_PT = 40;
const PX_PER_PT = 4 / 3;
const fittedTitleSizePt = (title, layoutId) => {
    const ph = layoutOf(layoutId).placeholders.find((p) => p.role === 'title');
    if (!ph)
        return 0;
    for (let size = ph.sizePt; size > MIN_TITLE_PT; size -= 2) {
        const glyphPx = size * PX_PER_PT * AVG_GLYPH_EM;
        const lines = Math.max(1, Math.ceil((title.length * glyphPx) / ph.wPx));
        if (lines * size * PX_PER_PT * LINE_HEIGHT_EM <= ph.hPx)
            return size;
    }
    return MIN_TITLE_PT;
};
/* Keynote shrinks an overflowing bullet body exactly like it shrinks a title;
   the pptx path gets that for free via pptxgenjs `fit: "shrink"`, but CSS has no
   autofit, so the HTML/PDF path needs the same pre-computed size or long bullet
   lists paint over the headline. */
const MIN_BODY_PT = 16;
const INDENT_STEP_PX = 67;
const fittedBody = (bullets, layoutId) => {
    const ph = layoutOf(layoutId).placeholders.find((p) => p.role === 'body');
    if (!ph || bullets.length === 0)
        return undefined;
    const indentPx = ph.indentPt !== undefined ? Math.round((ph.indentPt * 4) / 3) : INDENT_STEP_PX;
    const gapRatio = (ph.spaceBeforePt ?? 0) / ph.sizePt;
    const measured = bullets.map((b) => ({
        chars: inlineVisibleText(b.text).length,
        wPx: Math.max(1, ph.wPx - indentPx * (b.level + 1)),
    }));
    const heightPx = (size) => {
        const glyphPx = size * PX_PER_PT * AVG_GLYPH_EM;
        const linePx = size * PX_PER_PT * LINE_HEIGHT_EM;
        const gapPx = gapRatio * size * PX_PER_PT;
        return measured.reduce((total, m, index) => total + Math.max(1, Math.ceil((m.chars * glyphPx) / m.wPx)) * linePx + (index > 0 ? gapPx : 0), 0);
    };
    let size = ph.sizePt;
    while (size > MIN_BODY_PT && heightPx(size) > ph.hPx)
        size -= 2;
    return { sizePt: size, gapPt: Math.round(gapRatio * size), shrunk: size < ph.sizePt };
};
/* Marp scopes a `<style scoped>` block to the slide it sits on; the selector
   repeats the layout class so it outranks the theme rule it overrides. */
const bodyStyleTag = (slide) => {
    const fit = fittedBody(slide.bullets, slide.layout);
    if (!fit || !fit.shrunk)
        return undefined;
    return [
        '<style scoped>',
        `section.${slide.layout} ul { font-size: ${fit.sizePt}pt; }`,
        `section.${slide.layout} li + li { margin-top: ${fit.gapPt}pt; }`,
        '</style>',
    ].join('\n');
};
/* The Keynote quote box is one-liner geometry (87px high); a long quote must
   shrink and let the box grow toward the attribution, exactly like Keynote's
   shrink-to-fit - otherwise the text paints over the attribution line. */
const QUOTE_MAX_HPX = 290;
const MIN_QUOTE_PT = 24;
const quoteLine = (slide, quote) => {
    const phs = layoutOf(slide.layout)
        .placeholders.filter((p) => p.role === 'body')
        .sort((a, b) => b.sizePt - a.sizePt);
    const ph = phs[0];
    if (!ph)
        return `> ${quote}`;
    const fits = (size) => {
        const glyphPx = size * PX_PER_PT * AVG_GLYPH_EM;
        const lines = Math.max(1, Math.ceil((quote.length * glyphPx) / ph.wPx));
        return lines * size * PX_PER_PT * LINE_HEIGHT_EM <= QUOTE_MAX_HPX;
    };
    let size = ph.sizePt;
    while (size > MIN_QUOTE_PT && !fits(size))
        size -= 2;
    if (size === ph.sizePt)
        return `> ${quote}`;
    return `<blockquote style="font-size: ${size}pt; height: auto; max-height: ${QUOTE_MAX_HPX}px"><p>${inlineToHtml(quote)}</p></blockquote>`;
};
/* Marp runs with --html, so a bare "<" in a bullet or heading becomes a raw HTML
   tag: `<title>` in the deck source (backticks stripped at parse time) reaches
   the renderer as markup, disappears from the slide and destroys the page break.
   The parser has already decoded every entity, so each of these three characters
   is literal text by now and is encoded back on the way into the markdown -
   CommonMark paints the entity as the character. Markdown syntax (links,
   emphasis) stays untouched. */
const HTML_TEXT = /[<>&]/g;
const ENTITY = { '<': '&lt;', '>': '&gt;', '&': '&amp;' };
const asMarkdownText = (value) => value.replaceAll(HTML_TEXT, (c) => ENTITY[c] ?? c);
const titleLine = (slide) => {
    const title = slide.title ?? '';
    const size = fittedTitleSizePt(title, slide.layout);
    const full = layoutOf(slide.layout).placeholders.find((p) => p.role === 'title')?.sizePt ?? 0;
    return size < full ? `<h1 style="font-size: ${size}pt">${inlineToHtml(title)}</h1>` : `# ${asMarkdownText(title)}`;
};
const columnsHtml = (slide) => {
    const cols = (slide.columns ?? [])
        .map((col) => `<div class="col"><h3>${inlineToHtml(col.header)}</h3><ul>${col.bullets
        .map((b) => `<li>${inlineToHtml(b.text)}</li>`)
        .join('')}</ul></div>`)
        .join('');
    return `<div class="cols">${cols}</div>`;
};
/* Marp copies the markdown into a temp dir, so relative image paths must be
   resolved against the build cwd (the deck's directory) - and CommonMark cannot
   parse a destination containing spaces or parentheses, so the absolute path is
   percent-encoded. A missing image file fails the build loudly instead of
   shipping a blank slide. */
const marpImageRef = (image) => {
    if (/^(https?:|data:)/i.test(image))
        return image;
    const abs = resolve(image);
    if (!existsSync(abs))
        throw new Error(`image not found: ${image} (resolved to ${abs})`);
    return abs
        .split('/')
        .map((part) => encodeURIComponent(part))
        .join('/')
        .replaceAll('(', '%28')
        .replaceAll(')', '%29');
};
const slideMarkdown = (slide) => {
    const lines = [`<!-- _class: ${slide.layout} -->`];
    if (slide.title !== undefined) {
        const title = titleLine(slide);
        lines.push(title);
        /* A shrunk title is a raw <h1> HTML block; without a blank line CommonMark
           swallows every following line into it and the bullet list disappears. */
        if (title.startsWith('<h1'))
            lines.push('');
    }
    if (slide.columns !== undefined) {
        lines.push('', columnsHtml(slide));
        if (slide.source !== undefined)
            lines.push('', `<footer>${inlineToHtml(slide.source)}</footer>`);
        return lines.join('\n');
    }
    if (slide.subtitle !== undefined)
        lines.push(`## ${asMarkdownText(slide.subtitle)}`);
    for (const image of slide.images)
        lines.push(`![](${marpImageRef(image)})`);
    const bodyStyle = bodyStyleTag(slide);
    if (bodyStyle !== undefined)
        lines.push('', bodyStyle, '');
    for (const bullet of slide.bullets)
        lines.push(`${'  '.repeat(bullet.level)}- ${asMarkdownText(bullet.text)}`);
    if (slide.quote !== undefined)
        lines.push(quoteLine(slide, slide.quote), '');
    if (slide.attribution !== undefined)
        lines.push('', `—${slide.attribution}`);
    if (slide.source !== undefined)
        lines.push('', `<footer>${inlineToHtml(slide.source)}</footer>`);
    return lines.join('\n');
};
/** Emit canonical Marp markdown so the theme's DOM mapping is deterministic. */
export const toMarpMarkdown = (deck) => {
    const frontMatter = [
        '---',
        'marp: true',
        'theme: keynote-white',
        ...(deck.meta.title !== undefined ? [`title: ${JSON.stringify(deck.meta.title)}`] : []),
        ...(deck.meta.author !== undefined ? [`author: ${JSON.stringify(deck.meta.author)}`] : []),
        '---',
    ];
    const slides = deck.slides.map((slide) => slideMarkdown(slide));
    return [frontMatter.join('\n'), slides.join('\n\n---\n\n')].join('\n\n') + '\n';
};
