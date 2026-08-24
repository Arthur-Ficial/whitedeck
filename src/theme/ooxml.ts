import type { PlaceholderRole, TextAlign } from './types.js';

export interface RawShape {
  readonly role: PlaceholderRole;
  readonly idx?: number;
  readonly xEmu?: number;
  readonly yEmu?: number;
  readonly wEmu?: number;
  readonly hEmu?: number;
  readonly sizePt?: number;
  readonly font?: string;
  readonly color?: string;
  readonly align?: TextAlign;
  readonly bullet?: string | null;
}

export interface RawStyleDefaults {
  readonly sizePt: number;
  readonly font: string;
  readonly color: string;
  readonly align: TextAlign;
  readonly bullet?: string;
}

const ALIGN_MAP: Record<string, TextAlign> = {
  l: 'left',
  ctr: 'center',
  r: 'right',
  just: 'justify',
};

export const decodeXmlEntities = (value: string): string =>
  value
    .replaceAll('&amp;', '&')
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'");

const firstMatch = (block: string, re: RegExp): string | undefined => re.exec(block)?.[1];

const realTypeface = (block: string): string | undefined => {
  for (const m of block.matchAll(/typeface="([^"]+)"/g)) {
    const face = m[1];
    if (face !== undefined && !face.startsWith('+')) return decodeXmlEntities(face);
  }
  return undefined;
};

/** Split a slideLayout/slideMaster spTree into its shape and picture XML blocks. */
export const shapeBlocks = (xml: string): string[] =>
  [...xml.matchAll(/<p:sp>[\s\S]*?<\/p:sp>|<p:pic>[\s\S]*?<\/p:pic>/g)].map((m) => m[0]);

/** Parse one <p:sp>/<p:pic> block into the raw placeholder facts it states explicitly. */
export const parseShape = (block: string): RawShape | undefined => {
  const ph = /<p:ph type="(\w+)"(?: idx="(\d+)")?/.exec(block);
  if (!ph?.[1]) return undefined;
  const role = ph[1] as PlaceholderRole;
  if (!['title', 'body', 'pic', 'sldNum'].includes(role)) return undefined;

  const font = realTypeface(block);
  const off = /<a:off x="(-?\d+)" y="(-?\d+)"/.exec(block);
  const ext = /<a:ext cx="(\d+)" cy="(\d+)"/.exec(block);
  const sz = firstMatch(block, /sz="(\d+)"/);
  const algn = firstMatch(block, /algn="(\w+)"/);
  const color = firstMatch(block, /<a:srgbClr val="([0-9A-Fa-f]{6})"/);
  const buChar = firstMatch(block, /buChar char="([^"]*)"/);
  const hasBuNone = block.includes('<a:buNone');

  return {
    role,
    ...(ph[2] !== undefined && { idx: Number(ph[2]) }),
    ...(off?.[1] !== undefined && off[2] !== undefined && { xEmu: Number(off[1]), yEmu: Number(off[2]) }),
    ...(ext?.[1] !== undefined && ext[2] !== undefined && { wEmu: Number(ext[1]), hEmu: Number(ext[2]) }),
    ...(sz !== undefined && { sizePt: Number(sz) / 100 }),
    ...(font !== undefined && { font }),
    ...(color !== undefined && { color: `#${color.toUpperCase()}` }),
    ...(algn !== undefined && ALIGN_MAP[algn] !== undefined && { align: ALIGN_MAP[algn] }),
    ...(buChar !== undefined ? { bullet: buChar } : hasBuNone ? { bullet: null } : {}),
  };
};

/** Parse the lvl1 defaults of a master text style block (titleStyle/bodyStyle/otherStyle). */
export const parseStyleDefaults = (styleXml: string, fallbackFont: string): RawStyleDefaults => {
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
  };
};
