export interface DeckBullet {
    readonly text: string;
    readonly level: number;
}
export interface DeckColumn {
    readonly header: string;
    readonly bullets: readonly DeckBullet[];
}
/** An image with the attributes carried in its alt text: `![border=red label="JS on"](x.png)`. */
export interface DeckImage {
    readonly path: string;
    /** Border colour as `#rrggbb`; absent = no border. */
    readonly border?: string;
    /** Label bar text above the image (scope-compare). */
    readonly label?: string;
}
export interface DeckSlide {
    readonly layout: string;
    /** Per-slide background colour from `<!-- _background: #RRGGBB -->`. White when absent. */
    readonly background?: string;
    readonly title?: string;
    readonly subtitle?: string;
    readonly bullets: readonly DeckBullet[];
    readonly images: readonly DeckImage[];
    readonly quote?: string;
    readonly attribution?: string;
    readonly source?: string;
    readonly columns?: readonly DeckColumn[];
    /** `Scope:` header text of a scope layout (inline markdown allowed). */
    readonly scope?: string;
    /** `Tool:` logo image path shown top-right of a scope layout. */
    readonly tool?: string;
    /** `Caption:` small grey line at the bottom (inline markdown allowed). */
    readonly caption?: string;
    /** `Footer:` free text line at the bottom-left (title-left). */
    readonly footer?: string;
}
export interface DeckMeta {
    readonly title?: string;
    readonly author?: string;
    /** Image painted bottom-right on every slide. */
    readonly logo?: string;
}
export interface Deck {
    readonly meta: DeckMeta;
    readonly slides: readonly DeckSlide[];
}
export declare const parseDeck: (markdown: string) => Deck;
