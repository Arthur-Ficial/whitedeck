import { type Placed } from './scope-layout.js';
/** Styled runs of one paragraph, offset by `base` characters (bold font, colour). */
export declare const runStatements: (v: string, text: string, base: number) => string[];
/** AppleScript statements (inside `tell application "Keynote"`, slide var `s`) for a paint list. */
export declare const placedStatements: (placed: readonly Placed[]) => string[];
