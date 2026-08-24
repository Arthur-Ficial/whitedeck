import type { Deck } from '../parse/deck.js';
/** Render a deck through the real Marp CLI into the given output file (.html or .pdf). */
export declare const runMarp: (deck: Deck, outPath: string, extraArgs: readonly string[]) => Promise<void>;
