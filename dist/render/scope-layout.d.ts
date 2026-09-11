import type { DeckBullet, DeckColumn, DeckMeta, DeckSlide } from '../parse/deck.js';
import { type PtRect, type PtText } from '../theme/scope.js';
export interface PlacedText {
    readonly kind: 'text';
    readonly box: PtText;
    /** Inline markdown: links, **bold**, [x]{#rrggbb}. */
    readonly text: string;
}
export interface PlacedBullets {
    readonly kind: 'bullets';
    readonly box: PtText;
    readonly bullets: readonly DeckBullet[];
    readonly spaceBeforePt: number;
    readonly indentPt: number;
    readonly bulletSizePct: number;
}
export interface PlacedNotes {
    readonly kind: 'notes';
    readonly box: PtRect;
    readonly sizePt: number;
    readonly columns: readonly DeckColumn[];
}
export interface PlacedImage {
    readonly kind: 'image';
    readonly path: string;
    readonly rect: PtRect;
    readonly border?: string;
    /** The screenshot links to the test result (caption link) or the page (scope link). */
    readonly url?: string;
}
export interface PlacedRect {
    readonly kind: 'rect';
    readonly rect: PtRect;
    readonly fill: string;
}
export type Placed = PlacedText | PlacedBullets | PlacedNotes | PlacedImage | PlacedRect;
/**
 * Paint list of a custom (scope / left) layout slide. Throws for any other
 * layout - callers branch on `isCustomLayout` first.
 */
export declare const placeCustomSlide: (slide: DeckSlide, meta: DeckMeta) => Placed[];
/** The logo alone - painted on the Keynote-geometry layouts too. */
export declare const placeLogo: (meta: DeckMeta) => Placed[];
export declare const NOTE_STYLE: {
    readonly bulletSizePct: 123;
    readonly spaceBeforePt: 30;
    readonly indentEm: 1;
};
