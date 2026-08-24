import type { Deck } from '../parse/deck.js';
/** Emit canonical Marp markdown so the theme's DOM mapping is deterministic. */
export declare const toMarpMarkdown: (deck: Deck) => string;
