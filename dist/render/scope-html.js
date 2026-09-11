import { inlineToHtml } from '../parse/inline.js';
import { BORDER_PT, ptToPx } from '../theme/scope.js';
import { NOTE_STYLE } from './scope-layout.js';
/* Custom layouts are painted as absolutely positioned HTML with inline
   geometry, so the Marp theme needs no per-layout rules and the pixel
   positions come from the same placement list as pptx and Keynote. */
const FONT_WEIGHT = { light: 300, regular: 400, medium: 500, bold: 700 };
const FLEX_JUSTIFY = { top: 'flex-start', middle: 'center', bottom: 'flex-end' };
const boxStyle = (r) => `position:absolute;left:${ptToPx(r.x)}px;top:${ptToPx(r.y)}px;width:${ptToPx(r.w)}px;height:${ptToPx(r.h)}px;`;
const textStyle = (t) => `${boxStyle(t)}font-size:${t.sizePt}pt;font-weight:${FONT_WEIGHT[t.font]};color:${t.color};text-align:${t.align};` +
    `display:flex;flex-direction:column;justify-content:${FLEX_JUSTIFY[t.vAlign]};line-height:1.15;margin:0;`;
/* The box is a flex column (vertical alignment); one inner span keeps the
   inline runs together as a single flex item instead of one item per run. */
const textHtml = (p) => `<div class="wd-text" style="${textStyle(p.box)}"><span>${inlineToHtml(p.text)}</span></div>`;
const imageHtml = (p, marpSrc) => {
    const outline = p.border === undefined ? '' : `outline:${ptToPx(BORDER_PT)}px solid ${p.border};outline-offset:-${ptToPx(BORDER_PT / 2)}px;`;
    const img = `<img class="wd-placed" src="${marpSrc(p.path)}" style="${boxStyle(p.rect)}${outline}">`;
    return p.url === undefined ? img : `<a href="${p.url.replaceAll('"', '&quot;')}">${img}</a>`;
};
const rectHtml = (rect, fill) => `<div class="wd-rect" style="${boxStyle(rect)}background:${fill};"></div>`;
const listHtml = (items, { indentPx, gapPt, pct, flush }) => {
    const li = items
        .map((b) => `<li style="padding-left:${indentPx * (b.level + 1)}px;text-indent:-${indentPx}px;margin-top:${gapPt}pt;">` +
        `<span class="wd-bullet" style="font-size:${pct}%;">•</span>${inlineToHtml(b.text)}</li>`)
        .join('');
    return `<ul class="wd-list${flush ? ' wd-flush' : ''}">${li}</ul>`;
};
const bulletsHtml = (p) => `<div class="wd-text" style="${textStyle(p.box)}">${listHtml(p.bullets, { indentPx: ptToPx(p.indentPt), gapPt: p.spaceBeforePt, pct: p.bulletSizePct, flush: true })}</div>`;
const notesHtml = (p) => {
    const box = { ...p.box, sizePt: p.sizePt, font: 'regular', color: '#000000', align: 'left', vAlign: 'top' };
    const indentPx = ptToPx(p.sizePt * NOTE_STYLE.indentEm);
    const groups = p.columns
        .map((col, index) => `<h3 style="margin:${index === 0 ? 0 : NOTE_STYLE.spaceBeforePt}pt 0 0 0;font-size:${p.sizePt}pt;font-weight:700;">${inlineToHtml(col.header)}</h3>` +
        listHtml(col.bullets, { indentPx, gapPt: NOTE_STYLE.spaceBeforePt, pct: NOTE_STYLE.bulletSizePct, flush: false }))
        .join('');
    return `<div class="wd-text wd-notes" style="${textStyle(box)}">${groups}</div>`;
};
const placedHtml = (p, marpSrc) => {
    if (p.kind === 'text')
        return textHtml(p);
    if (p.kind === 'image')
        return imageHtml(p, marpSrc);
    if (p.kind === 'rect')
        return rectHtml(p.rect, p.fill);
    if (p.kind === 'bullets')
        return bulletsHtml(p);
    return notesHtml(p);
};
/** One raw-HTML block for the whole paint list; `marpSrc` resolves image paths for Marp. */
export const placedToHtml = (placed, marpSrc) => `<div class="wd-custom">${placed.map((p) => placedHtml(p, marpSrc)).join('')}</div>`;
/** Theme CSS the custom layouts rely on (fonts, list reset, bullet glyph). */
export const customLayoutCss = () => [
    'section .wd-custom { position: absolute; inset: 0; }',
    'section .wd-text { font-family: "Helvetica Neue", Helvetica, Arial, sans-serif; overflow-wrap: anywhere; }',
    'section .wd-text a { color: inherit; text-decoration: underline; }',
    'section .wd-list { list-style: none; padding: 0; margin: 0; }',
    'section .wd-flush li:first-child { margin-top: 0 !important; }',
    'section .wd-bullet { margin-right: 0.45em; line-height: 0; }',
    'section img.wd-placed { position: absolute; object-fit: contain; }',
].join('\n');
