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
export declare const EMU_PER_PT = 12700;
export declare const PX_PER_PT: number;
export declare const ptToEmu: (pt: number) => number;
export declare const ptToPx: (pt: number) => number;
export declare const SLIDE_W_PT = 1920;
export declare const SLIDE_H_PT = 1080;
export declare const MARGIN_PT = 54;
export declare const BLACK = "#000000";
export declare const CAPTION_GREY = "#5e5e5e";
export declare const LABEL_BLUE = "#00a1ff";
export declare const LABEL_TEXT = "#ffffff";
/** Named border colours; any `#rrggbb` is accepted too. */
export declare const BORDER_COLORS: Readonly<Record<string, string>>;
export declare const BORDER_PT = 7;
/** Deck logo, bottom-right on every slide (`logo:` in the front matter). */
export declare const LOGO: PtRect;
/** Header bar of every scope layout. */
export declare const SCOPE_TEXT: PtText;
export declare const SCOPE_LABEL = "SCOPE:";
/** The tool logo is right-aligned inside this box (contain-fit). */
export declare const TOOL_LOGO: PtRect;
export declare const HEADER_RULE: PtRect;
export declare const SCOPE_TITLE: PtText;
export declare const CAPTION: PtText;
/** scope-shot: one screenshot centred in the band under the headline. */
export declare const SHOT_FRAME: PtRect;
/** scope-compare: image columns, one label bar per run of equal labels, notes to the right. */
export declare const COMPARE: {
    readonly columnX: 58.1;
    readonly columnW: 403;
    readonly pitch: 434.9;
    readonly imageY: 269.7;
    readonly imageH: 803;
    readonly labelY: 201.1;
    readonly labelH: 53.7;
    readonly labelInset: 16.3;
    readonly labelSizePt: 32;
    readonly notesGap: 38.9;
    readonly notesY: 218.1;
    readonly notesRight: 1867;
    readonly notesSizePt: 37;
};
/** scope-shot-notes: big shot left, small shot top-right, notes under it. */
export declare const SHOT_NOTES: {
    readonly main: PtRect;
    readonly side: PtRect;
    readonly notes: PtRect;
    readonly notesSizePt: 34.4;
};
/** Notes column typography (IS / SHOULD blocks): bullet glyph 125%, hanging indent 1em. */
export declare const NOTES: {
    readonly bulletSizePct: 123;
    readonly spaceBeforePt: 30;
    readonly indentEm: 1;
};
/** title-left: headline, one link line under it, a footer line at the bottom. */
export declare const TITLE_LEFT: {
    readonly title: PtText;
    readonly subtitle: PtText;
    readonly footer: PtText;
};
/** section-left: bigger headline, link line under it. */
export declare const SECTION_LEFT: {
    readonly title: PtText;
    readonly subtitle: PtText;
};
/** title-bullets-left: Keynote "Title & Bullets" typography, left-aligned at the 54pt margin. */
export declare const TITLE_BULLETS_LEFT: {
    readonly title: PtText;
    readonly body: PtText;
    readonly spaceBeforePt: 59;
    readonly bulletSizePct: 125;
    readonly indentPt: 50;
};
export declare const SCOPE_LAYOUT_IDS: readonly ["scope-shot", "scope-compare", "scope-shot-notes"];
export declare const LEFT_LAYOUT_IDS: readonly ["title-left", "section-left", "title-bullets-left"];
export declare const isScopeLayout: (id: string) => boolean;
export declare const isLeftLayout: (id: string) => boolean;
export declare const isCustomLayout: (id: string) => boolean;
/** Border colour for an image attribute value: a name from BORDER_COLORS or `#rrggbb`. */
export declare const borderColor: (value: string) => string;
/** Compare column i (0-based) image frame, in pt. */
export declare const compareColumn: (index: number) => PtRect;
/** Label bar spanning columns first..last (inclusive), in pt. */
export declare const compareLabelBar: (first: number, last: number) => PtRect;
/** Notes column to the right of `count` image columns, in pt. */
export declare const compareNotes: (count: number) => PtRect;
