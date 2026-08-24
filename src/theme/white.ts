import whiteThemeJson from './white.json' with { type: 'json' };
import type { Theme, ThemeLayout, ThemePlaceholder } from './types.js';

/** The single source of truth: Keynote White geometry extracted from Apple's own export. */
export const WHITE: Theme = whiteThemeJson as unknown as Theme;

export const LAYOUT_IDS: readonly string[] = Object.keys(WHITE.layouts);

export const layoutOf = (id: string): ThemeLayout => {
  const layout = WHITE.layouts[id];
  if (!layout) throw new Error(`Unknown layout "${id}". Valid layouts: ${LAYOUT_IDS.join(', ')}`);
  return layout;
};

export const placeholdersByRole = (
  layout: ThemeLayout,
  role: ThemePlaceholder['role'],
): ThemePlaceholder[] => layout.placeholders.filter((p) => p.role === role);
