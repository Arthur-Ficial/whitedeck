import { readFileSync } from 'node:fs';
import { placeholdersByRole, WHITE } from '../theme/white.js';
export const EMU_PER_PT = 12700;
/** Breathing room between a picture and the text below it, and around the source line. */
export const TEXT_GAP_EMU = 228600;
/** Three wrapped lines at 18pt - a source line with a full URL needs them. */
const SOURCE_H_EMU = 104 * EMU_PER_PT;
export const canvas = () => ({
    x: 0,
    y: 0,
    w: WHITE.canvas.widthEmu,
    h: WHITE.canvas.heightEmu,
});
const area = (r) => Math.max(r.w, 0) * Math.max(r.h, 0);
const clamp = (r, bounds) => {
    const x = Math.max(r.x, bounds.x);
    const y = Math.max(r.y, bounds.y);
    return {
        x,
        y,
        w: Math.max(Math.min(r.x + r.w, bounds.x + bounds.w) - x, 0),
        h: Math.max(Math.min(r.y + r.h, bounds.y + bounds.h) - y, 0),
    };
};
/**
 * Cut `obstacle` (plus a gap) out of `frame`, keeping the largest remaining
 * axis-aligned rectangle. Four candidate cuts - above, below, left, right -
 * so a picture beside a text column is narrowed rather than shortened.
 */
export const carveExported = (frame, obstacle, gap) => carve(frame, obstacle, gap);
const carve = (frame, obstacle, gap) => {
    if (!intersects(frame, obstacle))
        return frame;
    const right = obstacle.x + obstacle.w + gap;
    const below = obstacle.y + obstacle.h + gap;
    const candidates = [
        { ...frame, h: Math.max(obstacle.y - gap - frame.y, 0) },
        { ...frame, y: below, h: Math.max(frame.y + frame.h - below, 0) },
        { ...frame, w: Math.max(obstacle.x - gap - frame.x, 0) },
        { ...frame, x: right, w: Math.max(frame.x + frame.w - right, 0) },
    ];
    return candidates.reduce((best, c) => (area(c) > area(best) ? c : best), candidates[0]);
};
/**
 * Keynote photo frames start outside the slide and run into the text
 * placeholders. Clamp the frame to the canvas, widen it to the text column
 * when no text sits beside it, then carve out every title/body rect - so an
 * image is never cut off, never leaves the slide and never overlaps text.
 *
 * Shared by the pptx AND the key renderer. The .key path used the raw
 * placeholder rect until 2026-09-01, which is why charts painted over the
 * headline (photo-horizontal pic y -31..921 vs title y 749..907).
 */
export const picFrame = (ph, layout) => {
    const bounds = canvas();
    const texts = layout.placeholders
        .filter((p) => p.role === 'title' || p.role === 'body')
        .map(rectOf);
    let frame = clamp(rectOf(ph), bounds);
    const beside = texts.some((t) => t.y < frame.y + frame.h && frame.y < t.y + t.h);
    if (!beside) {
        const column = texts.reduce((widest, t) => (widest === undefined || t.w > widest.w ? t : widest), undefined);
        if (column !== undefined && column.w > frame.w) {
            frame = clamp({ ...frame, x: column.x, w: column.w }, bounds);
        }
    }
    for (const t of texts)
        frame = carve(frame, t, TEXT_GAP_EMU);
    return clamp(frame, bounds);
};
/** PNG intrinsic size from the IHDR chunk; undefined for anything else. */
export const pngSize = (path) => {
    let head;
    try {
        head = readFileSync(path).subarray(0, 24);
    }
    catch {
        return undefined;
    }
    if (head.length < 24 || head.readUInt32BE(0) !== 0x89504e47)
        return undefined;
    return { w: head.readUInt32BE(16), h: head.readUInt32BE(20) };
};
/** Scale the image down into the frame, preserving aspect ratio, centred. */
export const fitted = (path, frame) => {
    const size = pngSize(path);
    if (size === undefined || size.w === 0 || size.h === 0)
        return frame;
    const scale = Math.min(frame.w / size.w, frame.h / size.h);
    const w = size.w * scale;
    const h = size.h * scale;
    return { x: frame.x + (frame.w - w) / 2, y: frame.y + (frame.h - h) / 2, w, h };
};
/**
 * Where the "Source:" line goes. Never hardcoded: it sits in the text column,
 * above the slide-number placeholder and inside the canvas. When the body
 * placeholder carries no text it is removed, so the source may use that band.
 */
