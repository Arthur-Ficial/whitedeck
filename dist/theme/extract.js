import { readFile } from 'node:fs/promises';
import JSZip from 'jszip';
import { decodeXmlEntities, parseShape, parseStyleDefaults, shapeBlocks, } from './ooxml.js';
import { emuToPx } from './types.js';
export const KEYNOTE_LAYOUT_IDS = {
    'Title': 'title',
    'Title - Centre': 'title-center',
    'Title - Center': 'title-center',
    'Title - Top': 'title-top',
    'Title & Bullets': 'title-bullets',
    'Bullets': 'bullets',
    'Title, Bullets & Photo': 'title-bullets-photo',
    'Photo': 'photo',
    'Photo - Horizontal': 'photo-horizontal',
    'Photo - Vertical': 'photo-vertical',
    'Photo - 3 Up': 'photo-3-up',
    'Quote': 'quote',
    'Blank': 'blank',
};
const STYLE_FALLBACK_FONTS = {
    title: 'Helvetica Neue Medium',
    body: 'Helvetica Neue',
    other: 'Helvetica Neue Light',
};
const shapeKey = (shape) => `${shape.role}:${shape.idx ?? ''}`;
const readEntry = async (zip, path) => {
    const entry = zip.file(path);
    if (!entry)
        throw new Error(`Reference pptx is missing ${path}`);
    return entry.async('string');
};
const parseMaster = (xml) => {
    const shapes = new Map();
    for (const block of shapeBlocks(xml)) {
        const shape = parseShape(block);
        if (shape)
            shapes.set(shapeKey(shape), shape);
    }
    const styleXml = (tag) => new RegExp(`<p:${tag}>([\\s\\S]*?)</p:${tag}>`).exec(xml)?.[1] ?? '';
    return {
        shapes,
        styles: {
            title: parseStyleDefaults(styleXml('titleStyle'), STYLE_FALLBACK_FONTS.title),
            body: parseStyleDefaults(styleXml('bodyStyle'), STYLE_FALLBACK_FONTS.body),
            other: parseStyleDefaults(styleXml('otherStyle'), STYLE_FALLBACK_FONTS.other),
        },
    };
};
const styleFor = (role, master) => role === 'title' ? master.styles.title : role === 'body' ? master.styles.body : master.styles.other;
const resolvePlaceholder = (shape, master) => {
    const inherited = master.shapes.get(shapeKey(shape)) ?? master.shapes.get(`${shape.role}:`);
    const style = styleFor(shape.role, master);
    const xEmu = shape.xEmu ?? inherited?.xEmu;
    const yEmu = shape.yEmu ?? inherited?.yEmu;
    const wEmu = shape.wEmu ?? inherited?.wEmu;
    const hEmu = shape.hEmu ?? inherited?.hEmu;
    if (xEmu === undefined || yEmu === undefined || wEmu === undefined || hEmu === undefined)
        return undefined;
    const bullet = shape.bullet !== undefined ? shape.bullet : (inherited?.bullet ?? style.bullet);
    const spaceBeforePt = shape.spaceBeforePt ?? inherited?.spaceBeforePt ?? style.spaceBeforePt;
    const bulletSizePct = shape.bulletSizePct ?? inherited?.bulletSizePct ?? style.bulletSizePct;
    const indentPt = shape.indentPt ?? inherited?.indentPt ?? style.indentPt;
    return {
        role: shape.role,
        ...(shape.idx !== undefined && { idx: shape.idx }),
        xEmu,
        yEmu,
        wEmu,
        hEmu,
        xPx: emuToPx(xEmu),
        yPx: emuToPx(yEmu),
        wPx: emuToPx(wEmu),
        hPx: emuToPx(hEmu),
        sizePt: shape.sizePt ?? inherited?.sizePt ?? style.sizePt,
        font: shape.font ?? inherited?.font ?? style.font,
        color: shape.color ?? inherited?.color ?? style.color,
        align: shape.align ?? inherited?.align ?? style.align,
        vAlign: shape.vAlign ?? inherited?.vAlign ?? 'top',
        ...(bullet !== null && bullet !== undefined && { bullet }),
        ...(bullet !== null && bullet !== undefined && spaceBeforePt !== undefined && { spaceBeforePt }),
        ...(bullet !== null && bullet !== undefined && bulletSizePct !== undefined && { bulletSizePct }),
        ...(bullet !== null && bullet !== undefined && indentPt !== undefined && { indentPt }),
    };
};
const parseLayout = (xml, master) => {
    const rawName = /<p:cSld name="([^"]*)"/.exec(xml)?.[1];
    if (rawName === undefined)
        throw new Error('slideLayout without a cSld name');
    const keynoteName = decodeXmlEntities(rawName);
    if (keynoteName.includes('Live Video'))
        return undefined;
    const id = KEYNOTE_LAYOUT_IDS[keynoteName];
    if (id === undefined)
        throw new Error(`Unknown Keynote layout name: ${keynoteName}`);
    const placeholders = shapeBlocks(xml)
        .map((block) => parseShape(block))
        .filter((shape) => shape !== undefined)
        .map((shape) => resolvePlaceholder(shape, master))
        .filter((ph) => ph !== undefined);
    return { id, layout: { keynoteName, placeholders } };
};
export const extractTheme = async (pptxPath) => {
    const zip = await JSZip.loadAsync(await readFile(pptxPath));
    const presentation = await readEntry(zip, 'ppt/presentation.xml');
    const size = /<p:sldSz cx="(\d+)" cy="(\d+)"/.exec(presentation);
    if (!size?.[1] || !size[2])
        throw new Error('Reference pptx has no slide size');
    const widthEmu = Number(size[1]);
    const heightEmu = Number(size[2]);
    const master = parseMaster(await readEntry(zip, 'ppt/slideMasters/slideMaster1.xml'));
    const layoutPaths = Object.keys(zip.files)
        .filter((p) => /^ppt\/slideLayouts\/slideLayout\d+\.xml$/.test(p))
        .sort();
    const layouts = {};
    for (const path of layoutPaths) {
        const parsed = parseLayout(await readEntry(zip, path), master);
        if (parsed)
            layouts[parsed.id] = parsed.layout;
    }
    return {
        name: 'white',
        canvas: {
            widthEmu,
            heightEmu,
            widthPx: emuToPx(widthEmu),
            heightPx: emuToPx(heightEmu),
        },
        background: '#FFFFFF',
        fonts: {
            regular: 'Helvetica Neue',
            medium: 'Helvetica Neue Medium',
            light: 'Helvetica Neue Light',
        },
        layouts,
    };
};
