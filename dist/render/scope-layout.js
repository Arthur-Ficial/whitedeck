import { BLACK, CAPTION, COMPARE, HEADER_RULE, LABEL_BLUE, LABEL_TEXT, LOGO, NOTES, SCOPE_LABEL, SCOPE_TEXT, SCOPE_TITLE, SECTION_LEFT, SHOT_FRAME, SHOT_NOTES, TITLE_BULLETS_LEFT, TITLE_LEFT, TOOL_LOGO, compareColumn, compareLabelBar, compareNotes, isCustomLayout, isScopeLayout, } from '../theme/scope.js';
import { inlineVisibleText } from '../parse/inline.js';
import { fittedNotesSizePt, fittedSizePt } from './fit.js';
import { imageSize } from './geometry.js';
/** Contain-fit an image into a frame; a right-aligned fit keeps the right edge. */
const fitInto = (path, frame, alignRight = false) => {
    const size = imageSize(path);
    if (size === undefined || size.w === 0 || size.h === 0) {
        throw new Error(`image is not a readable PNG or JPEG: ${path}`);
    }
    const scale = Math.min(frame.w / size.w, frame.h / size.h);
    const w = size.w * scale;
    const h = size.h * scale;
    const x = alignRight ? frame.x + frame.w - w : frame.x + (frame.w - w) / 2;
    return { x, y: frame.y + (frame.h - h) / 2, w, h };
};
const image = (img, frame) => ({
    kind: 'image',
    path: img.path,
    rect: fitInto(img.path, frame),
    ...(img.border !== undefined && { border: img.border }),
});
const text = (box, value) => ({ kind: 'text', box, text: value });
/* Headlines shrink like Keynote placeholders do; the same size then reaches
   every painter through the box. */
const MIN_TITLE_PT = 40;
const fittedTitle = (box, value) => text({ ...box, sizePt: fittedSizePt(inlineVisibleText(value), { widthPt: box.w, heightPt: box.h, sizePt: box.sizePt, minPt: MIN_TITLE_PT }) }, value);
const logo = (meta) => meta.logo === undefined ? [] : [{ kind: 'image', path: meta.logo, rect: fitInto(meta.logo, LOGO) }];
const header = (slide) => [
    text(SCOPE_TEXT, `**${SCOPE_LABEL}** ${slide.scope ?? ''}`),
    ...(slide.tool === undefined
        ? []
        : [{ kind: 'image', path: slide.tool, rect: fitInto(slide.tool, TOOL_LOGO, true) }]),
    { kind: 'rect', rect: HEADER_RULE, fill: BLACK },
    ...(slide.title === undefined ? [] : [fittedTitle(SCOPE_TITLE, slide.title)]),
];
const caption = (slide) => slide.caption === undefined ? [] : [text(CAPTION, slide.caption)];
/* One label bar per run of consecutive images sharing a label - "JS on" over
   two screenshots, "JS off" over the third. */
const labelBars = (images) => {
    const placed = [];
    let start = 0;
    images.forEach((img, index) => {
        const next = images[index + 1];
        if (next !== undefined && next.label === img.label)
            return;
        const rect = compareLabelBar(start, index);
        placed.push({ kind: 'rect', rect, fill: LABEL_BLUE });
        placed.push(text({ ...rect, sizePt: COMPARE.labelSizePt, font: 'medium', color: LABEL_TEXT, align: 'center', vAlign: 'middle' }, img.label ?? ''));
        start = index + 1;
    });
    return placed;
};
/* A long IS / SHOULD block shrinks like a Keynote body placeholder would;
   the gap between paragraphs shrinks with it (see NOTES.spaceBeforePt). */
const MIN_NOTES_PT = 20;
const notes = (box, sizePt, columns) => {
    if (columns === undefined || columns.length === 0)
        return [];
    const groups = columns.map((c) => ({ header: inlineVisibleText(c.header), lines: c.bullets.map((b) => inlineVisibleText(b.text)) }));
    const fit = fittedNotesSizePt(groups, { widthPt: box.w, heightPt: box.h, sizePt, minPt: MIN_NOTES_PT }, NOTES.spaceBeforePt);
    return [{ kind: 'notes', box, sizePt: fit, columns }];
};
const scopeShot = (slide) => {
    const only = slide.images[0];
    if (only === undefined)
        throw new Error('scope-shot needs one image');
    return [image(only, SHOT_FRAME)];
};
const scopeCompare = (slide) => [
    ...labelBars(slide.images),
    ...slide.images.map((img, index) => image(img, compareColumn(index))),
    ...notes(compareNotes(slide.images.length), COMPARE.notesSizePt, slide.columns),
];
const scopeShotNotes = (slide) => {
    const [main, side] = slide.images;
    if (main === undefined || side === undefined)
        throw new Error('scope-shot-notes needs two images');
    return [
        image(main, SHOT_NOTES.main),
        image(side, SHOT_NOTES.side),
        ...notes(SHOT_NOTES.notes, SHOT_NOTES.notesSizePt, slide.columns),
    ];
};
const scopeBody = (slide) => {
    if (slide.layout === 'scope-shot')
        return scopeShot(slide);
    if (slide.layout === 'scope-compare')
        return scopeCompare(slide);
    return scopeShotNotes(slide);
};
const titleLeft = (slide) => [
    ...(slide.title === undefined ? [] : [fittedTitle(TITLE_LEFT.title, slide.title)]),
    ...(slide.subtitle === undefined ? [] : [text(TITLE_LEFT.subtitle, slide.subtitle)]),
    ...(slide.footer === undefined ? [] : [text(TITLE_LEFT.footer, slide.footer)]),
];
const sectionLeft = (slide) => [
    ...(slide.title === undefined ? [] : [fittedTitle(SECTION_LEFT.title, slide.title)]),
    ...(slide.subtitle === undefined ? [] : [text(SECTION_LEFT.subtitle, slide.subtitle)]),
];
const titleBulletsLeft = (slide) => [
    ...(slide.title === undefined ? [] : [fittedTitle(TITLE_BULLETS_LEFT.title, slide.title)]),
    ...(slide.bullets.length === 0
        ? []
        : [
            {
                kind: 'bullets',
                box: TITLE_BULLETS_LEFT.body,
                bullets: slide.bullets,
                spaceBeforePt: TITLE_BULLETS_LEFT.spaceBeforePt,
                indentPt: TITLE_BULLETS_LEFT.indentPt,
                bulletSizePct: TITLE_BULLETS_LEFT.bulletSizePct,
            },
        ]),
];
const leftBody = (slide) => {
    if (slide.layout === 'title-left')
        return titleLeft(slide);
    if (slide.layout === 'section-left')
        return sectionLeft(slide);
    return titleBulletsLeft(slide);
};
/**
 * Paint list of a custom (scope / left) layout slide. Throws for any other
 * layout - callers branch on `isCustomLayout` first.
 */
export const placeCustomSlide = (slide, meta) => {
    if (!isCustomLayout(slide.layout))
        throw new Error(`${slide.layout} is not a custom layout`);
    if (isScopeLayout(slide.layout))
        return [...header(slide), ...scopeBody(slide), ...caption(slide), ...logo(meta)];
    return [...leftBody(slide), ...logo(meta)];
};
/** The logo alone - painted on the Keynote-geometry layouts too. */
export const placeLogo = (meta) => logo(meta);
export const NOTE_STYLE = NOTES;
