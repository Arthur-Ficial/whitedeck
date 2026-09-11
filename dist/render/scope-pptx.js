import { parseInline } from '../parse/inline.js';
import { BORDER_PT, EMU_PER_PT } from '../theme/scope.js';
import { NOTE_STYLE } from './scope-layout.js';
const PT_PER_INCH = 72;
const inch = (pt) => pt / PT_PER_INCH;
export const LINK_COLOR = '0000EE';
const BULLET_CODE = '2022';
const FONT_FACE = {
    regular: 'Helvetica Neue',
    medium: 'Helvetica Neue Medium',
    light: 'Helvetica Neue Light',
    bold: 'Helvetica Neue Bold',
};
const hex = (color) => color.replace('#', '').toUpperCase();
/**
 * Inline markdown to pptx runs: links blue + underlined, bold as a real bold
 * run, `[x]{#rrggbb}` as a coloured run. Shared with the Keynote-geometry
 * layouts through pptx.ts.
 */
export const toRuns = (text, para) => {
    const segments = parseInline(text);
    return segments.map((s, index) => ({
        text: s.text,
        options: {
            ...para,
            breakLine: index === segments.length - 1 ? (para.breakLine ?? false) : false,
            ...(s.url !== undefined && { hyperlink: { url: s.url }, color: LINK_COLOR, underline: { style: 'sng' } }),
            ...(s.bold === true && { bold: true }),
            ...(s.color !== undefined && { color: hex(s.color) }),
            ...(index > 0 && { bullet: false }),
        },
    }));
};
const boxOptions = (t) => ({
    x: inch(t.x),
    y: inch(t.y),
    w: inch(t.w),
    h: inch(t.h),
    fontSize: t.sizePt,
    fontFace: FONT_FACE[t.font],
    color: hex(t.color),
    align: t.align,
    valign: t.vAlign,
    margin: 0,
});
const paintText = (slide, p) => {
    slide.addText(toRuns(p.text, {}), boxOptions(p.box));
};
const bulletRuns = (bullets, indentPt, spaceBeforePt) => bullets.flatMap((b, index) => toRuns(b.text, {
    bullet: { code: BULLET_CODE, indent: indentPt },
    indentLevel: b.level,
    breakLine: true,
    ...(index > 0 && { paraSpaceBefore: spaceBeforePt }),
}));
const paintBullets = (slide, p) => {
    slide.addText(bulletRuns(p.bullets, p.indentPt, p.spaceBeforePt), { ...boxOptions(p.box), fit: 'shrink' });
};
const paintNotes = (slide, p) => {
    const indentPt = Math.round(p.sizePt * NOTE_STYLE.indentEm);
    const runs = p.columns.flatMap((col, index) => [
        { text: col.header, options: { bold: true, breakLine: true, ...(index > 0 && { paraSpaceBefore: NOTE_STYLE.spaceBeforePt }) } },
        ...bulletRuns(col.bullets, indentPt, NOTE_STYLE.spaceBeforePt).map((r) => ({
            ...r,
            options: { ...r.options, paraSpaceBefore: NOTE_STYLE.spaceBeforePt },
        })),
    ]);
    const box = { ...p.box, sizePt: p.sizePt, font: 'regular', color: '#000000', align: 'left', vAlign: 'top' };
    slide.addText(runs, { ...boxOptions(box), fit: 'shrink' });
};
const paintImage = (slide, p) => {
    const r = p.rect;
    slide.addImage({ path: p.path, x: inch(r.x), y: inch(r.y), w: inch(r.w), h: inch(r.h), ...(p.url !== undefined && { hyperlink: { url: p.url } }) });
    if (p.border !== undefined) {
        /* The stroke is centred on the picture edge, like the Keynote original. */
        slide.addShape('rect', {
            x: inch(r.x),
            y: inch(r.y),
            w: inch(r.w),
            h: inch(r.h),
            fill: { type: 'none' },
            line: { color: hex(p.border), width: BORDER_PT },
        });
    }
};
const paintRect = (slide, rect, fill) => {
    slide.addShape('rect', { x: inch(rect.x), y: inch(rect.y), w: inch(rect.w), h: inch(rect.h), fill: { color: hex(fill) } });
};
/** Paint one placement list onto a pptx slide. */
export const paintPlaced = (slide, placed) => {
    for (const p of placed) {
        if (p.kind === 'text')
            paintText(slide, p);
        else if (p.kind === 'bullets')
            paintBullets(slide, p);
        else if (p.kind === 'notes')
            paintNotes(slide, p);
        else if (p.kind === 'image')
            paintImage(slide, p);
        else
            paintRect(slide, p.rect, p.fill);
    }
};
export const ptToEmuExact = (pt) => Math.round(pt * EMU_PER_PT);
