export declare const AVG_GLYPH_EM = 0.48;
export declare const LINE_HEIGHT_EM = 1.15;
export interface FitBox {
    readonly widthPt: number;
    readonly heightPt: number;
    readonly sizePt: number;
    readonly minPt: number;
}
export interface NoteGroup {
    readonly header: string;
    readonly lines: readonly string[];
}
/** Height in pt of heading + bullet groups at `sizePt` (bullets wrap at width - 1em indent). */
export declare const notesHeightPt: (groups: readonly NoteGroup[], widthPt: number, sizePt: number, gapPt: number) => number;
/** The paragraph gap shrinks in proportion to the text, as Keynote's autoshrink scales paragraph spacing. */
export declare const scaledGapPt: (gapPt: number, sizePt: number, basePt: number) => number;
/**
 * Largest size (stepping down by 2pt) at which the notes block fits `heightPt`,
 * never below `minPt`; `gapPt` is the paragraph gap at `box.sizePt` and scales down with the text.
 */
export declare const fittedNotesSizePt: (groups: readonly NoteGroup[], box: FitBox, gapPt: number) => number;
/** Largest size (stepping down by 2pt) at which `text` fits the box, never below `minPt`. */
export declare const fittedSizePt: (text: string, box: FitBox) => number;
