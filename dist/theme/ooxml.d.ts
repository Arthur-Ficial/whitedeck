import type { PlaceholderRole, TextAlign, VerticalAlign } from './types.js';
export interface RawShape {
    readonly role: PlaceholderRole;
    readonly idx?: number;
    readonly xEmu?: number;
    readonly yEmu?: number;
    readonly wEmu?: number;
    readonly hEmu?: number;
    readonly sizePt?: number;
    readonly font?: string;
    readonly color?: string;
    readonly align?: TextAlign;
    readonly vAlign?: VerticalAlign;
    readonly bullet?: string | null;
    readonly spaceBeforePt?: number;
    readonly bulletSizePct?: number;
    readonly indentPt?: number;
}
export interface RawStyleDefaults {
    readonly sizePt: number;
    readonly font: string;
    readonly color: string;
    readonly align: TextAlign;
    readonly bullet?: string;
    readonly spaceBeforePt?: number;
    readonly bulletSizePct?: number;
    readonly indentPt?: number;
}
export declare const decodeXmlEntities: (value: string) => string;
/** Split a slideLayout/slideMaster spTree into its shape and picture XML blocks. */
export declare const shapeBlocks: (xml: string) => string[];
/** Parse one <p:sp>/<p:pic> block into the raw placeholder facts it states explicitly. */
export declare const parseShape: (block: string) => RawShape | undefined;
/** Parse the lvl1 defaults of a master text style block (titleStyle/bodyStyle/otherStyle). */
export declare const parseStyleDefaults: (styleXml: string, fallbackFont: string) => RawStyleDefaults;
