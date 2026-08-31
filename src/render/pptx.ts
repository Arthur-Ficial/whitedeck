import { readFileSync } from 'node:fs';

import PptxGenJSImport from 'pptxgenjs';
import type { Deck, DeckSlide } from '../parse/deck.js';
import { parseInline } from '../parse/inline.js';
import type { ThemeLayout, ThemePlaceholder } from '../theme/types.js';
import { layoutOf, placeholdersByRole, WHITE } from '../theme/white.js';

/* pptxgenjs ships UMD-style typings that NodeNext ESM cannot resolve, so the
   exact API surface whitedeck uses is typed here and the constructor cast once. */
interface TextBoxOptions {
  fit?: 'shrink';
  x: number;
  y: number;
  w: number;
  h: number;
  fontSize: number;
  fontFace: string;
  color: string;
  align: 'left' | 'center' | 'right';
  margin: number;
  valign?: 'top' | 'middle' | 'bottom';
}

interface TextItem {
  text: string;
  options: {
    bullet?: { code: string; indent?: number } | boolean;
    indentLevel?: number;
    breakLine?: boolean;
    paraSpaceBefore?: number;
    hyperlink?: { url: string };
    color?: string;
    underline?: { style: 'sng' };
  };
}

const LINK_COLOR = '0000EE';

/** Markdown text to pptx runs: links become blue underlined hyperlinks. */
const toRuns = (text: string, paraOptions: TextItem['options']): TextItem[] => {
  const segments = parseInline(text);
  return segments.map((segment, index) => ({
    text: segment.text,
    options: {
      ...paraOptions,
      breakLine: index === segments.length - 1 ? (paraOptions.breakLine ?? false) : false,
      ...(segment.url !== undefined && {
        hyperlink: { url: segment.url },
        color: LINK_COLOR,
        underline: { style: 'sng' as const },
      }),
      ...(index > 0 && { bullet: false }),
    },
  }));
};

interface ImageOptions {
  path: string;
  x: number;
  y: number;
  w: number;
  h: number;
  sizing?: { type: 'contain'; w: number; h: number };
}

interface PptxSlide {
  addText(text: string | TextItem[], options: TextBoxOptions): void;
  addImage(options: ImageOptions): void;
  background: { color: string };
}

interface PptxDocument {
  defineLayout(layout: { name: string; width: number; height: number }): void;
  layout: string;
  title: string;
  author: string;
  addSlide(): PptxSlide;
  writeFile(options: { fileName: string }): Promise<string>;
}

const PptxGenJS = PptxGenJSImport as unknown as new () => PptxDocument;

const EMU_PER_INCH = 914400;
const inch = (emu: number): number => emu / EMU_PER_INCH;

const BULLET_CODE = '2022';

const textOptions = (ph: ThemePlaceholder): TextBoxOptions => ({
  fit: 'shrink',
  valign: ph.vAlign,
  x: inch(ph.xEmu),
  y: inch(ph.yEmu),
  w: inch(ph.wEmu),
  h: inch(ph.hEmu),
  fontSize: ph.sizePt,
  fontFace: ph.font,
  color: ph.color.replace('#', ''),
  align: ph.align === 'justify' ? 'left' : ph.align,
  margin: 0,
});

const addBullets = (target: PptxSlide, ph: ThemePlaceholder, slide: DeckSlide): void => {
  const items: TextItem[] = slide.bullets.flatMap((bullet) =>
    toRuns(bullet.text, {
      bullet:
        ph.bullet !== undefined
          ? { code: BULLET_CODE, ...(ph.indentPt !== undefined && { indent: ph.indentPt }) }
          : false,
      indentLevel: bullet.level,
      breakLine: true,
      ...(ph.spaceBeforePt !== undefined && { paraSpaceBefore: ph.spaceBeforePt }),
    }),
  );
  target.addText(items, textOptions(ph));
};

const SOURCE_NOTE = { xPx: 177, yPx: 1360, wPx: 2206, hPx: 56, sizePt: 24 };

const addSource = (target: PptxSlide, slide: DeckSlide): void => {
  if (slide.source === undefined) return;
  const pxEmu = 9525;
  const items = toRuns(slide.source, { breakLine: false });
  target.addText(items, {
    x: inch(SOURCE_NOTE.xPx * pxEmu),
    y: inch(SOURCE_NOTE.yPx * pxEmu),
    w: inch(SOURCE_NOTE.wPx * pxEmu),
    h: inch(SOURCE_NOTE.hPx * pxEmu),
    fontSize: SOURCE_NOTE.sizePt,
    fontFace: 'Helvetica Neue Light',
    color: '666666',
    align: 'left',
    margin: 0,
    valign: 'middle',
  });
};

const addQuote = (target: PptxSlide, layout: ThemeLayout, slide: DeckSlide): void => {
  const bodies = [...placeholdersByRole(layout, 'body')].sort((a, b) => b.sizePt - a.sizePt);
  const quotePh = bodies[0];
  const attributionPh = bodies[1];
  if (slide.quote !== undefined && quotePh) {
    target.addText(slide.quote, textOptions(quotePh));
  }
  if (slide.attribution !== undefined && attributionPh) {
    target.addText(`—${slide.attribution}`, textOptions(attributionPh));
  }
};

/** 24px of breathing room at 96dpi, expressed in EMU. */
const TEXT_GAP_EMU = 228600;

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Keynote photo frames start above the slide, run into the text placeholders
 * below them and are narrower than the text column. Clamp both vertical edges
 * and widen to the text column, so an image is never cut off, never overlaps
 * the title and uses the empty side margins.
 */
