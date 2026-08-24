import { existsSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseDeck } from '../parse/deck.js';
import { renderKey, runAppleScript } from './key.js';

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

    expect(count).toBe('3');
    expect(size).toBe('1920x1080');
    expect(firstTitle).toBe('Native Deck');
    const masterNames = (masters ?? '').split('|');
    expect(masterNames[1]).toBe('Title & Bullets');
    expect(masterNames[2]).toBe('Quote');
  });
});
