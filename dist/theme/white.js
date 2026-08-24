import whiteThemeJson from './white.json' with { type: 'json' };
/** The single source of truth: Keynote White geometry extracted from Apple's own export. */
export const WHITE = whiteThemeJson;
export const LAYOUT_IDS = Object.keys(WHITE.layouts);
/** Virtual layouts composed from Keynote geometry (no own master slide). */
export const VIRTUAL_LAYOUTS = { compare: 'title-bullets' };
export const ALL_LAYOUT_IDS = [...LAYOUT_IDS, ...Object.keys(VIRTUAL_LAYOUTS)];
export const layoutOf = (id) => {
    const resolved = VIRTUAL_LAYOUTS[id] ?? id;
    const layout = WHITE.layouts[resolved];
    if (!layout)
        throw new Error(`Unknown layout "${id}". Valid layouts: ${ALL_LAYOUT_IDS.join(', ')}`);
    return layout;
};
export const placeholdersByRole = (layout, role) => layout.placeholders.filter((p) => p.role === role);
