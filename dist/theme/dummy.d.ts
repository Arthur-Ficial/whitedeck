/**
 * Copy the Keynote White theme ships inside its masters. A finished deck that
 * shows any of these carries the theme's dummy text instead of its own - a
 * broken deliverable, never a warning. Measured on a real .key (2026-09-24):
 * the Quote master painted "Type a quote here." and "-Johnny Appleseed" over
 * every quote slide built on it.
 */
export declare const THEME_DUMMY_STRINGS: readonly string[];
/** Every dummy string contained in `text`, case-insensitive. */
export declare const dummyStringsIn: (text: string) => string[];
