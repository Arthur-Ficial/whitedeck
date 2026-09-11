import whiteThemeJson from './white.json' with { type: 'json' };
import type { Theme, ThemeLayout, ThemePlaceholder } from './types.js';

/** The single source of truth: Keynote White geometry extracted from Apple's own export. */
export const WHITE: Theme = whiteThemeJson as unknown as Theme;

export const LAYOUT_IDS: readonly string[] = Object.keys(WHITE.layouts);

/**
 * Virtual layouts composed from Keynote geometry (no own master slide).
 * The value is the Keynote layout whose master and placeholder typography they
 * borrow; the scope/left layouts position their own boxes (`theme/scope.ts`).
 */
export const VIRTUAL_LAYOUTS: Readonly<Record<string, string>> = {
  'compare': 'title-bullets',
  'title-left': 'title',
  'section-left': 'title',
  'title-bullets-left': 'title-bullets',
  'scope-shot': 'title-top',
  'scope-compare': 'title-top',
  'scope-shot-notes': 'title-top',
};

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
