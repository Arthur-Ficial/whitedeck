import type { Deck } from '../parse/deck.js';
export declare const runAppleScript: (script: string, args?: readonly string[]) => Promise<string>;
export declare const renderKey: (deck: Deck, outPath: string) => Promise<void>;
