import type { Deck, DeckSlide } from '../parse/deck.js';
/**
 * Keynote has no inline markdown. Every string that reaches AppleScript must
 * be flattened first, otherwise a link renders as literal
 * "[label](https://...)" on the slide.
 */
export declare const bodyText: (slide: DeckSlide) => string | undefined;
export declare const runAppleScript: (script: string, args?: readonly string[]) => Promise<string>;
export declare const renderKey: (deck: Deck, outPath: string) => Promise<void>;
