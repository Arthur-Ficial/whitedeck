import whiteThemeJson from './white.json' with { type: 'json' };
/** The single source of truth: Keynote White geometry extracted from Apple's own export. */
export const WHITE = whiteThemeJson;
export const LAYOUT_IDS = Object.keys(WHITE.layouts);
/**
 * Virtual layouts composed from Keynote geometry (no own master slide).
 * The value is the Keynote layout whose master and placeholder typography they
 * borrow; the scope/left layouts position their own boxes (`theme/scope.ts`).
 */
export const VIRTUAL_LAYOUTS = {
    'compare': 'title-bullets',
    'title-left': 'title',
    'section-left': 'title',
    'title-bullets-left': 'title-bullets',
    'scope-shot': 'title-top',
    'scope-compare': 'title-top',
    'scope-shot-notes': 'title-top',
};
export const ALL_LAYOUT_IDS = [...LAYOUT_IDS, ...Object.keys(VIRTUAL_LAYOUTS)];
export const layoutOf = (id) => {
    const resolved = VIRTUAL_LAYOUTS[id] ?? id;
    const layout = WHITE.layouts[resolved];
    if (!layout)
        throw new Error(`Unknown layout "${id}". Valid layouts: ${ALL_LAYOUT_IDS.join(', ')}`);
    return layout;
};
export const placeholdersByRole = (layout, role) => layout.placeholders.filter((p) => p.role === role);
