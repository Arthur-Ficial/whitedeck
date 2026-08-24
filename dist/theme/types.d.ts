export type PlaceholderRole = 'title' | 'body' | 'pic' | 'sldNum';
export type TextAlign = 'left' | 'center' | 'right' | 'justify';
export type VerticalAlign = 'top' | 'middle' | 'bottom';
export interface ThemePlaceholder {
    readonly role: PlaceholderRole;
    readonly idx?: number;
    readonly xEmu: number;
    readonly yEmu: number;
    readonly wEmu: number;
    readonly hEmu: number;
    readonly xPx: number;
    readonly yPx: number;
    readonly wPx: number;
    readonly hPx: number;
    readonly sizePt: number;
    readonly font: string;
    readonly color: string;
    readonly align: TextAlign;
    readonly vAlign: VerticalAlign;
    readonly bullet?: string;
    readonly spaceBeforePt?: number;
    readonly bulletSizePct?: number;
    readonly indentPt?: number;
}
export interface ThemeLayout {
    readonly keynoteName: string;
    readonly placeholders: readonly ThemePlaceholder[];
}
export interface ThemeCanvas {
    readonly widthEmu: number;
    readonly heightEmu: number;
    readonly widthPx: number;
    readonly heightPx: number;
}
export interface Theme {
    readonly name: string;
    readonly canvas: ThemeCanvas;
    readonly background: string;
    readonly fonts: {
        readonly regular: string;
        readonly medium: string;
        readonly light: string;
    };
    readonly layouts: Readonly<Record<string, ThemeLayout>>;
}
export declare const EMU_PER_PX = 9525;
export declare const emuToPx: (emu: number) => number;
