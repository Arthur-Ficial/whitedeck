import type { Deck, DeckSlide } from '../parse/deck.js';
import { inlineToHtml } from '../parse/inline.js';
import { layoutOf } from '../theme/white.js';

/* Keynote shrinks overflowing placeholder text; CSS cannot, so the emitted markdown
   carries a pre-computed size. Helvetica Neue metrics approximated: avg glyph 0.56em,
   line height 1.15em. */
const AVG_GLYPH_EM = 0.56;
const LINE_HEIGHT_EM = 1.15;
const MIN_TITLE_PT = 40;
const PX_PER_PT = 4 / 3;

const fittedTitleSizePt = (title: string, layoutId: string): number => {
  const ph = layoutOf(layoutId).placeholders.find((p) => p.role === 'title');
  if (!ph) return 0;
  for (let size = ph.sizePt; size > MIN_TITLE_PT; size -= 2) {
    const glyphPx = size * PX_PER_PT * AVG_GLYPH_EM;
    const lines = Math.max(1, Math.ceil((title.length * glyphPx) / ph.wPx));
    if (lines * size * PX_PER_PT * LINE_HEIGHT_EM <= ph.hPx) return size;
  }
  return MIN_TITLE_PT;
};

const titleLine = (slide: DeckSlide): string => {
  const title = slide.title ?? '';
  const size = fittedTitleSizePt(title, slide.layout);
  const full = layoutOf(slide.layout).placeholders.find((p) => p.role === 'title')?.sizePt ?? 0;
  return size < full ? `<h1 style="font-size: ${size}pt">${inlineToHtml(title)}</h1>` : `# ${title}`;
};

const columnsHtml = (slide: DeckSlide): string => {
  const cols = (slide.columns ?? [])
    .map(
      (col) =>
        `<div class="col"><h3>${inlineToHtml(col.header)}</h3><ul>${col.bullets
          .map((b) => `<li>${inlineToHtml(b.text)}</li>`)
          .join('')}</ul></div>`,
    )
    .join('');
  return `<div class="cols">${cols}</div>`;
};

const slideMarkdown = (slide: DeckSlide): string => {
  const lines: string[] = [`<!-- _class: ${slide.layout} -->`];
  if (slide.title !== undefined) {
    const title = titleLine(slide);
    lines.push(title);
    /* A shrunk title is a raw <h1> HTML block; without a blank line CommonMark
       swallows every following line into it and the bullet list disappears. */
    if (title.startsWith('<h1')) lines.push('');
  }
  if (slide.columns !== undefined) {
    lines.push('', columnsHtml(slide));
    if (slide.source !== undefined) lines.push('', `<footer>${inlineToHtml(slide.source)}</footer>`);
    return lines.join('\n');
  }
  if (slide.subtitle !== undefined) lines.push(`## ${slide.subtitle}`);
  for (const image of slide.images) lines.push(`![](${image})`);
  for (const bullet of slide.bullets) lines.push(`${'  '.repeat(bullet.level)}- ${bullet.text}`);
  if (slide.quote !== undefined) lines.push(`> ${slide.quote}`);
  if (slide.attribution !== undefined) lines.push('', `—${slide.attribution}`);
  if (slide.source !== undefined) lines.push('', `<footer>${inlineToHtml(slide.source)}</footer>`);
  return lines.join('\n');
};

/** Emit canonical Marp markdown so the theme's DOM mapping is deterministic. */
export const toMarpMarkdown = (deck: Deck): string => {
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