export const sourceFrame = (layout, bodyUsed) => {
    const body = placeholdersByRole(layout, 'body')[0];
    const title = placeholdersByRole(layout, 'title')[0];
    const column = body ?? title;
    const num = placeholdersByRole(layout, 'sldNum')[0];
    const floor = num !== undefined ? num.yEmu - TEXT_GAP_EMU : WHITE.canvas.heightEmu - TEXT_GAP_EMU;
    const top = floor - SOURCE_H_EMU;
    // When the body carries text the source sits under it; otherwise it takes the
    // bottom band. POSITIVE_INFINITY, not NEGATIVE - a negative default collapsed
    // y to 0 and printed the source across the top of the slide.
    const after = bodyUsed && body !== undefined ? body.yEmu + body.hEmu + TEXT_GAP_EMU : Number.POSITIVE_INFINITY;
    return {
        x: column?.xEmu ?? TEXT_GAP_EMU,
        y: Math.max(Math.min(after, top), 0),
        w: column?.wEmu ?? WHITE.canvas.widthEmu - TEXT_GAP_EMU * 2,
        h: SOURCE_H_EMU,
    };
};
/** True when the rect lies fully inside the slide canvas. */
export const insideCanvas = (r) => r.x >= 0 && r.y >= 0 && r.x + r.w <= WHITE.canvas.widthEmu && r.y + r.h <= WHITE.canvas.heightEmu;
export const intersects = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
export const rectOf = (p) => ({
    x: p.xEmu,
    y: p.yEmu,
    w: p.wEmu,
    h: p.hEmu,
});
/**
 * The rectangle a picture may occupy on a slide whose master has NO photo
 * placeholder. The .key renderer deliberately uses a text master for image
 * slides: a photo master paints its own stock picture, which then shows
 * behind a letterboxed chart. Uses the body band, minus the source line.
 */
export const imageBandFrame = (layout, hasSource) => {
    const bounds = canvas();
    const body = placeholdersByRole(layout, 'body')[0];
    const title = placeholdersByRole(layout, 'title')[0];
    const base = body !== undefined
        ? rectOf(body)
        : { x: TEXT_GAP_EMU, y: TEXT_GAP_EMU, w: bounds.w - TEXT_GAP_EMU * 2, h: bounds.h - TEXT_GAP_EMU * 2 };
    const src = sourceFrame(layout, false);
    const bottom = hasSource ? Math.min(base.y + base.h, src.y - TEXT_GAP_EMU) : base.y + base.h;
    const frame = { x: base.x, y: base.y, w: base.w, h: Math.max(bottom - base.y, 1) };
    if (title !== undefined && intersects(frame, rectOf(title))) {
        return carveExported(frame, rectOf(title), TEXT_GAP_EMU);
    }
    return frame;
};
/**
 * The body placeholder shortened so the source line below it always fits.
 * Without this a five-bullet slide runs its last line under the source.
 */
const MIN_BODY_H_EMU = 200 * EMU_PER_PT;
export const bodyFrame = (layout, hasSource) => {
    const body = placeholdersByRole(layout, 'body')[0];
    if (body === undefined)
        return { x: 0, y: 0, w: 0, h: 0 };
    const base = rectOf(body);
    if (!hasSource)
        return base;
    const src = sourceFrame(layout, true);
    const floor = src.y - TEXT_GAP_EMU;
    // Some Keynote bodies (photo-horizontal, quote) start inside the bottom
    // band. Lift the body so it keeps a usable height above the source.
    const y = Math.min(base.y, floor - MIN_BODY_H_EMU);
    return { x: base.x, y: Math.max(y, 0), w: base.w, h: Math.max(floor - Math.max(y, 0), MIN_BODY_H_EMU) };
};
