import { describe, expect, it } from 'vitest';
import { parseDeck } from '../parse/deck.js';
import { toMarpMarkdown } from './marp-md.js';

describe('toMarpMarkdown', () => {
  it('emits short titles as plain markdown headings at full size', () => {
    const md = toMarpMarkdown(parseDeck('<!-- _class: title-bullets -->\n# Short title\n- a'));
    expect(md).toContain('# Short title');
    expect(md).not.toContain('<h1');
  });

  it('shrinks titles that would overflow the Keynote title box, like Keynote does', () => {
    const long = 'This headline is far too long to fit the Keynote title box at full size';
    const md = toMarpMarkdown(parseDeck(`<!-- _class: title-bullets -->\n# ${long}\n- a`));
    const h1 = /<h1 style="font-size: (\d+)pt">/.exec(md);
    expect(h1).not.toBeNull();
    expect(Number(h1?.[1])).toBeLessThan(112);
    expect(Number(h1?.[1])).toBeGreaterThanOrEqual(40);
  });

  it('keeps bullets as a markdown list after a shrunk HTML title (blank line ends the HTML block)', () => {
    const long = 'This headline is far too long to fit the Keynote title box at full size';
    const md = toMarpMarkdown(parseDeck(`<!-- _class: title-bullets -->\n# ${long}\n- first bullet\n- second bullet`));
    expect(md).toMatch(/<\/h1>\n\n- first bullet/);
  });
});
