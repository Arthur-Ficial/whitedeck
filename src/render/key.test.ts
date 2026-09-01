import { existsSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseDeck } from '../parse/deck.js';
import { bodyText, renderKey, runAppleScript } from './key.js';

const onMacWithKeynote = process.platform === 'darwin' && existsSync('/Applications/Keynote.app');

const DEMO_MD = [
  '<!-- _class: title -->',
  '# Native Deck',
  '## Built by whitedeck',
  '',
  '---',
  '',
  '<!-- _class: title-bullets -->',
  '# Agenda',
  '- First',
  '- Second',
  '',
  '---',
  '',
  '<!-- _class: quote -->',
  '> "Real artists ship."',
  '> -- Steve Jobs',
  '',
  '---',
  '',
  '<!-- _class: photo-horizontal -->',
  '# The ocean',
  '![](examples/ocean.png)',
].join('\n');

const QUERY_SCRIPT = `
on run argv
  tell application "Keynote"
    set d to open (POSIX file (item 1 of argv))
    set n to count of slides of d
    set w to width of d
    set h to height of d
    set ms to {}
    repeat with s in slides of d
      set end of ms to name of base slide of s
    end repeat
    set t to object text of default title item of slide 1 of d
    close d saving no
    if (count of documents) is 0 then quit
  end tell
  set AppleScript's text item delimiters to "|"
  return (n as text) & "§" & (w as text) & "x" & (h as text) & "§" & (ms as text) & "§" & t
end run
`;

describe.skipIf(!onMacWithKeynote)('renderKey (real Keynote.app)', () => {
  it('builds a 16:9 native .key on White theme masters with the requested layouts', async () => {
    const outDir = mkdtempSync(join(tmpdir(), 'whitedeck-key-'));
    const outPath = join(outDir, 'demo.key');

    await renderKey(parseDeck(DEMO_MD), outPath);
    expect(existsSync(outPath)).toBe(true);

    const raw = await runAppleScript(QUERY_SCRIPT, [outPath]);
    const [count, size, masters, firstTitle] = raw.split('§');

    expect(count).toBe('4');
    expect(size).toBe('1920x1080');
    expect(firstTitle).toBe('Native Deck');
    const masterNames = (masters ?? '').split('|');
    expect(masterNames[1]).toBe('Title & Bullets');
    expect(masterNames[2]).toBe('Quote');
    // A slide carrying an image is built on a TEXT master on purpose: the
    // "Photo - Horizontal" master paints the theme's own stock photograph,
    // which stayed visible behind a letterboxed chart, and its picture
    // placeholder overlaps the title box (pic y -31..921 vs title y 749..907).
    // whitedeck positions the picture itself instead. See geometry.test.ts.
    expect(masterNames[3]).toBe('Title & Bullets');
  });
});


/**
 * Keynote renders no inline markdown, so every string handed to AppleScript
 * must already be flat. Regression: bullets and compare columns reached the
 * slide as literal "[label](https://...)".
 */
describe('bodyText', () => {
  const slide = (over: Record<string, unknown>) =>
    ({ layout: 'title-bullets', bullets: [], images: [], ...over }) as never;

  it('flattens markdown links in bullets', () => {
    const text = bodyText(
      slide({ bullets: [{ level: 0, text: '[example](https://www.example.com/)' }] }),
    );
    expect(text).not.toContain('](');
    expect(text).toContain('example');
  });

  it('flattens markdown links in compare columns', () => {
    const text = bodyText(
      slide({
        columns: [
          { header: '**IS**', bullets: [{ level: 0, text: '[x](https://example.com/)' }] },
        ],
      }),
    );
    expect(text).not.toContain('](');
    expect(text).not.toContain('**');
  });

  it('flattens a quote and its attribution', () => {
    const text = bodyText(slide({ quote: '**bold** quote', attribution: '[F](https://f.at/)' }));
    expect(text).not.toContain('](');
    expect(text).not.toContain('**');
  });
});
