import { execFile } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { extname, join, resolve } from 'node:path';
import { promisify } from 'node:util';
import type { Deck, DeckSlide } from '../parse/deck.js';
import { inlineToPlain } from '../parse/inline.js';
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
  'compare': ['Title & Bullets'],
};

const str = (value: string): string =>
  `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\t/g, '\\t')}"`;

const list = (values: readonly string[]): string => `{${values.map((v) => str(v)).join(', ')}}`;

const bodyText = (slide: DeckSlide): string | undefined => {
  if (slide.columns !== undefined && slide.columns.length > 0) {
    return slide.columns
      .map((col) => [col.header, ...col.bullets.map((b) => `\t${b.text}`)].join('\n'))
      .join('\n');
  }
  if (slide.quote !== undefined) {
    return slide.attribution !== undefined ? `${slide.quote}\n—${slide.attribution}` : slide.quote;
  }
  if (slide.bullets.length > 0) return slide.bullets.map((b) => '\t'.repeat(b.level) + b.text).join('\n');
  return slide.subtitle;
};

interface PlacedImage {
  readonly path: string;
  readonly xPt: number;
  readonly yPt: number;
  readonly wPt: number;
}

const imageDimensions = async (path: string): Promise<{ w: number; h: number }> => {
  const { stdout } = await execFileAsync('sips', ['-g', 'pixelWidth', '-g', 'pixelHeight', path]);
  const w = /pixelWidth: (\d+)/.exec(stdout)?.[1];
  const h = /pixelHeight: (\d+)/.exec(stdout)?.[1];
  if (!w || !h) throw new Error(`Cannot read image dimensions of ${path}`);
  return { w: Number(w), h: Number(h) };
};

/** Center-crop a copy of the image to the placeholder aspect so it fills the box like a
    Keynote media placeholder (AppleScript cannot crop, so we crop the file itself). */
const cropToAspect = async (src: string, aspect: number, workDir: string, index: number): Promise<string> => {
  const { w, h } = await imageDimensions(src);
  const cropW = w / h > aspect ? Math.round(h * aspect) : w;
  const cropH = w / h > aspect ? h : Math.round(w / aspect);
  const out = join(workDir, `img-${index}${extname(src)}`);
  await execFileAsync('sips', ['-c', String(cropH), String(cropW), src, '--out', out]);
  return out;
};

const placeImages = async (slide: DeckSlide, workDir: string, offset: number): Promise<PlacedImage[]> => {
  const pics = placeholdersByRole(layoutOf(slide.layout), 'pic');
  const placed: PlacedImage[] = [];
  for (const [index, image] of slide.images.entries()) {
    const ph = pics[index] ?? pics[0];
    if (!ph) continue;
    const pt = (emu: number): number => Math.round(emu / EMU_PER_PT);
    const path = await cropToAspect(resolve(image), ph.wEmu / ph.hEmu, workDir, offset + index);
    placed.push({ path, xPt: pt(ph.xEmu), yPt: pt(ph.yEmu), wPt: pt(ph.wEmu) });
  }
  return placed;
};

const imageStatements = (images: readonly PlacedImage[]): string[] =>
  images.flatMap((image) => [
    `set imgFile to POSIX file ${str(image.path)} as alias`,
    'tell s',
    '  set img to make new image with properties {file:imgFile}',
    'end tell',
    `set position of img to {${image.xPt}, ${image.yPt}}`,
    `set width of img to ${image.wPt}`,
  ]);

const slideStatements = (slide: DeckSlide, images: readonly PlacedImage[]): string[] => {
  const body = bodyText(slide);
  return [
    `set m to my pickMaster(d, ${list(MASTER_CANDIDATES[slide.layout] ?? ['Blank'])})`,
    'set s to make new slide at d with properties {base slide:m}',
    ...(slide.title !== undefined ? [`set object text of default title item of s to ${str(slide.title)}`] : []),
    ...(body !== undefined ? [`set object text of default body item of s to ${str(body)}`] : []),
    ...imageStatements(images),
    ...(slide.source !== undefined
      ? [
          'tell s',
          `  set srcItem to make new text item with properties {object text:${str(inlineToPlain(slide.source))}}`,
          'end tell',
          'set position of srcItem to {133, 1020}',
          'set size of object text of srcItem to 24',
        ]
      : []),
  ];
};

const buildScript = (deck: Deck, imagesPerSlide: readonly PlacedImage[][], outPath: string): string =>
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
    ...deck.slides.flatMap((slide, i) =>
      slideStatements(slide, imagesPerSlide[i] ?? []).map((line) => `  ${line}`),
    ),
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
  const workDir = await mkdtemp(join(tmpdir(), 'whitedeck-key-img-'));
  try {
    const imagesPerSlide: PlacedImage[][] = [];
    let offset = 0;
    for (const slide of deck.slides) {
      const placed = await placeImages(slide, workDir, offset);
      imagesPerSlide.push(placed);
      offset += placed.length;
    }
    await runAppleScript(buildScript(deck, imagesPerSlide, outPath));
  } finally {
    await rm(workDir, { recursive: true, force: true });
    if (!wasRunning) await quitKeynoteIfIdle();
  }
};
