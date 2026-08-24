import matter from 'gray-matter';
import { LAYOUT_IDS } from '../theme/white.js';

export interface DeckBullet {
  readonly text: string;
  readonly level: number;
}

export interface DeckSlide {
  readonly layout: string;
  readonly title?: string;
  readonly subtitle?: string;
  readonly bullets: readonly DeckBullet[];
  readonly images: readonly string[];
  readonly quote?: string;
  readonly attribution?: string;
}

export interface DeckMeta {
  readonly title?: string;
  readonly author?: string;
}

export interface Deck {
  readonly meta: DeckMeta;
  readonly slides: readonly DeckSlide[];
}

const CLASS_DIRECTIVE = /<!--\s*_class:\s*([\w-]+)\s*-->/;
const IMAGE = /!\[[^\]]*\]\(([^)]+)\)/g;
const BULLET = /^(\s*)[-*]\s+(.*)$/;
const ATTRIBUTION = /^(?:--|—)\s*(.*)$/;

interface MutableSlide {
  layout?: string;
  title?: string;
  subtitle?: string;
  bullets: DeckBullet[];
  images: string[];
  quoteLines: string[];
  attribution?: string;
}

const parseLine = (line: string, slide: MutableSlide): void => {
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
    slide.title = line.slice(2).trim();
    return;
  }
  if (line.startsWith('## ')) {
    slide.subtitle = line.slice(3).trim();
    return;
  }
  if (line.startsWith('>')) {
    const text = line.replace(/^>\s?/, '').trim();
    const attribution = ATTRIBUTION.exec(text);
    if (attribution?.[1] !== undefined) slide.attribution = attribution[1].trim();
    else if (text.length > 0) slide.quoteLines.push(text);
    return;
  }
  const bullet = BULLET.exec(line);
  if (bullet?.[1] !== undefined && bullet[2] !== undefined) {
    slide.bullets.push({ text: bullet[2].trim(), level: Math.floor(bullet[1].length / 2) });
    return;
  }
  if (line.trim().length > 0) {
    slide.bullets.push({ text: line.trim(), level: 0 });
  }
};

const inferLayout = (slide: MutableSlide, isFirst: boolean): string => {
  const hasContent =
    slide.title !== undefined ||
    slide.subtitle !== undefined ||
    slide.bullets.length > 0 ||
    slide.images.length > 0 ||
    slide.quoteLines.length > 0;
  if (!hasContent) return 'blank';
  if (slide.quoteLines.length > 0) return 'quote';
  if (slide.images.length > 0 && slide.title === undefined && slide.bullets.length === 0) return 'photo';
  if (isFirst) return 'title';
  if (slide.images.length > 0) return 'title-bullets-photo';
  return 'title-bullets';
};

const finalizeSlide = (slide: MutableSlide, isFirst: boolean): DeckSlide => {
  const layout = slide.layout ?? inferLayout(slide, isFirst);
  if (!LAYOUT_IDS.includes(layout)) {
    throw new Error(`Unknown layout "${layout}". Valid layouts: ${LAYOUT_IDS.join(', ')}`);
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
  };
};

export const parseDeck = (markdown: string): Deck => {
  const { data, content } = matter(markdown);
  const blocks = content.split(/^---$/m);

  const slides = blocks.map((block, index) => {
    const slide: MutableSlide = { bullets: [], images: [], quoteLines: [] };
    for (const line of block.split('\n')) parseLine(line, slide);
    return finalizeSlide(slide, index === 0);
  });

  const meta: DeckMeta = {
    ...(typeof data['title'] === 'string' && { title: data['title'] }),
    ...(typeof data['author'] === 'string' && { author: data['author'] }),
  };
  return { meta, slides };
};
