import { resolve } from 'node:path';
import type { DeckBullet, DeckColumn } from '../parse/deck.js';
import { inlineVisibleText, styledRuns } from '../parse/inline.js';
import { BORDER_PT, type PtRect, type PtText } from '../theme/scope.js';
import { type Placed, type PlacedImage, type PlacedNotes, type PlacedText } from './scope-layout.js';
import { solidPngFile } from './solid-png.js';

/* AppleScript for the custom layouts. Keynote's dictionary offers text items
   (object text with per-character font, size and colour), images and nothing
   else usable: no shape colours, no underline, no hyperlinks. Bars, borders and
   the header rule are therefore solid-colour PNGs; links stay plain text. */

const POSTSCRIPT: Readonly<Record<PtText['font'], string>> = {
  regular: 'HelveticaNeue',
  medium: 'HelveticaNeue-Medium',
  light: 'HelveticaNeue-Light',
  bold: 'HelveticaNeue-Bold',
};

const str = (value: string): string =>
  `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\t/g, '\\t')}"`;

const rgb = (hexColor: string): string => {
  const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hexColor);
  if (m === null) throw new Error(`colour must be #rrggbb, got "${hexColor}"`);
  return `{${[m[1], m[2], m[3]].map((c) => Number.parseInt(c ?? '0', 16) * 257).join(', ')}}`;
};

const n = (value: number): string => String(Math.round(value * 10) / 10);

/* Unique AppleScript variable per element so statements never clash. */
let counter = 0;
const fresh = (prefix: string): string => `${prefix}${(counter += 1)}`;

const imageAt = (path: string, r: PtRect): string[] => {
  const v = fresh('im');
  return [
    `set imgFile to POSIX file ${str(resolve(path))} as alias`,
    'tell s',
    `  set ${v} to make new image with properties {file:imgFile}`,
    'end tell',
    `set width of ${v} to ${n(r.w)}`,
    `set height of ${v} to ${n(r.h)}`,
    `set position of ${v} to {${n(r.x)}, ${n(r.y)}}`,
  ];
};

const rectAt = (r: PtRect, fill: string): string[] => imageAt(solidPngFile(fill, r.w, r.h), r);

/** Styled runs of one paragraph, offset by `base` characters (bold font, colour). */
export const runStatements = (v: string, text: string, base: number): string[] =>
  styledRuns(text).flatMap((run) => {
    const range = `characters ${run.start + base} thru ${run.end + base} of object text of ${v}`;
    return [
      ...(run.bold ? [`set font of ${range} to ${str(POSTSCRIPT.bold)}`] : []),
      ...(run.color !== undefined ? [`set color of ${range} to ${rgb(run.color)}`] : []),
    ];
  });

/* A text item sized to its content, then positioned by alignment inside the
   box - Keynote exposes no paragraph alignment through AppleScript. */
const positionIn = (v: string, box: PtText): string => {
  const x = box.align === 'center' ? `${n(box.x)} + (${n(box.w)} - (width of ${v})) / 2` : n(box.x);
  const y =
    box.vAlign === 'top'
      ? n(box.y)
      : box.vAlign === 'bottom'
        ? `${n(box.y + box.h)} - (height of ${v})`
        : `${n(box.y)} + (${n(box.h)} - (height of ${v})) / 2`;
  return `set position of ${v} to {${x}, ${y}}`;
};

const textItem = (box: PtText, text: string): string[] => {
  const v = fresh('ti');
  const plain = inlineVisibleText(text);
  return [
    'tell s',
    `  set ${v} to make new text item with properties {object text:${str(plain)}}`,
    'end tell',
    `set font of object text of ${v} to ${str(POSTSCRIPT[box.font])}`,
    `set size of object text of ${v} to ${n(box.sizePt)}`,
    `set color of object text of ${v} to ${rgb(box.color)}`,
    ...(box.align === 'left' ? [`set width of ${v} to ${n(box.w)}`] : []),
    ...runStatements(v, text, 0),
    positionIn(v, box),
  ];
};

const paintText = (p: PlacedText): string[] => textItem(p.box, p.text);

const paintImage = (p: PlacedImage): string[] => {
  const half = BORDER_PT / 2;
  const border =
    p.border === undefined
      ? []
      : rectAt({ x: p.rect.x - half, y: p.rect.y - half, w: p.rect.w + BORDER_PT, h: p.rect.h + BORDER_PT }, p.border);
  return [...border, ...imageAt(p.path, p.rect)];
};

/* Notes: one text item, headings bold, bullets as "• " lines. Keynote's own
   paragraph spacing separates the groups; there is no hanging indent this
   way, but the text is real and editable. */
const notesLines = (columns: readonly DeckColumn[]): string[] =>
  columns.flatMap((col) => [col.header, ...col.bullets.map((b) => `• ${b.text}`)]);

const paintNotes = (p: PlacedNotes): string[] => {
  const v = fresh('ti');
  const lines = notesLines(p.columns);
  const plain = lines.map((l) => inlineVisibleText(l)).join('\n');
  const runs: string[] = [];
  let base = 0;
  for (const line of lines) {
    const visible = inlineVisibleText(line);
    const isHeading = p.columns.some((c) => inlineVisibleText(c.header) === visible && visible.length > 0);
    if (isHeading) runs.push(`set font of characters ${base + 1} thru ${base + visible.length} of object text of ${v} to ${str(POSTSCRIPT.bold)}`);
    runs.push(...runStatements(v, line, base));
    base += visible.length + 1;
  }
  return [
    'tell s',
    `  set ${v} to make new text item with properties {object text:${str(plain)}}`,
    'end tell',
    `set font of object text of ${v} to ${str(POSTSCRIPT.regular)}`,
    `set size of object text of ${v} to ${n(p.sizePt)}`,
    `set width of ${v} to ${n(p.box.w)}`,
    ...runs,
    `set position of ${v} to {${n(p.box.x)}, ${n(p.box.y)}}`,
  ];
};

/* title-bullets-left keeps Keynote's own bullet formatting: the master's body
   placeholder is moved to the left box and filled with tab-indented lines. */
const paintBullets = (box: PtText, bullets: readonly DeckBullet[]): string[] => {
  const body = bullets.map((b) => '\t'.repeat(b.level) + inlineVisibleText(b.text)).join('\n');
  const runs: string[] = [];
  let base = 0;
  for (const b of bullets) {
    runs.push(...runStatements('default body item of s', b.text, base + b.level));
    base += b.level + inlineVisibleText(b.text).length + 1;
  }
  return [
    'set body showing of s to true',
    `set object text of default body item of s to ${str(body)}`,
    `set width of default body item of s to ${n(box.w)}`,
    `set height of default body item of s to ${n(box.h)}`,
    `set position of default body item of s to {${n(box.x)}, ${n(box.y)}}`,
    ...runs,
  ];
};

/** AppleScript statements (inside `tell application "Keynote"`, slide var `s`) for a paint list. */
export const placedStatements = (placed: readonly Placed[]): string[] =>
  placed.flatMap((p) => {
    if (p.kind === 'text') return paintText(p);
    if (p.kind === 'image') return paintImage(p);
    if (p.kind === 'rect') return rectAt(p.rect, p.fill);
    if (p.kind === 'notes') return paintNotes(p);
    return paintBullets(p.box, p.bullets);
  });

