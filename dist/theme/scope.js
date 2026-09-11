export const EMU_PER_PT = 12700;
export const PX_PER_PT = 4 / 3;
export const ptToEmu = (pt) => Math.round(pt * EMU_PER_PT);
export const ptToPx = (pt) => Math.round(pt * PX_PER_PT);
export const SLIDE_W_PT = 1920;
export const SLIDE_H_PT = 1080;
export const MARGIN_PT = 54;
const CONTENT_W_PT = SLIDE_W_PT - 2 * MARGIN_PT;
export const BLACK = '#000000';
export const CAPTION_GREY = '#5e5e5e';
export const LABEL_BLUE = '#00a1ff';
export const LABEL_TEXT = '#ffffff';
/** Named border colours; any `#rrggbb` is accepted too. */
export const BORDER_COLORS = {
    red: '#ee220c',
    green: '#1db100',
    blue: LABEL_BLUE,
    black: BLACK,
};
export const BORDER_PT = 7;
/** Deck logo, bottom-right on every slide (`logo:` in the front matter). */
export const LOGO = { x: 1853.7, y: 988.4, w: 51.2, h: 68.1 };
/** Header bar of every scope layout. */
export const SCOPE_TEXT = {
    x: 52.9, y: 14, w: 1440, h: 43, sizePt: 23.9, font: 'light', color: BLACK, align: 'left', vAlign: 'middle',
};
export const SCOPE_LABEL = 'SCOPE:';
/** The tool logo is right-aligned inside this box (contain-fit). */
export const TOOL_LOGO = { x: 1477, y: 14.3, w: 400, h: 43 };
export const HEADER_RULE = { x: 0, y: 68, w: SLIDE_W_PT, h: 2 };
export const SCOPE_TITLE = {
    x: MARGIN_PT, y: 83.5, w: CONTENT_W_PT, h: 106, sizePt: 87.4, font: 'medium', color: BLACK, align: 'left', vAlign: 'middle',
};
export const CAPTION = {
    x: MARGIN_PT, y: 1018, w: CONTENT_W_PT, h: 28, sizePt: 17, font: 'regular', color: CAPTION_GREY, align: 'center', vAlign: 'middle',
};
/** scope-shot: one screenshot centred in the band under the headline. */
export const SHOT_FRAME = { x: MARGIN_PT, y: 210, w: CONTENT_W_PT, h: 780 };
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
};
/** scope-shot-notes: big shot left, small shot top-right, notes under it. */
export const SHOT_NOTES = {
    main: { x: 62.8, y: 188.4, w: 1115, h: 832 },
    side: { x: 1222.2, y: 172.4, w: 388, h: 501 },
    notes: { x: 1238, y: 699.4, w: 629, h: 300 },
    notesSizePt: 34.4,
};
/** Notes column typography (IS / SHOULD blocks): bullet glyph 125%, hanging indent 1em. */
export const NOTES = { bulletSizePct: 123, spaceBeforePt: 30, indentEm: 1 };
/** title-left: headline, one link line under it, a footer line at the bottom. */
export const TITLE_LEFT = {
    title: { x: MARGIN_PT, y: 405, w: CONTENT_W_PT, h: 120, sizePt: 91, font: 'medium', color: BLACK, align: 'left', vAlign: 'bottom' },
    subtitle: { x: MARGIN_PT, y: 533, w: CONTENT_W_PT, h: 40, sizePt: 31, font: 'light', color: BLACK, align: 'left', vAlign: 'top' },
    footer: { x: MARGIN_PT, y: 958, w: CONTENT_W_PT, h: 48, sizePt: 37, font: 'regular', color: BLACK, align: 'left', vAlign: 'middle' },
};
/** section-left: bigger headline, link line under it. */
export const SECTION_LEFT = {
    title: { x: MARGIN_PT, y: 375, w: CONTENT_W_PT, h: 152, sizePt: 116, font: 'medium', color: BLACK, align: 'left', vAlign: 'bottom' },
    subtitle: { x: MARGIN_PT, y: 555, w: CONTENT_W_PT, h: 40, sizePt: 31, font: 'light', color: BLACK, align: 'left', vAlign: 'top' },
};
/** title-bullets-left: Keynote "Title & Bullets" typography, left-aligned at the 54pt margin. */
export const TITLE_BULLETS_LEFT = {
    title: { x: MARGIN_PT, y: 55, w: CONTENT_W_PT, h: 112, sizePt: 112, font: 'medium', color: BLACK, align: 'left', vAlign: 'middle' },
    body: { x: MARGIN_PT, y: 240, w: CONTENT_W_PT, h: 700, sizePt: 48, font: 'regular', color: BLACK, align: 'left', vAlign: 'middle' },
    spaceBeforePt: 59,
    bulletSizePct: 125,
    indentPt: 50,
};
export const SCOPE_LAYOUT_IDS = ['scope-shot', 'scope-compare', 'scope-shot-notes'];
export const LEFT_LAYOUT_IDS = ['title-left', 'section-left', 'title-bullets-left'];
export const isScopeLayout = (id) => SCOPE_LAYOUT_IDS.includes(id);
export const isLeftLayout = (id) => LEFT_LAYOUT_IDS.includes(id);
export const isCustomLayout = (id) => isScopeLayout(id) || isLeftLayout(id);
/** Border colour for an image attribute value: a name from BORDER_COLORS or `#rrggbb`. */
export const borderColor = (value) => {
    const named = BORDER_COLORS[value.toLowerCase()];
    if (named !== undefined)
        return named;
    if (/^#[0-9a-fA-F]{6}$/.test(value))
        return value.toLowerCase();
    throw new Error(`Unknown border colour "${value}". Use ${Object.keys(BORDER_COLORS).join(', ')} or #rrggbb`);
};
/** Compare column i (0-based) image frame, in pt. */
export const compareColumn = (index) => ({
    x: COMPARE.columnX + index * COMPARE.pitch,
    y: COMPARE.imageY,
    w: COMPARE.columnW,
    h: COMPARE.imageH,
});
/** Label bar spanning columns first..last (inclusive), in pt. */
export const compareLabelBar = (first, last) => {
    const a = compareColumn(first);
    const b = compareColumn(last);
    return { x: a.x + COMPARE.labelInset, y: COMPARE.labelY, w: b.x + b.w - a.x - 2 * COMPARE.labelInset, h: COMPARE.labelH };
};
/** Notes column to the right of `count` image columns, in pt. */
export const compareNotes = (count) => {
    const last = compareColumn(Math.max(count - 1, 0));
    const x = last.x + last.w + COMPARE.notesGap;
    return { x, y: COMPARE.notesY, w: Math.max(COMPARE.notesRight - x, 100), h: SLIDE_H_PT - COMPARE.notesY - 60 };
};
