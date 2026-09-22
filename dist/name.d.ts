import type { Deck } from './parse/deck.js';
/** Filesystem-safe, human-readable slug: lowercase ASCII words joined by hyphens. */
export declare const slugify: (value: string) => string;
/**
 * Base file name for every rendered format: the deck's own title, else the input file
 * name. Throws when neither exists - an unnamed file is worse than a clear error.
 */
export declare const deckFileBase: (deck: Deck, inputName: string | undefined) => string;
