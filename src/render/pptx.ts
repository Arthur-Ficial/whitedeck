
import AdmZip from 'adm-zip';
import PptxGenJSImport from 'pptxgenjs';
import type { Deck, DeckMeta, DeckSlide } from '../parse/deck.js';
import type { ThemeLayout, ThemePlaceholder } from '../theme/types.js';
import { layoutOf, placeholdersByRole, WHITE } from '../theme/white.js';
import { isCustomLayout } from '../theme/scope.js';
import { fitted, picFrame } from './geometry.js';
import { placeCustomSlide, placeLogo } from './scope-layout.js';
import { paintPlaced, toRuns, type CustomSlide, type Run, type ShapeOptions } from './scope-pptx.js';

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

type TextItem = Run;

interface ImageOptions {
  path: string;
  x: number;
  y: number;
  w: number;
  h: number;
  hyperlink?: { url: string };
  sizing?: { type: 'contain'; w: number; h: number };
}

interface PptxSlide extends CustomSlide {
  addText(text: string | TextItem[], options: TextBoxOptions): void;
  addImage(options: ImageOptions): void;
  addShape(name: 'rect', options: ShapeOptions): void;
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


const addImages = (target: PptxSlide, layout: ThemeLayout, slide: DeckSlide): void => {
  const pics = placeholdersByRole(layout, 'pic');
  slide.images.forEach((image, index) => {
    const ph = pics[index] ?? pics[0];
    if (!ph) return;
    const rect = fitted(image.path, picFrame(ph, layout));
    target.addImage({
      path: image.path,
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

const addSlideContent = (target: PptxSlide, slide: DeckSlide, meta: DeckMeta): void => {
  if (isCustomLayout(slide.layout)) {
    paintPlaced(target, placeCustomSlide(slide, meta));
    return;
  }
  paintPlaced(target, placeLogo(meta));
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

/* pptxgenjs 4.0.1 writes a hyperlink's URL into the slide's .rels part WITHOUT
   XML-escaping it, so a query string like
   `...?resource_id=x&id=y&alt_id=z&hl=en` lands as a raw `&` in the XML. That
   is not well-formed XML. PowerPoint and Google Slides are lenient about it,
   which is why the file looks fine, but strict readers reject the package:
   lxml refuses it with "EntityRef: expecting ';'", and Keynote refuses the
   whole import with "deck.pptx can't be opened right now. Keynote couldn't
   read the file." - which is what blocked every .key build of a deck whose
   captions link to Search Console.
   Escape bare ampersands in every Target attribute after pptxgenjs is done.
   `&amp;` is the correct encoding of `&`, so the URL is unchanged. */
const BARE_AMP = /&(?!(?:amp|lt|gt|quot|apos|#\d+|#x[0-9a-fA-F]+);)/g;

const escapeRelationshipTargets = async (pptxPath: string): Promise<void> => {
  const zip = new AdmZip(pptxPath);
  let changed = false;
  for (const entry of zip.getEntries()) {
    if (!entry.entryName.endsWith('.rels')) continue;
    const xml = entry.getData().toString('utf8');
    const fixed = xml.replace(/Target="([^"]*)"/g, (whole, url: string) => {
      const escaped = url.replace(BARE_AMP, '&amp;');
      return escaped === url ? whole : `Target="${escaped}"`;
    });
    if (fixed !== xml) {
      zip.updateFile(entry.entryName, Buffer.from(fixed, 'utf8'));
      changed = true;
    }
  }
  if (changed) zip.writeZip(pptxPath);
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
    target.background = { color: (slide.background ?? WHITE.background).replace('#', '') };
    addSlideContent(target, slide, deck.meta);
  }
  await pptx.writeFile({ fileName: outPath });
  await escapeRelationshipTargets(outPath);
};
