export interface DeckBullet {
    readonly text: string;
    readonly level: number;
}
export interface DeckColumn {
    readonly header: string;
    readonly bullets: readonly DeckBullet[];
}
export interface DeckSlide {
    readonly layout: string;
    readonly title?: string;
    readonly subtitle?: string;
    readonly bullets: readonly DeckBullet[];
    readonly images: readonly string[];
    readonly quote?: string;
    readonly attribution?: string;
    readonly source?: string;
    readonly columns?: readonly DeckColumn[];
}
export interface DeckMeta {
    readonly title?: string;
    readonly author?: string;
}
export interface Deck {
    readonly meta: DeckMeta;
    readonly slides: readonly DeckSlide[];
}
export declare const parseDeck: (markdown: string) => Deck;
