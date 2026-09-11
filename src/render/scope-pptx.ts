import type { DeckBullet } from '../parse/deck.js';
import { parseInline } from '../parse/inline.js';
import { BORDER_PT, EMU_PER_PT, type PtRect, type PtText } from '../theme/scope.js';
import { NOTE_STYLE, type Placed, type PlacedBullets, type PlacedImage, type PlacedNotes, type PlacedText } from './scope-layout.js';

/* The pptxgenjs surface the custom layouts need, typed here like pptx.ts does. */
export interface RunOptions {
  bold?: boolean;
  color?: string;
  hyperlink?: { url: string };
  underline?: { style: 'sng' };
  breakLine?: boolean;
  bullet?: { code: string; indent?: number } | boolean;
  indentLevel?: number;
  paraSpaceBefore?: number;
  fontFace?: string;
}
export interface Run {
  text: string;
  options: RunOptions;
}
export interface BoxOptions {
  x: number;
  y: number;
  w: number;
  h: number;
  fontSize: number;
  fontFace: string;
  color: string;
  align: 'left' | 'center' | 'right';
  valign: 'top' | 'middle' | 'bottom';
  margin: number;
  fit?: 'shrink';
  fill?: { color: string };
}
export interface ShapeOptions {
  x: number;
  y: number;
  w: number;
  h: number;
  fill?: { color?: string; type?: 'none' | 'solid' };
  line?: { color: string; width: number };
}
export interface CustomSlide {
  addText(text: Run[], options: BoxOptions): void;
  addImage(options: { path: string; x: number; y: number; w: number; h: number }): void;
  addShape(name: 'rect', options: ShapeOptions): void;
}

const PT_PER_INCH = 72;
const inch = (pt: number): number => pt / PT_PER_INCH;
export const LINK_COLOR = '0000EE';
const BULLET_CODE = '2022';

const FONT_FACE: Readonly<Record<PtText['font'], string>> = {
  regular: 'Helvetica Neue',
  medium: 'Helvetica Neue Medium',
  light: 'Helvetica Neue Light',
  bold: 'Helvetica Neue Bold',
};

const hex = (color: string): string => color.replace('#', '').toUpperCase();

/**
 * Inline markdown to pptx runs: links blue + underlined, bold as a real bold
 * run, `[x]{#rrggbb}` as a coloured run. Shared with the Keynote-geometry
 * layouts through pptx.ts.
 */
export const toRuns = (text: string, para: RunOptions): Run[] => {
  const segments = parseInline(text);
  return segments.map((s, index) => ({
    text: s.text,
    options: {
      ...para,
      breakLine: index === segments.length - 1 ? (para.breakLine ?? false) : false,
      ...(s.url !== undefined && { hyperlink: { url: s.url }, color: LINK_COLOR, underline: { style: 'sng' as const } }),
      ...(s.bold === true && { bold: true }),
      ...(s.color !== undefined && { color: hex(s.color) }),
      ...(index > 0 && { bullet: false }),
    },
  }));
};

const boxOptions = (t: PtText): BoxOptions => ({
  x: inch(t.x),
  y: inch(t.y),
  w: inch(t.w),
  h: inch(t.h),
  fontSize: t.sizePt,
  fontFace: FONT_FACE[t.font],
  color: hex(t.color),
  align: t.align,
  valign: t.vAlign,
  margin: 0,
});

const paintText = (slide: CustomSlide, p: PlacedText): void => {
  slide.addText(toRuns(p.text, {}), boxOptions(p.box));
};

const bulletRuns = (bullets: readonly DeckBullet[], indentPt: number, spaceBeforePt: number): Run[] =>
  bullets.flatMap((b, index) =>
    toRuns(b.text, {
      bullet: { code: BULLET_CODE, indent: indentPt },
      indentLevel: b.level,
      breakLine: true,
      ...(index > 0 && { paraSpaceBefore: spaceBeforePt }),
    }),
  );

const paintBullets = (slide: CustomSlide, p: PlacedBullets): void => {
  slide.addText(bulletRuns(p.bullets, p.indentPt, p.spaceBeforePt), { ...boxOptions(p.box), fit: 'shrink' });
};

const paintNotes = (slide: CustomSlide, p: PlacedNotes): void => {
  const indentPt = Math.round(p.sizePt * NOTE_STYLE.indentEm);
  const runs = p.columns.flatMap((col, index) => [
    { text: col.header, options: { bold: true, breakLine: true, ...(index > 0 && { paraSpaceBefore: NOTE_STYLE.spaceBeforePt }) } },
    ...bulletRuns(col.bullets, indentPt, NOTE_STYLE.spaceBeforePt).map((r) => ({
      ...r,
      options: { ...r.options, paraSpaceBefore: NOTE_STYLE.spaceBeforePt },
    })),
  ]);
  const box: PtText = { ...p.box, sizePt: p.sizePt, font: 'regular', color: '#000000', align: 'left', vAlign: 'top' };
  slide.addText(runs, { ...boxOptions(box), fit: 'shrink' });
};

const paintImage = (slide: CustomSlide, p: PlacedImage): void => {
  const r = p.rect;
  slide.addImage({ path: p.path, x: inch(r.x), y: inch(r.y), w: inch(r.w), h: inch(r.h) });
  if (p.border !== undefined) {
    /* The stroke is centred on the picture edge, like the Keynote original. */
    slide.addShape('rect', {
      x: inch(r.x),
      y: inch(r.y),
      w: inch(r.w),
      h: inch(r.h),
      fill: { type: 'none' },
      line: { color: hex(p.border), width: BORDER_PT },
    });
  }
};

const paintRect = (slide: CustomSlide, rect: PtRect, fill: string): void => {
  slide.addShape('rect', { x: inch(rect.x), y: inch(rect.y), w: inch(rect.w), h: inch(rect.h), fill: { color: hex(fill) } });
};

/** Paint one placement list onto a pptx slide. */
export const paintPlaced = (slide: CustomSlide, placed: readonly Placed[]): void => {
  for (const p of placed) {
    if (p.kind === 'text') paintText(slide, p);
    else if (p.kind === 'bullets') paintBullets(slide, p);
    else if (p.kind === 'notes') paintNotes(slide, p);
    else if (p.kind === 'image') paintImage(slide, p);
    else paintRect(slide, p.rect, p.fill);
  }
};

export const ptToEmuExact = (pt: number): number => Math.round(pt * EMU_PER_PT);
