import type { ThemeLayout, ThemePlaceholder } from '../theme/types.js';
import { LAYOUT_IDS, layoutOf, placeholdersByRole, WHITE } from '../theme/white.js';

/** Apple's body indent step: marL 635000 EMU per level = 66.7px at 96dpi. */
const INDENT_STEP_PX = 67;

const FONT_STACK = '"Helvetica Neue", Helvetica, Arial, sans-serif';

const FONT_WEIGHTS: Readonly<Record<string, number>> = {
  'Helvetica Neue': 400,
  'Helvetica Neue Medium': 500,
  'Helvetica Neue Light': 300,
};

const box = (ph: ThemePlaceholder): string =>
  [
    '  position: absolute;',
    `  left: ${ph.xPx}px;`,
    `  top: ${ph.yPx}px;`,
    `  width: ${ph.wPx}px;`,
    `  height: ${ph.hPx}px;`,
  ].join('\n');

const text = (ph: ThemePlaceholder): string =>
  [
    `  font-size: ${ph.sizePt}pt;`,
    `  font-family: ${FONT_STACK};`,
    `  font-weight: ${FONT_WEIGHTS[ph.font] ?? 400};`,
    `  text-align: ${ph.align};`,
    `  color: ${ph.color};`,
  ].join('\n');

const rule = (selector: string, body: string): string => `${selector} {\n${body}\n}`;

const FLEX_JUSTIFY: Readonly<Record<string, string>> = {
  top: 'flex-start',
  middle: 'center',
  bottom: 'flex-end',
};

const flexV = (ph: ThemePlaceholder): string =>
  `  display: flex;\n  flex-direction: column;\n  justify-content: ${FLEX_JUSTIFY[ph.vAlign] ?? 'flex-start'};`;

const titleRule = (id: string, ph: ThemePlaceholder): string =>
  rule(`section.${id} h1`, `${box(ph)}\n${text(ph)}\n${flexV(ph)}`);

const bulletBodyRule = (id: string, ph: ThemePlaceholder): string => {
  const indentPx = ph.indentPt !== undefined ? Math.round((ph.indentPt * 4) / 3) : INDENT_STEP_PX;
  return [
    rule(`section.${id} p:not(:has(> img)), section.${id} ul`, `${box(ph)}\n${text(ph)}\n${flexV(ph)}`),
    rule(`section.${id} ul`, '  list-style: none;\n  padding: 0;'),
    rule(`section.${id} li`, `  padding-left: ${indentPx}px;\n  text-indent: -${indentPx}px;`),
    ...(ph.spaceBeforePt !== undefined
      ? [rule(`section.${id} li + li`, `  margin-top: ${ph.spaceBeforePt}pt;`)]
      : []),
    rule(
      `section.${id} li::before`,
      `  content: "${ph.bullet ?? '•'}";\n  margin-right: 0.45em;\n  font-size: ${ph.bulletSizePct ?? 100}%;\n  line-height: 0;`,
    ),
    rule(`section.${id} ul ul`, `  position: static;\n  width: auto;\n  height: auto;\n  margin-left: ${indentPx}px;\n  margin-top: ${ph.spaceBeforePt ?? 0}pt;`),
  ].join('\n');
};

const subtitleRule = (id: string, ph: ThemePlaceholder): string =>
  rule(`section.${id} h2, section.${id} p:not(:has(> img))`, `${box(ph)}\n${text(ph)}\n${flexV(ph)}`);

const quoteRules = (id: string, quotePh: ThemePlaceholder, attributionPh: ThemePlaceholder): string =>
  [
    rule(`section.${id} blockquote`, `${box(quotePh)}\n${text(quotePh)}\n${flexV(quotePh)}\n  margin: 0;`),
    rule(
      `section.${id} blockquote p`,
      '  position: static;\n  width: auto;\n  height: auto;\n  font-size: inherit;\n  text-align: inherit;',
    ),
    rule(`section.${id} > p`, `${box(attributionPh)}\n${text(attributionPh)}`),
  ].join('\n');

