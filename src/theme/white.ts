import whiteThemeJson from './white.json' with { type: 'json' };
import type { Theme, ThemeLayout, ThemePlaceholder } from './types.js';

/** The single source of truth: Keynote White geometry extracted from Apple's own export. */
export const WHITE: Theme = whiteThemeJson as unknown as Theme;

export const LAYOUT_IDS: readonly string[] = Object.keys(WHITE.layouts);

/** Virtual layouts composed from Keynote geometry (no own master slide). */
export const VIRTUAL_LAYOUTS: Readonly<Record<string, string>> = { compare: 'title-bullets' };

export const ALL_LAYOUT_IDS: readonly string[] = [...LAYOUT_IDS, ...Object.keys(VIRTUAL_LAYOUTS)];

export const layoutOf = (id: string): ThemeLayout => {
  const resolved = VIRTUAL_LAYOUTS[id] ?? id;
  const layout = WHITE.layouts[resolved];
  if (!layout) throw new Error(`Unknown layout "${id}". Valid layouts: ${ALL_LAYOUT_IDS.join(', ')}`);
  return layout;
};

export const placeholdersByRole = (
  layout: ThemeLayout,
  role: ThemePlaceholder['role'],
): ThemePlaceholder[] => layout.placeholders.filter((p) => p.role === role);