const overlapsX = (a: ThemePlaceholder, b: ThemePlaceholder): boolean =>
  a.xEmu < b.xEmu + b.wEmu && b.xEmu < a.xEmu + a.wEmu;

const picFrame = (ph: ThemePlaceholder, layout: ThemeLayout): Rect => {
  const texts = layout.placeholders.filter((p) => p.role === 'title' || p.role === 'body');
  const top = Math.max(ph.yEmu, 0);
  // Only text that sits UNDER the picture can be run into; text beside it
  // (title-bullets-photo, photo-vertical) must not shorten the frame.
  const below = texts.filter((p) => p.yEmu > top && overlapsX(ph, p)).map((p) => p.yEmu);
  const limit = below.length > 0 ? Math.min(...below) - TEXT_GAP_EMU : Number.POSITIVE_INFINITY;
  const bottom = Math.min(ph.yEmu + ph.hEmu, limit);
  const beside = texts.some((p) => p.yEmu < bottom && top < p.yEmu + p.hEmu);
  const column = beside
    ? undefined
    : texts.reduce<ThemePlaceholder | undefined>(
        (widest, p) => (widest === undefined || p.wEmu > widest.wEmu ? p : widest),
        undefined,
      );
  const wide = column !== undefined && column.wEmu > ph.wEmu;
  return {
    x: wide ? column.xEmu : ph.xEmu,
    y: top,
    w: wide ? column.wEmu : ph.wEmu,
    h: Math.max(bottom - top, 1),
  };
};

/** PNG intrinsic size from the IHDR chunk; undefined for anything else. */
const pngSize = (path: string): { w: number; h: number } | undefined => {
  let head: Buffer;
  try {
    head = readFileSync(path).subarray(0, 24);
  } catch {
    return undefined;
  }
  if (head.length < 24 || head.readUInt32BE(0) !== 0x89504e47) return undefined;
  return { w: head.readUInt32BE(16), h: head.readUInt32BE(20) };
};

/** Scale the image down into the frame, preserving aspect ratio, centred. */
const fitted = (path: string, frame: Rect): Rect => {
  const size = pngSize(path);
  if (size === undefined || size.w === 0 || size.h === 0) return frame;
  const scale = Math.min(frame.w / size.w, frame.h / size.h);
  const w = size.w * scale;
  const h = size.h * scale;
  return { x: frame.x + (frame.w - w) / 2, y: frame.y + (frame.h - h) / 2, w, h };
};

const addImages = (target: PptxSlide, layout: ThemeLayout, slide: DeckSlide): void => {
  const pics = placeholdersByRole(layout, 'pic');
  slide.images.forEach((image, index) => {
    const ph = pics[index] ?? pics[0];
    if (!ph) return;
    const rect = fitted(image, picFrame(ph, layout));
    target.addImage({
      path: image,
      x: inch(rect.x),
      y: inch(rect.y),
      w: inch(rect.w),
      h: inch(rect.h),
    });
  });
};

const addColumns = (target: PptxSlide, ph: ThemePlaceholder, slide: DeckSlide): void => {
  const columns = slide.columns ?? [];
  if (columns.length === 0) return;
  const gutter = (ph.indentPt ?? 50) * 12700 * 2;
  const colW = (ph.wEmu - gutter * (columns.length - 1)) / columns.length;
  columns.forEach((column, index) => {
    const x = ph.xEmu + index * (colW + gutter);
    const items: TextItem[] = [
      { text: column.header, options: { breakLine: true } },
      ...column.bullets.flatMap((bullet) =>
        toRuns(bullet.text, {
          bullet: ph.bullet !== undefined ? { code: BULLET_CODE } : false,
          breakLine: true,
          ...(ph.spaceBeforePt !== undefined && { paraSpaceBefore: ph.spaceBeforePt }),
        }),
      ),
    ];
    target.addText(items, {
      ...textOptions(ph),
      x: inch(x),
      w: inch(colW),
      valign: 'top',
    });
  });
};

const addSlideContent = (target: PptxSlide, slide: DeckSlide): void => {
  const layout = layoutOf(slide.layout);

  const titlePh = layout.placeholders.find((p) => p.role === 'title');
  if (titlePh && slide.title !== undefined) {
    target.addText(slide.title, textOptions(titlePh));
  }

  if (slide.columns !== undefined) {
    const bodyPh = layout.placeholders.find((p) => p.role === 'body');
    if (bodyPh) addColumns(target, bodyPh, slide);
    addSource(target, slide);
    return;
  }

  if (slide.layout === 'quote') {
    addQuote(target, layout, slide);
  } else {
    const bodyPh = layout.placeholders.find((p) => p.role === 'body');
    if (bodyPh) {
      if (slide.bullets.length > 0) addBullets(target, bodyPh, slide);
      if (slide.subtitle !== undefined) {
        target.addText(slide.subtitle, textOptions(bodyPh));
      }
    }
  }

  addImages(target, layout, slide);
  addSource(target, slide);
};

export const renderPptx = async (deck: Deck, outPath: string): Promise<void> => {
  const pptx = new PptxGenJS();
  pptx.defineLayout({
    name: 'KEYNOTE_16x9',
    width: inch(WHITE.canvas.widthEmu),
    height: inch(WHITE.canvas.heightEmu),
  });
  pptx.layout = 'KEYNOTE_16x9';
  if (deck.meta.title !== undefined) pptx.title = deck.meta.title;
  if (deck.meta.author !== undefined) pptx.author = deck.meta.author;

  for (const slide of deck.slides) {
    const target = pptx.addSlide();
    target.background = { color: WHITE.background.replace('#', '') };
    addSlideContent(target, slide);
  }
  await pptx.writeFile({ fileName: outPath });
};
