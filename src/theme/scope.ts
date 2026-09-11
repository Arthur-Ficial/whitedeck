/**
 * Geometry of the "scope" layouts - annotated-screenshot slides with a header
 * bar (`Scope:` text + tool logo + hairline), a left-aligned headline, bordered
 * screenshots, label bars, a notes column and a small caption link; plus the
 * left-aligned title, section and bullet slides that go with them.
 *
 * Every number was measured (PyMuPDF) on a 1920x1080 pt Keynote export of the
 * f19n "3 SEO Tests" deck (2024) and is stored in POINTS. Renderers convert
 * with `ptToEmu` / `ptToPx` so all four formats share one truth.
 */
export interface PtRect {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

export interface PtText extends PtRect {
  readonly sizePt: number;
  readonly font: 'regular' | 'medium' | 'light' | 'bold';
  readonly color: string;
  readonly align: 'left' | 'center';
  readonly vAlign: 'top' | 'middle' | 'bottom';
}

export const EMU_PER_PT = 12700;
export const PX_PER_PT = 4 / 3;
export const ptToEmu = (pt: number): number => Math.round(pt * EMU_PER_PT);
export const ptToPx = (pt: number): number => Math.round(pt * PX_PER_PT);

export const SLIDE_W_PT = 1920;
export const SLIDE_H_PT = 1080;
export const MARGIN_PT = 54;
const CONTENT_W_PT = SLIDE_W_PT - 2 * MARGIN_PT;

export const BLACK = '#000000';
export const CAPTION_GREY = '#5e5e5e';
export const LABEL_BLUE = '#00a1ff';
export const LABEL_TEXT = '#ffffff';

/** Named border colours; any `#rrggbb` is accepted too. */
export const BORDER_COLORS: Readonly<Record<string, string>> = {
  red: '#ee220c',
  green: '#1db100',
  blue: LABEL_BLUE,
  black: BLACK,
};
export const BORDER_PT = 7;

/** Deck logo, bottom-right on every slide (`logo:` in the front matter). */
export const LOGO: PtRect = { x: 1853.7, y: 988.4, w: 51.2, h: 68.1 };

/** Header bar of every scope layout. */
export const SCOPE_TEXT: PtText = {
  x: 52.9, y: 14, w: 1440, h: 43, sizePt: 23.9, font: 'light', color: BLACK, align: 'left', vAlign: 'middle',
};
export const SCOPE_LABEL = 'SCOPE:';
/** The tool logo is right-aligned inside this box (contain-fit). */
export const TOOL_LOGO: PtRect = { x: 1477, y: 14.3, w: 400, h: 43 };
export const HEADER_RULE: PtRect = { x: 0, y: 68, w: SLIDE_W_PT, h: 2 };

export const SCOPE_TITLE: PtText = {
  x: MARGIN_PT, y: 83.5, w: CONTENT_W_PT, h: 106, sizePt: 87.4, font: 'medium', color: BLACK, align: 'left', vAlign: 'middle',
};

export const CAPTION: PtText = {
  x: MARGIN_PT, y: 1018, w: CONTENT_W_PT, h: 28, sizePt: 17, font: 'regular', color: CAPTION_GREY, align: 'center', vAlign: 'middle',
};

/** scope-shot: one screenshot centred in the band under the headline. */
export const SHOT_FRAME: PtRect = { x: MARGIN_PT, y: 210, w: CONTENT_W_PT, h: 780 };

/** scope-compare: image columns, one label bar per run of equal labels, notes to the right. */
export const COMPARE = {
  columnX: 58.1,
  columnW: 403,
  pitch: 434.9,
  imageY: 269.7,
  imageH: 803,
  labelY: 201.1,
  labelH: 53.7,
  labelInset: 16.3,
  labelSizePt: 32,
  notesGap: 38.9,
  notesY: 218.1,
  notesRight: 1867,
  notesSizePt: 37,
} as const;

/** scope-shot-notes: big shot left, small shot top-right, notes under it. */
export const SHOT_NOTES = {
  main: { x: 62.8, y: 188.4, w: 1115, h: 832 } as PtRect,
  side: { x: 1222.2, y: 172.4, w: 388, h: 501 } as PtRect,
  notes: { x: 1238, y: 699.4, w: 629, h: 300 } as PtRect,
  notesSizePt: 34.4,
} as const;

/** Notes column typography (IS / SHOULD blocks): bullet glyph 125%, hanging indent 1em. */
export const NOTES = { bulletSizePct: 123, spaceBeforePt: 30, indentEm: 1 } as const;

/** title-left: headline, one link line under it, a footer line at the bottom. */
export const TITLE_LEFT = {
  title: { x: MARGIN_PT, y: 405, w: CONTENT_W_PT, h: 120, sizePt: 91, font: 'medium', color: BLACK, align: 'left', vAlign: 'bottom' } as PtText,
  subtitle: { x: MARGIN_PT, y: 533, w: CONTENT_W_PT, h: 40, sizePt: 31, font: 'light', color: BLACK, align: 'left', vAlign: 'top' } as PtText,
  footer: { x: MARGIN_PT, y: 958, w: CONTENT_W_PT, h: 48, sizePt: 37, font: 'regular', color: BLACK, align: 'left', vAlign: 'middle' } as PtText,
} as const;

/** section-left: bigger headline, link line under it. */
export const SECTION_LEFT = {
  title: { x: MARGIN_PT, y: 375, w: CONTENT_W_PT, h: 152, sizePt: 116, font: 'medium', color: BLACK, align: 'left', vAlign: 'bottom' } as PtText,
  subtitle: { x: MARGIN_PT, y: 555, w: CONTENT_W_PT, h: 40, sizePt: 31, font: 'light', color: BLACK, align: 'left', vAlign: 'top' } as PtText,
} as const;

/** title-bullets-left: Keynote "Title & Bullets" typography, left-aligned at the 54pt margin. */
export const TITLE_BULLETS_LEFT = {
  title: { x: MARGIN_PT, y: 55, w: CONTENT_W_PT, h: 112, sizePt: 112, font: 'medium', color: BLACK, align: 'left', vAlign: 'middle' } as PtText,
  body: { x: MARGIN_PT, y: 240, w: CONTENT_W_PT, h: 700, sizePt: 48, font: 'regular', color: BLACK, align: 'left', vAlign: 'middle' } as PtText,
  spaceBeforePt: 59,
  bulletSizePct: 125,
  indentPt: 50,
} as const;

export const SCOPE_LAYOUT_IDS = ['scope-shot', 'scope-compare', 'scope-shot-notes'] as const;
export const LEFT_LAYOUT_IDS = ['title-left', 'section-left', 'title-bullets-left'] as const;
export const isScopeLayout = (id: string): boolean => (SCOPE_LAYOUT_IDS as readonly string[]).includes(id);
export const isLeftLayout = (id: string): boolean => (LEFT_LAYOUT_IDS as readonly string[]).includes(id);
export const isCustomLayout = (id: string): boolean => isScopeLayout(id) || isLeftLayout(id);

/** Border colour for an image attribute value: a name from BORDER_COLORS or `#rrggbb`. */
export const borderColor = (value: string): string => {
  const named = BORDER_COLORS[value.toLowerCase()];
  if (named !== undefined) return named;
  if (/^#[0-9a-fA-F]{6}$/.test(value)) return value.toLowerCase();
  throw new Error(`Unknown border colour "${value}". Use ${Object.keys(BORDER_COLORS).join(', ')} or #rrggbb`);
};

/** Compare column i (0-based) image frame, in pt. */
export const compareColumn = (index: number): PtRect => ({
  x: COMPARE.columnX + index * COMPARE.pitch,
  y: COMPARE.imageY,
  w: COMPARE.columnW,
  h: COMPARE.imageH,
});

/** Label bar spanning columns first..last (inclusive), in pt. */
export const compareLabelBar = (first: number, last: number): PtRect => {
  const a = compareColumn(first);
  const b = compareColumn(last);
  return { x: a.x + COMPARE.labelInset, y: COMPARE.labelY, w: b.x + b.w - a.x - 2 * COMPARE.labelInset, h: COMPARE.labelH };
};

/** Notes column to the right of `count` image columns, in pt. */
export const compareNotes = (count: number): PtRect => {
  const last = compareColumn(Math.max(count - 1, 0));
  const x = last.x + last.w + COMPARE.notesGap;
  return { x, y: COMPARE.notesY, w: Math.max(COMPARE.notesRight - x, 100), h: SLIDE_H_PT - COMPARE.notesY - 60 };
};
