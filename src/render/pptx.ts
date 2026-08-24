import PptxGenJSImport from 'pptxgenjs';
import type { Deck, DeckSlide } from '../parse/deck.js';
import type { ThemeLayout, ThemePlaceholder } from '../theme/types.js';
import { layoutOf, placeholdersByRole, WHITE } from '../theme/white.js';

/* pptxgenjs ships UMD-style typings that NodeNext ESM cannot resolve, so the
   exact API surface whitedeck uses is typed here and the constructor cast once. */
interface TextBoxOptions {
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
    bullet: { code: string; indent?: number } | boolean;
    indentLevel: number;
    breakLine: boolean;
    paraSpaceBefore?: number;
  };
}

interface ImageOptions {
  path: string;
  x: number;
  y: number;
  w: number;
  h: number;
  sizing: { type: 'cover'; w: number; h: number };
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
  const items: TextItem[] = slide.bullets.map((bullet) => ({
    text: bullet.text,
    options: {
      bullet:
        ph.bullet !== undefined
          ? { code: BULLET_CODE, ...(ph.indentPt !== undefined && { indent: ph.indentPt }) }
          : false,
      indentLevel: bullet.level,
      breakLine: true,
      ...(ph.spaceBeforePt !== undefined && { paraSpaceBefore: ph.spaceBeforePt }),
    },
  }));
  target.addText(items, textOptions(ph));
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

const addImages = (target: PptxSlide, layout: ThemeLayout, slide: DeckSlide): void => {
  const pics = placeholdersByRole(layout, 'pic');
  slide.images.forEach((image, index) => {
    const ph = pics[index] ?? pics[0];
    if (!ph) return;
    target.addImage({
      path: image,
      x: inch(ph.xEmu),
      y: inch(ph.yEmu),
      w: inch(ph.wEmu),
      h: inch(ph.hEmu),
      sizing: { type: 'cover', w: inch(ph.wEmu), h: inch(ph.hEmu) },
    });
  });
};

const addSlideContent = (target: PptxSlide, slide: DeckSlide): void => {
  const layout = layoutOf(slide.layout);

  const titlePh = layout.placeholders.find((p) => p.role === 'title');
  if (titlePh && slide.title !== undefined) {
    target.addText(slide.title, textOptions(titlePh));
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
