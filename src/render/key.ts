import { execFile } from 'node:child_process';
import { resolve } from 'node:path';
import { promisify } from 'node:util';
import type { Deck, DeckSlide } from '../parse/deck.js';
import { layoutOf, placeholdersByRole } from '../theme/white.js';

const execFileAsync = promisify(execFile);

const EMU_PER_PT = 12700;

/** Candidate Keynote master-slide names per whitedeck layout id (naming varies by Keynote version/locale). */
const MASTER_CANDIDATES: Readonly<Record<string, readonly string[]>> = {
  'title': ['Title', 'Title & Subtitle'],
  'title-center': ['Title - Centre', 'Title - Center'],
  'title-top': ['Title - Top'],
  'title-bullets': ['Title & Bullets'],
  'bullets': ['Bullets'],
  'title-bullets-photo': ['Title, Bullets & Photo'],
  'photo': ['Photo'],
  'photo-horizontal': ['Photo - Horizontal'],
  'photo-vertical': ['Photo - Vertical'],
  'photo-3-up': ['Photo - 3 Up'],
  'quote': ['Quote'],
  'blank': ['Blank'],
};

const str = (value: string): string =>
  `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n')}"`;

const list = (values: readonly string[]): string => `{${values.map((v) => str(v)).join(', ')}}`;

const bodyText = (slide: DeckSlide): string | undefined => {
  if (slide.quote !== undefined) {
    return slide.attribution !== undefined ? `${slide.quote}\n—${slide.attribution}` : slide.quote;
  }
  if (slide.bullets.length > 0) return slide.bullets.map((b) => b.text).join('\n');
  return slide.subtitle;
};

const imageStatements = (slide: DeckSlide): string[] => {
  const pics = placeholdersByRole(layoutOf(slide.layout), 'pic');
  return slide.images.flatMap((image, index) => {
    const ph = pics[index] ?? pics[0];
    if (!ph) return [];
    const pt = (emu: number): number => Math.round(emu / EMU_PER_PT);
    return [
      `set img to make new image at s with properties {file:POSIX file ${str(resolve(image))}}`,
      `set position of img to {${pt(ph.xEmu)}, ${pt(ph.yEmu)}}`,
      `set width of img to ${pt(ph.wEmu)}`,
    ];
  });
};

const slideStatements = (slide: DeckSlide): string[] => {
  const body = bodyText(slide);
  return [
    `set m to my pickMaster(d, ${list(MASTER_CANDIDATES[slide.layout] ?? ['Blank'])})`,
    'set s to make new slide at d with properties {base slide:m}',
    ...(slide.title !== undefined ? [`set object text of default title item of s to ${str(slide.title)}`] : []),
    ...(body !== undefined ? [`set object text of default body item of s to ${str(body)}`] : []),
    ...imageStatements(slide),
  ];
};

const buildScript = (deck: Deck, outPath: string): string =>
  [
    'on pickMaster(d, candidateNames)',
    '  tell application "Keynote"',
    '    set masterNames to name of every master slide of d',
    '    repeat with c in candidateNames',
    '      if masterNames contains (c as text) then return master slide (c as text) of d',
    '    end repeat',
    '    return master slide "Blank" of d',
    '  end tell',
    'end pickMaster',
    '',
    'tell application "Keynote"',
    '  set d to make new document with properties {document theme:theme "White", width:1920, height:1080}',
    ...deck.slides.flatMap((slide) => slideStatements(slide).map((line) => `  ${line}`)),
    '  delete slide 1 of d',
    `  save d in POSIX file ${str(resolve(outPath))}`,
    '  close d saving no',
    'end tell',
  ].join('\n');

export const runAppleScript = async (script: string, args: readonly string[] = []): Promise<string> => {
  const { stdout } = await execFileAsync('osascript', ['-e', script, ...args]);
  return stdout.trim();
};

const keynoteIsRunning = async (): Promise<boolean> => {
  try {
    await execFileAsync('pgrep', ['-x', 'Keynote']);
    return true;
  } catch {
    return false;
  }
};

/** Quit Keynote again if whitedeck launched it and no documents are left open. */
const quitKeynoteIfIdle = async (): Promise<void> => {
  await runAppleScript('tell application "Keynote"\n  if (count of documents) is 0 then quit\nend tell');
};

export const renderKey = async (deck: Deck, outPath: string): Promise<void> => {
  if (process.platform !== 'darwin') {
    throw new Error('Native .key output requires macOS with Keynote.app installed');
  }
  const wasRunning = await keynoteIsRunning();
  try {
    await runAppleScript(buildScript(deck, outPath));
  } finally {
    if (!wasRunning) await quitKeynoteIfIdle();
  }
};
