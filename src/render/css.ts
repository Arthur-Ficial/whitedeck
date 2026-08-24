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

const titleRule = (id: string, ph: ThemePlaceholder): string =>
  rule(
    `section.${id} h1`,
    `${box(ph)}\n${text(ph)}\n  display: flex;\n  flex-direction: column;\n  justify-content: center;`,
  );

const bulletBodyRule = (id: string, ph: ThemePlaceholder): string =>
  [
    rule(`section.${id} p, section.${id} ul`, `${box(ph)}\n${text(ph)}`),
    rule(`section.${id} ul`, '  list-style: none;'),
    rule(`section.${id} li`, `  padding-left: ${INDENT_STEP_PX}px;\n  text-indent: -${INDENT_STEP_PX}px;`),
    rule(`section.${id} li::before`, `  content: "${ph.bullet ?? '•'}";\n  margin-right: 0.45em;`),
    rule(`section.${id} ul ul`, `  position: static;\n  width: auto;\n  height: auto;\n  margin-left: ${INDENT_STEP_PX}px;`),
  ].join('\n');

const subtitleRule = (id: string, ph: ThemePlaceholder): string =>
  rule(`section.${id} h2, section.${id} p`, `${box(ph)}\n${text(ph)}`);

const quoteRules = (id: string, quotePh: ThemePlaceholder, attributionPh: ThemePlaceholder): string =>
  [
    rule(`section.${id} blockquote`, `${box(quotePh)}\n${text(quotePh)}\n  margin: 0;`),
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
    rule('section img', '  position: absolute;'),
  ];
  const layouts = LAYOUT_IDS.map((id) => layoutRules(id, layoutOf(id)));
  return [...base, ...layouts].join('\n');
};
