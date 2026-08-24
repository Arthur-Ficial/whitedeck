import Pptxgen from 'pptxgenjs';
import type { Deck, DeckSlide } from '../parse/deck.js';
import whiteTheme from '../theme/white.json' with { type: 'json' };

const EMU_PER_INCH = 914400;
const inch = (emu: number): number => emu / EMU_PER_INCH;

const BULLET_CODE = '2022';

type JsonLayout = (typeof whiteTheme.layouts)['title-bullets'];
type JsonPlaceholder = JsonLayout['placeholders'][number];
type Slide = ReturnType<Pptxgen['addSlide']>;

const themeLayout = (id: string): JsonLayout => {
  const layout = whiteTheme.layouts[id as keyof typeof whiteTheme.layouts];
  if (!layout) throw new Error(`Unknown layout "${id}" in white.json`);
  return layout;
};

const textOptions = (ph: JsonPlaceholder): Pptxgen.TextPropsOptions => ({
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

const addBullets = (target: Slide, ph: JsonPlaceholder, slide: DeckSlide): void => {
  const items = slide.bullets.map((bullet) => ({
    text: bullet.text,
    options: {
      bullet: ph.bullet !== undefined ? { code: BULLET_CODE } : false,
      indentLevel: bullet.level,
      breakLine: true,
    },
  }));
  target.addText(items, { ...textOptions(ph), valign: 'top' });
};

const addQuote = (target: Slide, layout: JsonLayout, slide: DeckSlide): void => {
  const bodies = layout.placeholders
    .filter((p) => p.role === 'body')
    .sort((a, b) => b.sizePt - a.sizePt);
  const quotePh = bodies[0];
  const attributionPh = bodies[1];
  if (slide.quote !== undefined && quotePh) {
    target.addText(slide.quote, { ...textOptions(quotePh), valign: 'middle' });
  }
  if (slide.attribution !== undefined && attributionPh) {
    target.addText(`—${slide.attribution}`, { ...textOptions(attributionPh), valign: 'middle' });
  }
};

const addImages = (target: Slide, layout: JsonLayout, slide: DeckSlide): void => {
  const pics = layout.placeholders.filter((p) => p.role === 'pic');
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

const addSlideContent = (target: Slide, slide: DeckSlide): void => {
  const layout = themeLayout(slide.layout);

  const titlePh = layout.placeholders.find((p) => p.role === 'title');
  if (titlePh && slide.title !== undefined) {
    target.addText(slide.title, { ...textOptions(titlePh), valign: 'middle' });
  }

  if (slide.layout === 'quote') {
    addQuote(target, layout, slide);
  } else {
    const bodyPh = layout.placeholders.find((p) => p.role === 'body');
    if (bodyPh) {
      if (slide.bullets.length > 0) addBullets(target, bodyPh, slide);
      if (slide.subtitle !== undefined) {
        target.addText(slide.subtitle, { ...textOptions(bodyPh), valign: 'middle' });
      }
    }
  }

  addImages(target, themeLayout(slide.layout), slide);
};

export const renderPptx = async (deck: Deck, outPath: string): Promise<void> => {
  const pptx = new Pptxgen();
  pptx.defineLayout({
    name: 'KEYNOTE_16x9',
    width: inch(whiteTheme.canvas.widthEmu),
    height: inch(whiteTheme.canvas.heightEmu),
  });
  pptx.layout = 'KEYNOTE_16x9';
  if (deck.meta.title !== undefined) pptx.title = deck.meta.title;
  if (deck.meta.author !== undefined) pptx.author = deck.meta.author;

  for (const slide of deck.slides) {
    const target = pptx.addSlide();
    target.background = { color: whiteTheme.background.replace('#', '') };
    addSlideContent(target, slide);
  }
  await pptx.writeFile({ fileName: outPath });
};
