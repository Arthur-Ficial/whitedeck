const ALIGN_MAP = {
    l: 'left',
    ctr: 'center',
    r: 'right',
    just: 'justify',
};
const ANCHOR_MAP = {
    t: 'top',
    ctr: 'middle',
    b: 'bottom',
};
export const decodeXmlEntities = (value) => value
    .replaceAll('&amp;', '&')
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'");
const firstMatch = (block, re) => re.exec(block)?.[1];
const realTypeface = (block) => {
    for (const m of block.matchAll(/typeface="([^"]+)"/g)) {
        const face = m[1];
        if (face !== undefined && !face.startsWith('+'))
            return decodeXmlEntities(face);
    }
    return undefined;
};
/** Split a slideLayout/slideMaster spTree into its shape and picture XML blocks. */
export const shapeBlocks = (xml) => [...xml.matchAll(/<p:sp>[\s\S]*?<\/p:sp>|<p:pic>[\s\S]*?<\/p:pic>/g)].map((m) => m[0]);
/** Parse one <p:sp>/<p:pic> block into the raw placeholder facts it states explicitly. */
export const parseShape = (block) => {
    const ph = /<p:ph type="(\w+)"(?: idx="(\d+)")?/.exec(block);
    if (!ph?.[1])
        return undefined;
    const role = ph[1];
    if (!['title', 'body', 'pic', 'sldNum'].includes(role))
        return undefined;
    const font = realTypeface(block);
    const off = /<a:off x="(-?\d+)" y="(-?\d+)"/.exec(block);
    const ext = /<a:ext cx="(\d+)" cy="(\d+)"/.exec(block);
    const sz = firstMatch(block, /sz="(\d+)"/);
    const algn = firstMatch(block, /algn="(\w+)"/);
    const color = firstMatch(block, /<a:srgbClr val="([0-9A-Fa-f]{6})"/);
    const buChar = firstMatch(block, /buChar char="([^"]*)"/);
    const hasBuNone = block.includes('<a:buNone');
    const spacing = parseSpacing(block);
    const anchor = /<a:bodyPr[^>]*anchor="(\w+)"/.exec(block)?.[1];
    const vAlign = anchor !== undefined ? ANCHOR_MAP[anchor] : undefined;
    return {
        role,
        ...(ph[2] !== undefined && { idx: Number(ph[2]) }),
        ...(off?.[1] !== undefined && off[2] !== undefined && { xEmu: Number(off[1]), yEmu: Number(off[2]) }),
        ...(ext?.[1] !== undefined && ext[2] !== undefined && { wEmu: Number(ext[1]), hEmu: Number(ext[2]) }),
        ...(sz !== undefined && { sizePt: Number(sz) / 100 }),
        ...(font !== undefined && { font }),
        ...(color !== undefined && { color: `#${color.toUpperCase()}` }),
        ...(algn !== undefined && ALIGN_MAP[algn] !== undefined && { align: ALIGN_MAP[algn] }),
        ...(vAlign !== undefined && { vAlign }),
        ...(buChar !== undefined ? { bullet: buChar } : hasBuNone ? { bullet: null } : {}),
        ...spacing,
    };
};
const EMU_PER_PT = 12700;
/** Paragraph spacing facts: space-before (centipoints), bullet scale (%), left indent (EMU). */
const parseSpacing = (block) => {
    const spcBef = /<a:spcBef>\s*<a:spcPts val="(\d+)"/.exec(block)?.[1];
    const buSz = /buSzPct val="(\d+)"/.exec(block)?.[1];
    const marL = /marL="(\d+)"/.exec(block)?.[1];
    return {
        ...(spcBef !== undefined && { spaceBeforePt: Number(spcBef) / 100 }),
        ...(buSz !== undefined && { bulletSizePct: Number(buSz) / 1000 }),
        ...(marL !== undefined && Number(marL) > 0 && { indentPt: Number(marL) / EMU_PER_PT }),
    };
};
/** Parse the lvl1 defaults of a master text style block (titleStyle/bodyStyle/otherStyle). */
export const parseStyleDefaults = (styleXml, fallbackFont) => {
    const sz = firstMatch(styleXml, /sz="(\d+)"/);
    const algn = firstMatch(styleXml, /algn="(\w+)"/);
    const color = firstMatch(styleXml, /<a:srgbClr val="([0-9A-Fa-f]{6})"/);
    const bullet = firstMatch(styleXml, /buChar char="([^"]*)"/);
    return {
        sizePt: sz !== undefined ? Number(sz) / 100 : 0,
        font: realTypeface(styleXml) ?? fallbackFont,
        color: color !== undefined ? `#${color.toUpperCase()}` : '#000000',
        align: (algn !== undefined ? ALIGN_MAP[algn] : undefined) ?? 'left',
        ...(bullet !== undefined && { bullet }),
        ...parseSpacing(styleXml),
    };
};
