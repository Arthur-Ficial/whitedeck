import type { Deck } from '../parse/deck.js';
/** The AppleScript that turns the pptx into the .key. The only script that builds a deck. */
export declare const importScript: (pptxPath: string, outPath: string) => string;
/** Reopens a saved .key and returns every visible text of every slide, slides separated by SLIDE_SEP. */
export declare const readBackScript: (keyPath: string) => string;
/**
 * Defects on a finished .key, one message per problem. Two classes, both fatal:
 * the theme's dummy copy on a slide, and a URL printed as text that the
 * markdown did not print itself - i.e. a link target that leaked into view.
 */
export declare const keyDefects: (slideTexts: readonly string[], deck: Deck) => string[];
export declare const runAppleScript: (script: string, args?: readonly string[]) => Promise<string>;
/** Reopen the saved .key and throw on any defect. No fallback, no warn-and-continue. */
export declare const verifyKey: (deck: Deck, keyPath: string) => Promise<void>;
export declare const renderKey: (deck: Deck, outPath: string) => Promise<void>;
