import { execFile } from 'node:child_process';
import { resolve } from 'node:path';
import { promisify } from 'node:util';
import type { Deck, DeckSlide } from '../parse/deck.js';
import { inlineToPlain } from '../parse/inline.js';
import { layoutOf } from '../theme/white.js';
import { bodyFrame, EMU_PER_PT, fitted, imageBandFrame, sourceFrame } from './geometry.js';

const execFileAsync = promisify(execFile);

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

/**
 * Layouts whose Keynote master carries a photo placeholder. That placeholder
 * paints the theme's own stock photo, which stays visible behind a
 * letterboxed chart - so image slides are built on a text master instead and
 * whitedeck positions the picture itself.
 */
const TEXT_MASTER_FOR_IMAGES: Readonly<Record<string, string>> = {
  'photo': 'title-bullets',
  'photo-horizontal': 'title-bullets',
  'photo-vertical': 'title-bullets',
  'photo-3-up': 'title-bullets',
  'title-bullets-photo': 'title-bullets',
};

/** The layout whose geometry AND master the .key renderer actually uses. */
const keyLayoutId = (slide: DeckSlide): string =>
  slide.images.length > 0 ? (TEXT_MASTER_FOR_IMAGES[slide.layout] ?? slide.layout) : slide.layout;

const str = (value: string): string =>
  `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\t/g, '\\t')}"`;

const list = (values: readonly string[]): string => `{${values.map((v) => str(v)).join(', ')}}`;

/**
 * Keynote has no inline markdown. Every string that reaches AppleScript must
 * be flattened first, otherwise a link renders as literal
 * "[label](https://...)" on the slide.
 */
export const bodyText = (slide: DeckSlide): string | undefined => {
  const plain = (text: string): string => inlineToPlain(text);
  if (slide.columns !== undefined && slide.columns.length > 0) {
    return slide.columns
      .map((col) => [plain(col.header), ...col.bullets.map((b) => `\t${plain(b.text)}`)].join('\n'))
      .join('\n');
  }
  if (slide.quote !== undefined) {
    const quote = plain(slide.quote);
    return slide.attribution !== undefined ? `${quote}\n—${plain(slide.attribution)}` : quote;
  }
  if (slide.bullets.length > 0) {
    return slide.bullets.map((b) => '\t'.repeat(b.level) + plain(b.text)).join('\n');
  }
  return slide.subtitle === undefined ? undefined : plain(slide.subtitle);
};

interface PlacedImage {
  readonly path: string;
  readonly xPt: number;
  readonly yPt: number;
  readonly wPt: number;
  readonly hPt: number;
}

/**
 * Place each image with the SAME geometry the pptx and CSS renderers use:
 * clamp the Keynote photo frame to the canvas, stop it above the text below
 * it, then letterbox-fit the picture inside. Never crop - a cropped chart
 * loses data - and never overlap the title.
 */
const placeImages = (slide: DeckSlide): PlacedImage[] => {
  const layout = layoutOf(keyLayoutId(slide));
  const pt = (emu: number): number => Math.round(emu / EMU_PER_PT);
  const frame = imageBandFrame(layout, slide.source !== undefined);
  return slide.images.map((image) => {
    const rect = fitted(resolve(image), frame);
    return {
      path: resolve(image),
      xPt: pt(rect.x),
      yPt: pt(rect.y),
      wPt: pt(rect.w),
      hPt: pt(rect.h),
    };
  });
};

const imageStatements = (images: readonly PlacedImage[]): string[] =>
  images.flatMap((image) => [
    `set imgFile to POSIX file ${str(image.path)} as alias`,
    'tell s',
    '  set img to make new image with properties {file:imgFile}',
    'end tell',
    `set width of img to ${image.wPt}`,
    `set height of img to ${image.hPt}`,
    `set position of img to {${image.xPt}, ${image.yPt}}`,
  ]);

const slideStatements = (slide: DeckSlide, images: readonly PlacedImage[]): string[] => {
  const body = bodyText(slide);
  const layoutId = keyLayoutId(slide);
  const layout = layoutOf(layoutId);
  const pt = (emu: number): number => Math.round(emu / EMU_PER_PT);
  const src = sourceFrame(layout, body !== undefined);
  return [
    `set m to my pickMaster(d, ${list(MASTER_CANDIDATES[layoutId] ?? ['Blank'])})`,
    'set s to make new slide at d with properties {base slide:m}',
    // Some White masters (Quote) carry plain TEXT ITEMS holding the theme's
    // dummy copy - "Type a quote here.", "-Johnny Appleseed". They are not
    // title/body placeholders, so `title showing`/`body showing` cannot hide
    // them and they survive onto the finished slide. Remove them before we
    // add our own content.
    'my clearMasterText(s)',
    ...(slide.title !== undefined
      ? [
          'set title showing of s to true',
          `set object text of default title item of s to ${str(inlineToPlain(slide.title))}`,
        ]
      : ['set title showing of s to false']),
    ...(body !== undefined
      ? [
          'set body showing of s to true',
          `set object text of default body item of s to ${str(body)}`,
          // fit the body above the source line - lift it when the Keynote
          // placeholder starts inside the bottom band
          `set width of default body item of s to ${pt(bodyFrame(layout, slide.source !== undefined).w)}`,
          `set height of default body item of s to ${pt(bodyFrame(layout, slide.source !== undefined).h)}`,
          `set position of default body item of s to {${pt(bodyFrame(layout, slide.source !== undefined).x)}, ${pt(bodyFrame(layout, slide.source !== undefined).y)}}`,
        ]
      : ['set body showing of s to false']),
    ...imageStatements(images),
    ...(slide.source !== undefined
      ? [
          'tell s',
          `  set srcItem to make new text item with properties {object text:${str(inlineToPlain(slide.source))}}`,
          'end tell',
          `set width of srcItem to ${pt(src.w)}`,
          `set height of srcItem to ${pt(src.h)}`,
          `set position of srcItem to {${pt(src.x)}, ${pt(src.y)}}`,
          'set size of object text of srcItem to 18',
        ]
      : []),
  ];
};

const buildScript = (deck: Deck, imagesPerSlide: readonly PlacedImage[][], outPath: string): string =>
  [
    'on clearMasterText(s)',
    '  tell application "Keynote"',
    '    try',
    '      repeat with k from (count of text items of s) to 1 by -1',
    '        delete text item k of s',
    '      end repeat',
    '    end try',
    '  end tell',
    'end clearMasterText',
    '',
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
  try {
    const imagesPerSlide: PlacedImage[][] = deck.slides.map((slide) => placeImages(slide));
    await runAppleScript(buildScript(deck, imagesPerSlide, outPath));
  } finally {
    if (!wasRunning) await quitKeynoteIfIdle();
  }
};
