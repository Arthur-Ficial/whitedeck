import { describe, expect, it } from 'vitest';
import whiteTheme from '../theme/white.json' with { type: 'json' };
import { themeCss } from './css.js';

const css = themeCss();

describe('themeCss', () => {
  it('declares a Marp theme on the exact Keynote canvas', () => {
    expect(css).toContain('/* @theme keynote-white */');
    expect(css).toMatch(/section\s*{[^}]*width:\s*2560px/);
    expect(css).toMatch(/section\s*{[^}]*height:\s*1440px/);
    expect(css).toMatch(/section\s*{[^}]*background:\s*#FFFFFF/);
  });

  it('has a rule for every layout', () => {
    for (const id of Object.keys(whiteTheme.layouts)) {
      expect(css).toContain(`section.${id}`);
    }
  });

  it('positions the title-bullets placeholders at Keynote-exact pixels and sizes', () => {
    const layout = whiteTheme.layouts['title-bullets'];
    const title = layout.placeholders.find((p) => p.role === 'title');
    const body = layout.placeholders.find((p) => p.role === 'body');
    if (!title || !body) throw new Error('white.json lost its title-bullets placeholders');

    const h1 = /section\.title-bullets h1\s*{[^}]*}/.exec(css)?.[0] ?? '';
    expect(h1).toContain(`left: ${title.xPx}px`);
    expect(h1).toContain(`top: ${title.yPx}px`);
    expect(h1).toContain(`width: ${title.wPx}px`);
    expect(h1).toContain(`font-size: ${title.sizePt}pt`);
    expect(h1).toContain('font-weight: 500');
    expect(h1).toContain('text-align: center');
    expect(h1).toContain('"Helvetica Neue"');

    const ul = /section\.title-bullets ul\s*{[^}]*}/.exec(css)?.[0] ?? '';
    expect(ul).toContain(`left: ${body.xPx}px`);
    expect(ul).toContain(`top: ${body.yPx}px`);
    expect(ul).toContain(`font-size: ${body.sizePt}pt`);
    expect(ul).toContain('text-align: left');
  });

  it('anchors text vertically like Keynote (centered bullets, bottom-anchored photo titles)', () => {
    const ul = /section\.title-bullets p:not\(:has\(> img\)\), section\.title-bullets ul\s*{[^}]*}/.exec(css)?.[0] ?? '';
    expect(ul).toContain('justify-content: center');
    const photoTitle = /section\.photo-horizontal h1\s*{[^}]*}/.exec(css)?.[0] ?? '';
    expect(photoTitle).toContain('justify-content: flex-end');
  });

  it('lays out compare columns side by side in the title-bullets body box', () => {
    const body = whiteTheme.layouts['title-bullets'].placeholders.find((p) => p.role === 'body');
    if (!body) throw new Error('missing body');
    const cols = /section\.compare \.cols\s*{[^}]*}/.exec(css)?.[0] ?? '';
    expect(cols).toContain(`left: ${body.xPx}px`);
    expect(cols).toContain(`top: ${body.yPx}px`);
    expect(cols).toContain('display: flex');
    expect(css).toContain('section.compare .col ');
  });

  it('styles links blue and underlined and pins source footers to the bottom', () => {
    expect(css).toMatch(/section a\s*{[^}]*color:\s*#0000EE/);
    expect(css).toMatch(/section a\s*{[^}]*text-decoration:\s*underline/);
    expect(css).toMatch(/section footer\s*{[^}]*position:\s*absolute/);
    expect(css).toMatch(/section footer\s*{[^}]*font-size:\s*24pt/);
  });

  it('resets user-agent list padding so bullets sit at the Keynote box edge', () => {
    expect(css).toMatch(/section\.title-bullets ul\s*{[^}]*padding:\s*0/);
  });

  it('applies Keynote paragraph spacing and bullet scale to bullet layouts', () => {
    expect(css).toMatch(/section\.title-bullets li \+ li\s*{[^}]*margin-top:\s*59pt/);
    expect(css).toMatch(/section\.title-bullets li::before\s*{[^}]*font-size:\s*125%/);
    expect(css).toMatch(/section\.title-bullets-photo li \+ li\s*{[^}]*margin-top:\s*45pt/);
  });

  it('lifts image paragraphs out of text flow so images position against the slide', () => {
    expect(css).toMatch(/section p:has\(> img\)\s*{[^}]*display:\s*contents/);
  });

  it('styles quote and attribution with their two distinct body sizes', () => {
    expect(css).toMatch(/section\.quote blockquote\s*{[^}]*font-size:\s*48pt/);
    expect(css).toMatch(/section\.quote > p\s*{[^}]*font-size:\s*32pt/);
  });

  it('positions all three photo-3-up pictures separately', () => {
    expect(css).toContain('section.photo-3-up img:nth-of-type(1)');
    expect(css).toContain('section.photo-3-up img:nth-of-type(2)');
    expect(css).toContain('section.photo-3-up img:nth-of-type(3)');
  });
});
