import type { ThemeLayout, ThemePlaceholder } from '../theme/types.js';
export interface Rect {
    readonly x: number;
    readonly y: number;
    readonly w: number;
    readonly h: number;
}
export declare const EMU_PER_PT = 12700;
/** Breathing room between a picture and the text below it, and around the source line. */
export declare const TEXT_GAP_EMU = 228600;
export declare const canvas: () => Rect;
/**
 * Cut `obstacle` (plus a gap) out of `frame`, keeping the largest remaining
 * axis-aligned rectangle. Four candidate cuts - above, below, left, right -
 * so a picture beside a text column is narrowed rather than shortened.
 */
export declare const carveExported: (frame: Rect, obstacle: Rect, gap: number) => Rect;
/**
 * Keynote photo frames start outside the slide and run into the text
 * placeholders. Clamp the frame to the canvas, widen it to the text column
 * when no text sits beside it, then carve out every title/body rect - so an
 * image is never cut off, never leaves the slide and never overlaps text.
 *
 * Shared by the pptx AND the key renderer. The .key path used the raw
 * placeholder rect until 2026-09-01, which is why charts painted over the
 * headline (photo-horizontal pic y -31..921 vs title y 749..907).
 */
export declare const picFrame: (ph: ThemePlaceholder, layout: ThemeLayout) => Rect;
/** PNG intrinsic size from the IHDR chunk; undefined for anything else. */
export declare const pngSize: (path: string) => {
    w: number;
    h: number;
} | undefined;
/** Scale the image down into the frame, preserving aspect ratio, centred. */
export declare const fitted: (path: string, frame: Rect) => Rect;
/**
 * Where the "Source:" line goes. Never hardcoded: it sits in the text column,
 * above the slide-number placeholder and inside the canvas. When the body
 * placeholder carries no text it is removed, so the source may use that band.
 */
export declare const sourceFrame: (layout: ThemeLayout, bodyUsed: boolean) => Rect;
/** True when the rect lies fully inside the slide canvas. */
export declare const insideCanvas: (r: Rect) => boolean;
export declare const intersects: (a: Rect, b: Rect) => boolean;
export declare const rectOf: (p: ThemePlaceholder) => Rect;
/**
 * The rectangle a picture may occupy on a slide whose master has NO photo
 * placeholder. The .key renderer deliberately uses a text master for image
 * slides: a photo master paints its own stock picture, which then shows
 * behind a letterboxed chart. Uses the body band, minus the source line.
 */
export declare const imageBandFrame: (layout: ThemeLayout, hasSource: boolean) => Rect;
export declare const bodyFrame: (layout: ThemeLayout, hasSource: boolean) => Rect;
