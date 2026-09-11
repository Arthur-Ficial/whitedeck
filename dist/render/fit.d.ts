export declare const AVG_GLYPH_EM = 0.46;
export declare const LINE_HEIGHT_EM = 1.15;
export interface FitBox {
    readonly widthPt: number;
    readonly heightPt: number;
    readonly sizePt: number;
    readonly minPt: number;
}
/** Largest size (stepping down by 2pt) at which `text` fits the box, never below `minPt`. */
export declare const fittedSizePt: (text: string, box: FitBox) => number;
