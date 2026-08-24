import type { Deck, DeckSlide } from '../parse/deck.js';

const slideMarkdown = (slide: DeckSlide): string => {
  const lines: string[] = [`<!-- _class: ${slide.layout} -->`];
  if (slide.title !== undefined) lines.push(`# ${slide.title}`);
  if (slide.subtitle !== undefined) lines.push(`## ${slide.subtitle}`);
  for (const image of slide.images) lines.push(`![](${image})`);
  for (const bullet of slide.bullets) lines.push(`${'  '.repeat(bullet.level)}- ${bullet.text}`);
  if (slide.quote !== undefined) lines.push(`> ${slide.quote}`);
  if (slide.attribution !== undefined) lines.push('', `—${slide.attribution}`);
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
