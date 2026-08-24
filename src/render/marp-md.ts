import type { Deck, DeckSlide } from '../parse/deck.js';
import { inlineToHtml } from '../parse/inline.js';

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
  if (slide.title !== undefined) lines.push(`# ${slide.title}`);
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