const picRules = (id: string, pics: readonly ThemePlaceholder[]): string =>
  pics
    .map((ph, index) => rule(`section.${id} img:nth-of-type(${index + 1})`, `${box(ph)}\n  object-fit: cover;`))
    .join('\n');

const layoutRules = (id: string, layout: ThemeLayout): string => {
  const rules: string[] = [`section.${id} {}`];

  const title = layout.placeholders.find((p) => p.role === 'title');
  if (title) rules.push(titleRule(id, title));

  const bodies = placeholdersByRole(layout, 'body');
  if (id === 'quote') {
    const sorted = [...bodies].sort((a, b) => b.sizePt - a.sizePt);
    if (sorted[0] && sorted[1]) rules.push(quoteRules(id, sorted[0], sorted[1]));
  } else {
    for (const body of bodies) {
      rules.push(body.bullet !== undefined ? bulletBodyRule(id, body) : subtitleRule(id, body));
    }
  }

  const pics = placeholdersByRole(layout, 'pic');
  if (pics.length > 0) rules.push(picRules(id, pics));

  return rules.join('\n');
};

export const themeCss = (): string => {
  const { canvas, background } = WHITE;
  const base = [
    '/* @theme keynote-white */',
    rule(
      'section',
      [
        `  width: ${canvas.widthPx}px;`,
        `  height: ${canvas.heightPx}px;`,
        `  background: ${background};`,
        `  font-family: ${FONT_STACK};`,
        '  position: relative;',
        '  padding: 0;',
        '  overflow: hidden;',
      ].join('\n'),
    ),
    rule('section h1, section h2, section p, section ul, section blockquote', '  margin: 0;'),
    rule('section p:has(> img)', '  display: contents;'),
    rule('section img', '  position: absolute;'),
    rule('section a', '  color: #0000EE;\n  text-decoration: underline;'),
    rule(
      'section footer',
      [
        '  position: absolute;',
        '  left: 177px;',
        '  bottom: 28px;',
        '  right: 177px;',
        '  font-size: 24pt;',
        `  font-family: ${FONT_STACK};`,
        '  font-weight: 300;',
        '  color: #666666;',
        '  text-align: left;',
      ].join('\n'),
    ),
  ];
  const layouts = LAYOUT_IDS.map((id) => layoutRules(id, layoutOf(id)));
  return [...base, ...layouts, compareRules()].join('\n');
};

/** Virtual side-by-side comparison layout on title-bullets geometry. */
const compareRules = (): string => {
  const layout = layoutOf('compare');
  const title = layout.placeholders.find((p) => p.role === 'title');
  const body = layout.placeholders.find((p) => p.role === 'body');
  if (!title || !body) throw new Error('compare needs title-bullets placeholders');
  const indentPx = body.indentPt !== undefined ? Math.round((body.indentPt * 4) / 3) : INDENT_STEP_PX;
  return [
    titleRule('compare', title),
    rule('section.compare .cols', `${box(body)}\n  display: flex;\n  gap: ${indentPx * 2}px;`),
    rule('section.compare .col ', '  flex: 1;\n  min-width: 0;'),
    rule(
      'section.compare .col h3',
      `  font-size: ${body.sizePt}pt;\n  font-family: ${FONT_STACK};\n  font-weight: 500;\n  margin: 0;`,
    ),
    rule('section.compare .col ul', `  list-style: none;\n  padding: 0;\n  margin: 0;\n  font-size: ${body.sizePt}pt;`),
    rule(
      'section.compare .col li',
      `  padding-left: ${indentPx}px;\n  text-indent: -${indentPx}px;\n  overflow-wrap: anywhere;`,
    ),
    rule('section.compare .col li, section.compare .col h3 + ul li:first-child', `  margin-top: ${body.spaceBeforePt ?? 0}pt;`),
    rule(
      'section.compare .col li::before',
      `  content: "${body.bullet ?? '•'}";\n  margin-right: 0.45em;\n  font-size: ${body.bulletSizePct ?? 100}%;\n  line-height: 0;`,
    ),
  ].join('\n');
};
