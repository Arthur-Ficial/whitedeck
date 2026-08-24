import type { Theme, ThemeLayout, ThemePlaceholder } from './types.js';
/** The single source of truth: Keynote White geometry extracted from Apple's own export. */
export declare const WHITE: Theme;
export declare const LAYOUT_IDS: readonly string[];
/** Virtual layouts composed from Keynote geometry (no own master slide). */
export declare const VIRTUAL_LAYOUTS: Readonly<Record<string, string>>;
export declare const ALL_LAYOUT_IDS: readonly string[];
export declare const layoutOf: (id: string) => ThemeLayout;
export declare const placeholdersByRole: (layout: ThemeLayout, role: ThemePlaceholder["role"]) => ThemePlaceholder[];
