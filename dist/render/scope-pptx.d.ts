import { type Placed } from './scope-layout.js';
export interface RunOptions {
    bold?: boolean;
    color?: string;
    hyperlink?: {
        url: string;
    };
    underline?: {
        style: 'sng';
    };
    breakLine?: boolean;
    bullet?: {
        code: string;
        indent?: number;
    } | boolean;
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
    fill?: {
        color: string;
    };
}
export interface ShapeOptions {
    x: number;
    y: number;
    w: number;
    h: number;
    fill?: {
        color?: string;
        type?: 'none' | 'solid';
    };
    line?: {
        color: string;
        width: number;
    };
}
export interface CustomSlide {
    addText(text: Run[], options: BoxOptions): void;
    addImage(options: {
        path: string;
        x: number;
        y: number;
        w: number;
        h: number;
        hyperlink?: {
            url: string;
        };
    }): void;
    addShape(name: 'rect', options: ShapeOptions): void;
}
export declare const LINK_COLOR = "0000EE";
/**
 * Inline markdown to pptx runs: links blue + underlined, bold as a real bold
 * run, `[x]{#rrggbb}` as a coloured run. Shared with the Keynote-geometry
 * layouts through pptx.ts.
 */
export declare const toRuns: (text: string, para: RunOptions) => Run[];
/** Paint one placement list onto a pptx slide. */
export declare const paintPlaced: (slide: CustomSlide, placed: readonly Placed[]) => void;
export declare const ptToEmuExact: (pt: number) => number;
